const mongoose = require('mongoose');

const ItemMovementSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['In', 'Out', 'Transfer', 'Adjustment'],
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  source: {
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse'
    },
    zoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone'
    },
    shelfId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shelf'
    },
    binId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bin'
    }
  },
  destination: {
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse'
    },
    zoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone'
    },
    shelfId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shelf'
    },
    binId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bin'
    }
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  movedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  shipmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shipment'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Create indexes
ItemMovementSchema.index({ itemId: 1 });
ItemMovementSchema.index({ companyId: 1 });
ItemMovementSchema.index({ timestamp: 1 });
ItemMovementSchema.index({ 'source.warehouseId': 1 });
ItemMovementSchema.index({ 'destination.warehouseId': 1 });

module.exports = mongoose.model('ItemMovement', ItemMovementSchema);
