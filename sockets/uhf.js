const jwt = require('jsonwebtoken');
const Inventory = require('../models/inventory.model');
const ItemMovement = require('../models/itemMovement.model');
const Notification = require('../models/notification.model');
const User = require('../models/user.model');

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
        const { tagId, direction, warehouseId, zoneId, timestamp } = data;

        // Find inventory item by tag ID
        const item = await Inventory.findOne({ 
          tagId, 
          companyId: socket.user.companyId 
        });

        if (!item) {
          socket.emit('error', { message: 'Tag not registered in inventory' });
          return;
        }

        // Process movement based on direction (in/out)
        const movementType = direction === 'in' ? 'In' : 'Out';
        
        // Update inventory quantity
        if (movementType === 'In') {
          item.quantity += 1;
        } else if (movementType === 'Out') {
          item.quantity = Math.max(0, item.quantity - 1);
        }

        // Save inventory update
        await item.save();

        // Create movement record
        const movement = await ItemMovement.create({
          itemId: item._id,
          quantity: 1,
          type: movementType,
          reason: `UHF ${movementType} scan`,
          source: movementType === 'Out' ? {
            warehouseId,
            zoneId
          } : null,
          destination: movementType === 'In' ? {
            warehouseId,
            zoneId
          } : null,
          companyId: socket.user.companyId,
          movedBy: socket.user.id,
          timestamp: timestamp || Date.now()
        });

        // Check if item is now low stock or out of stock
        if (item.status === 'Low Stock' || item.status === 'Out of Stock') {
          // Create notification
          const notification = await Notification.create({
            title: `${item.status} Alert`,
            message: `Item ${item.name} (SKU: ${item.sku}) is now ${item.status.toLowerCase()}.`,
            type: 'Stock',
            priority: item.status === 'Out of Stock' ? 'High' : 'Medium',
            relatedTo: {
              model: 'Inventory',
              id: item._id
            },
            recipients: [], // Will be populated with admins and managers
            companyId: socket.user.companyId
          });

          // Find admins and managers to notify
          const recipients = await User.find({
            companyId: socket.user.companyId,
            role: { $in: ['Admin', 'Manager'] }
          }).select('_id');

          // Add recipients to notification
          notification.recipients = recipients.map(user => ({
            userId: user._id,
            read: false
          }));
          await notification.save();

          // Emit notification to company room
          uhfNamespace.to(companyRoom).emit('stock-alert', {
            itemId: item._id,
            name: item.name,
            sku: item.sku,
            status: item.status,
            quantity: item.quantity,
            threshold: item.threshold
          });
        }

        // Emit movement event to company room
        uhfNamespace.to(companyRoom).emit('item-movement', {
          itemId: item._id,
          name: item.name,
          sku: item.sku,
          movementType,
          quantity: 1,
          currentStock: item.quantity,
          timestamp: movement.timestamp
        });

        // Send acknowledgment to the client
        socket.emit('tag-processed', {
          success: true,
          tagId,
          itemId: item._id,
          name: item.name,
          sku: item.sku,
          movementType,
          currentStock: item.quantity
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
