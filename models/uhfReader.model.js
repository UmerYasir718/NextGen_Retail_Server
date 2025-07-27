const mongoose = require('mongoose');

const UHFReaderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a UHF reader name'],
    trim: true
  },
  uhfId: {
    type: String,
    required: [true, 'Please add a unique UHF ID'],
    trim: true
  },
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Maintenance'],
    default: 'Active'
  },
  location: {
    type: {
      type: String,
      enum: ['Bin', 'Shelf', 'Zone', 'Warehouse'],
      required: [true, 'Please specify the location type']
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true
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
  lastSeen: {
    type: Date
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
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for faster queries
UHFReaderSchema.index({ uhfId: 1 }, { unique: true });
UHFReaderSchema.index({ companyId: 1 });
UHFReaderSchema.index({ 'location.warehouseId': 1 });
UHFReaderSchema.index({ 'location.zoneId': 1 });
UHFReaderSchema.index({ 'location.shelfId': 1 });
UHFReaderSchema.index({ 'location.binId': 1 });

// Pre-save middleware to ensure location hierarchy is valid
UHFReaderSchema.pre('save', function(next) {
  // If location type is Bin, all location fields are required
  if (this.location.type === 'Bin') {
    if (!this.location.binId || !this.location.shelfId || !this.location.zoneId) {
      return next(new Error('Bin location requires binId, shelfId, and zoneId'));
    }
  }
  // If location type is Shelf, shelf and zone IDs are required
  else if (this.location.type === 'Shelf') {
    if (!this.location.shelfId || !this.location.zoneId) {
      return next(new Error('Shelf location requires shelfId and zoneId'));
    }
    // Clear bin ID if present
    this.location.binId = undefined;
  }
  // If location type is Zone, only zone ID is required
  else if (this.location.type === 'Zone') {
    if (!this.location.zoneId) {
      return next(new Error('Zone location requires zoneId'));
    }
    // Clear shelf and bin IDs if present
    this.location.shelfId = undefined;
    this.location.binId = undefined;
  }
  // If location type is Warehouse, clear all other location IDs
  else if (this.location.type === 'Warehouse') {
    this.location.zoneId = undefined;
    this.location.shelfId = undefined;
    this.location.binId = undefined;
  }

  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('UHFReader', UHFReaderSchema);
