const mongoose = require('mongoose');

const BinSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a bin name'],
    trim: true
  },
  description: {
    type: String
  },
  shelfId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shelf',
    required: true
  },
  zoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone',
    required: true
  },
  warehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  capacity: {
    type: Number,
    default: 0
  },
 currentItems: {
  type: [{
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory'
    },
    quantity: {
      type: Number,
      default: 0
    }
  }],
  default: [],
  required: false
}
,
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for faster queries
BinSchema.index({ shelfId: 1 });
BinSchema.index({ zoneId: 1 });
BinSchema.index({ warehouseId: 1 });
BinSchema.index({ companyId: 1 });
BinSchema.index({ name: 1, shelfId: 1 }, { unique: true });

module.exports = mongoose.model('Bin', BinSchema);
