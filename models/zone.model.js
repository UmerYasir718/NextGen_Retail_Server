const mongoose = require('mongoose');

const ZoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a zone name'],
    trim: true
  },
  description: {
    type: String
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
ZoneSchema.index({ warehouseId: 1 });
ZoneSchema.index({ companyId: 1 });
ZoneSchema.index({ name: 1, warehouseId: 1 }, { unique: true });

module.exports = mongoose.model('Zone', ZoneSchema);
