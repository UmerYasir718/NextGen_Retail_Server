const mongoose = require('mongoose');

const InventoryUploadSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  totalItems: {
    type: Number,
    default: 0
  },
  processedItems: {
    type: Number,
    default: 0
  },
  errorItems: {
    type: Number,
    default: 0
  },
  errors: [{
    row: Number,
    message: String
  }],
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date
  }
});

// Create indexes
InventoryUploadSchema.index({ companyId: 1 });
InventoryUploadSchema.index({ status: 1 });

module.exports = mongoose.model('InventoryUpload', InventoryUploadSchema);
