const mongoose = require('mongoose');

const InventoryTempSchema = new mongoose.Schema({
  uploadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryUpload',
    required: true
  },
  rowNumber: {
    type: Number
  },
  name: {
    type: String,
    required: [true, 'Please add item name'],
    trim: true
  },
  sku: {
    type: String,
    required: [true, 'Please add SKU'],
    trim: true
  },
  tagId: {
    type: String,
    trim: true
  },
  description: {
    type: String
  },
  category: {
    type: String,
    required: [true, 'Please add a category']
  },
  quantity: {
    type: Number,
    required: [true, 'Please add quantity'],
    default: 0
  },
  threshold: {
    type: Number,
    default: 5
  },
  location: {
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse'
    },
    warehouseName: String,
    zoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone'
    },
    zoneName: String,
    shelfId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shelf'
    },
    shelfName: String,
    binId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bin'
    },
    binName: String
  },
  price: {
    cost: {
      type: Number,
      default: 0
    },
    retail: {
      type: Number,
      default: 0
    }
  },
  supplier: {
    name: String,
    contactInfo: String
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Valid', 'Invalid'],
    default: 'Pending'
  },
  errors: [{
    field: String,
    message: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes
InventoryTempSchema.index({ uploadId: 1 });
InventoryTempSchema.index({ companyId: 1 });
InventoryTempSchema.index({ status: 1 });

module.exports = mongoose.model('InventoryTemp', InventoryTempSchema);
