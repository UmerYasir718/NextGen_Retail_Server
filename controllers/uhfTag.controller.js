const UHFReader = require('../models/uhfReader.model');
const Inventory = require('../models/inventory.model');
const ItemMovement = require('../models/itemMovement.model');
const AuditLog = require('../models/auditLog.model');
const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../utils/errorResponse');
const firebaseNotification = require('../utils/firebaseNotification');

/**
 * @desc    Process UHF tag detection
 * @route   POST /api/v1/uhf-tags/detect
 * @access  Private
 */
exports.detectTag = asyncHandler(async (req, res, next) => {
  const { tagId, uhfId } = req.body;
  const { companyId, _id: userId, name: userName, role: userRole } = req.user;
  
  // Validate required fields
  if (!tagId || !uhfId) {
    return next(new ErrorResponse('Tag ID and UHF ID are required', 400));
  }
  
  // Find the UHF reader
  const reader = await UHFReader.findOne({ 
    uhfId,
    companyId,
    status: 'Active'
  }).populate([
    { path: 'location.warehouseId', select: 'name' },
    { path: 'location.zoneId', select: 'name' },
    { path: 'location.shelfId', select: 'name' },
    { path: 'location.binId', select: 'name' }
  ]);
  
  if (!reader) {
    return next(new ErrorResponse(`UHF reader not found or inactive with ID ${uhfId}`, 404));
  }
  
  // Update reader's lastSeen timestamp
  reader.lastSeen = Date.now();
  await reader.save();
  
  // Find inventory item by tag ID
  const item = await Inventory.findOne({ 
    tagId, 
    companyId
  });

  if (!item) {
    return next(new ErrorResponse(`Tag ID ${tagId} not registered in inventory`, 404));
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
  newLocation.warehouseId = reader.location.warehouseId._id;
  
  // Set other location fields based on reader's location type
  if (reader.location.type === 'Bin') {
    newLocation.zoneId = reader.location.zoneId._id;
    newLocation.shelfId = reader.location.shelfId._id;
    newLocation.binId = reader.location.binId._id;
  } 
  else if (reader.location.type === 'Shelf') {
    newLocation.zoneId = reader.location.zoneId._id;
    newLocation.shelfId = reader.location.shelfId._id;
    newLocation.binId = undefined;
  }
  else if (reader.location.type === 'Zone') {
    newLocation.zoneId = reader.location.zoneId._id;
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
      warehouseId: reader.location.warehouseId._id,
      zoneId: reader.location.zoneId ? reader.location.zoneId._id : undefined,
      shelfId: reader.location.shelfId ? reader.location.shelfId._id : undefined,
      binId: reader.location.binId ? reader.location.binId._id : undefined
    },
    companyId,
    movedBy: userId,
    timestamp: Date.now()
  });
  
  // Create audit log entry
  await AuditLog.create({
    userId,
    userName,
    userRole,
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
    companyId
  });
  
  // Handle low stock alert logic
  let alertSent = false;
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
      companyId
    });

    // Find admins and inventory managers to notify
    const recipients = await User.find({
      companyId,
      role: { $in: ['Admin', 'InventoryManager'] }
    }).select('_id');

    // Add recipients to notification
    notification.recipients = recipients.map(user => ({
      userId: user._id,
      read: false
    }));
    await notification.save();
    
    // Send Firebase push notification to offline users
    try {
      await firebaseNotification.sendLowStockAlert(item, companyId);
      console.log(`Firebase notification sent for low stock alert: ${item.name} (${item.sku})`);
    } catch (error) {
      console.error('Error sending Firebase notification:', error);
    }
    
    alertSent = true;
  }
  // Reset the alert flag if quantity goes above threshold
  else if (!isLowStock && item.lowStockAlertSent) {
    item.lowStockAlertSent = false;
    await item.save();
  }
  
  // Return response
  res.status(200).json({
    success: true,
    data: {
      tagId,
      uhfId,
      itemId: item._id,
      name: item.name,
      sku: item.sku,
      status: item.inventoryStatus,
      quantity: item.quantity,
      threshold: item.threshold,
      location: {
        warehouseId: item.location.warehouseId,
        warehouseName: reader.location.warehouseId.name,
        zoneId: item.location.zoneId,
        zoneName: reader.location.zoneId ? reader.location.zoneId.name : null,
        shelfId: item.location.shelfId,
        shelfName: reader.location.shelfId ? reader.location.shelfId.name : null,
        binId: item.location.binId,
        binName: reader.location.binId ? reader.location.binId.name : null
      },
      lowStockAlert: alertSent,
      movementId: movement._id
    }
  });
});
