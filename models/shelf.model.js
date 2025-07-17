const mongoose = require('mongoose');

const ShelfSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a shelf name'],
    trim: true
  },
  description: {
    type: String
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
ShelfSchema.index({ zoneId: 1 });
ShelfSchema.index({ warehouseId: 1 });
ShelfSchema.index({ companyId: 1 });
ShelfSchema.index({ name: 1, zoneId: 1 }, { unique: true });

module.exports = mongoose.model('Shelf', ShelfSchema);
