const jwt = require('jsonwebtoken');
const UHFReader = require('../models/uhfReader.model');
const Inventory = require('../models/inventory.model');
const ItemMovement = require('../models/itemMovement.model');
const AuditLog = require('../models/auditLog.model');
const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const firebaseNotification = require('../utils/firebaseNotification');

/**
 * UHF/RFID Socket.IO handler
 * Manages real-time communication with UHF/RFID readers
 * @param {Object} io - Socket.IO instance
 */
module.exports = function(io) {
  // Create a namespace for UHF/RFID events
  const uhfNamespace = io.of('/uhf');

  // Authentication middleware for socket connections
  uhfNamespace.use(async (socket, next) => {
    try {
      // Get token from handshake auth
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: Token not provided'));
      }

      // Verify token (similar to auth middleware)
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from the token
      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      // Store user and company info in socket
      socket.user = {
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email,
        companyId: decoded.companyId
      };
      
      next();
    } catch (error) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection event
  uhfNamespace.on('connection', (socket) => {
    console.log(`UHF client connected: ${socket.id}`);

    // Join company-specific room
    const companyRoom = `company-${socket.user.companyId}`;
    socket.join(companyRoom);

    // Handle UHF tag read event
    socket.on('tag-read', async (data) => {
      try {
        const { tagId, uhfId, timestamp } = data;
        
        // Find the UHF reader by uhfId
        const reader = await UHFReader.findOne({ 
          uhfId,
          companyId: socket.user.companyId,
          status: 'Active'
        });
        
        if (!reader) {
          socket.emit('error', { message: 'UHF reader not found or inactive' });
          return;
        }
        
        // Update reader's lastSeen timestamp
        reader.lastSeen = Date.now();
        await reader.save();
        
        // Find inventory item by tag ID
        const item = await Inventory.findOne({ 
          tagId, 
          companyId: socket.user.companyId 
        });

        if (!item) {
          socket.emit('error', { message: 'Tag not registered in inventory' });
          return;
        }
        
        // Store previous state for audit log
        const previousState = {
          status: item.inventoryStatus,
          location: JSON.parse(JSON.stringify(item.location)),
          quantity: item.quantity
        };
        
        // Update item status if it's sale_pending
        if (item.inventoryStatus === 'sale_pending') {
          item.inventoryStatus = 'purchased';
        }
        
        // Update item location based on the UHF reader's location
        const newLocation = {};
        
        // Always set warehouseId
        newLocation.warehouseId = reader.location.warehouseId;
        
        // Set other location fields based on reader's location type
        if (reader.location.type === 'Bin') {
          newLocation.zoneId = reader.location.zoneId;
          newLocation.shelfId = reader.location.shelfId;
          newLocation.binId = reader.location.binId;
        } 
        else if (reader.location.type === 'Shelf') {
          newLocation.zoneId = reader.location.zoneId;
          newLocation.shelfId = reader.location.shelfId;
          newLocation.binId = undefined;
        }
        else if (reader.location.type === 'Zone') {
          newLocation.zoneId = reader.location.zoneId;
          newLocation.shelfId = undefined;
          newLocation.binId = undefined;
        }
        else { // Warehouse level
          newLocation.zoneId = undefined;
          newLocation.shelfId = undefined;
          newLocation.binId = undefined;
        }
        
        // Update item location
        item.location = newLocation;
        
        // Decrease quantity by 1 (if applicable)
        if (item.quantity > 0) {
          item.quantity -= 1;
        }
        
        // Check if quantity is now below or equal to threshold
        const isLowStock = item.quantity <= item.threshold;
        
        // Save inventory update
        await item.save();
        
        // Create movement record
        const movement = await ItemMovement.create({
          itemId: item._id,
          quantity: 1,
          type: 'Out', // Assuming UHF detection means item is being moved/sold
          reason: `UHF detection - ${reader.name}`,
          source: {
            warehouseId: reader.location.warehouseId,
            zoneId: reader.location.zoneId,
            shelfId: reader.location.shelfId,
            binId: reader.location.binId
          },
          companyId: socket.user.companyId,
          movedBy: socket.user.id,
          timestamp: timestamp || Date.now()
        });
        
        // Create audit log entry
        await AuditLog.create({
          userId: socket.user.id,
          userName: socket.user.name,
          userRole: socket.user.role,
          action: 'Update',
          module: 'Inventory',
          description: `Inventory item ${item.name} (${item.sku}) detected by UHF reader ${reader.name}`,
          details: {
            itemId: item._id,
            tagId: item.tagId,
            uhfId: reader.uhfId,
            previous: previousState,
            current: {
              status: item.inventoryStatus,
              location: item.location,
              quantity: item.quantity
            }
          },
          companyId: socket.user.companyId
        });
        
        // Handle low stock alert logic
        if (isLowStock && !item.lowStockAlertSent) {
          // Mark the item with a flag indicating an alert was sent
          item.lowStockAlertSent = true;
          await item.save();
          
          // Create notification
          const notification = await Notification.create({
            title: `Low Stock Alert`,
            message: `Item ${item.name} (SKU: ${item.sku}) is now below threshold. Current quantity: ${item.quantity}, Threshold: ${item.threshold}`,
            type: 'Stock',
            priority: item.quantity === 0 ? 'High' : 'Medium',
            relatedTo: {
              model: 'Inventory',
              id: item._id
            },
            recipients: [], // Will be populated with admins and inventory managers
            companyId: socket.user.companyId
          });

          // Find admins and inventory managers to notify
          const recipients = await User.find({
            companyId: socket.user.companyId,
            role: { $in: ['Admin', 'InventoryManager'] }
          }).select('_id');

          // Add recipients to notification
          notification.recipients = recipients.map(user => ({
            userId: user._id,
            read: false
          }));
          await notification.save();

          // Emit low stock alert to company room
          uhfNamespace.to(companyRoom).emit('low-stock-alert', {
            itemId: item._id,
            name: item.name,
            sku: item.sku,
            tagId: item.tagId,
            quantity: item.quantity,
            threshold: item.threshold,
            location: {
              warehouseName: reader.location.warehouseId ? reader.location.warehouseId.name : 'Unknown',
              zoneName: reader.location.zoneId ? reader.location.zoneId.name : 'Unknown',
              shelfName: reader.location.shelfId ? reader.location.shelfId.name : 'Unknown',
              binName: reader.location.binId ? reader.location.binId.name : 'Unknown'
            },
            timestamp: Date.now()
          });
        }
        // Reset the alert flag if quantity goes above threshold
        else if (!isLowStock && item.lowStockAlertSent) {
          item.lowStockAlertSent = false;
          await item.save();
        }

        // Emit movement event to company room
        uhfNamespace.to(companyRoom).emit('item-movement', {
          itemId: item._id,
          name: item.name,
          sku: item.sku,
          tagId: item.tagId,
          status: item.inventoryStatus,
          quantity: item.quantity,
          location: {
            warehouseId: item.location.warehouseId,
            zoneId: item.location.zoneId,
            shelfId: item.location.shelfId,
            binId: item.location.binId
          },
          timestamp: movement.timestamp
        });

        // Send acknowledgment to the client
        socket.emit('tag-processed', {
          success: true,
          tagId,
          uhfId,
          itemId: item._id,
          name: item.name,
          sku: item.sku,
          status: item.inventoryStatus,
          quantity: item.quantity
        });

      } catch (error) {
        console.error('UHF tag processing error:', error);
        socket.emit('error', { message: 'Error processing tag', error: error.message });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`UHF client disconnected: ${socket.id}`);
    });
  });

  return uhfNamespace;
};
