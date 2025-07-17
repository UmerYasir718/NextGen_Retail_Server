const mongoose = require('mongoose');

const ShipmentSchema = new mongoose.Schema({
  shipmentNumber: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['Incoming', 'Outgoing'],
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'In Transit', 'Delivered', 'Delayed', 'Cancelled'],
    default: 'Pending'
  },
  source: {
    name: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    contactPerson: {
      name: String,
      email: String,
      phone: String
    }
  },
  destination: {
    name: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    contactPerson: {
      name: String,
      email: String,
      phone: String
    }
  },
  items: [{
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory'
    },
    quantity: {
      type: Number,
      required: true
    },
    price: {
      type: Number,
      default: 0
    }
  }],
  documents: [{
    type: {
      type: String,
      enum: ['Invoice', 'Delivery Note', 'Packing Slip', 'Other']
    },
    url: String,
    fileName: String
  }],
  expectedDate: {
    type: Date,
    required: true
  },
  actualDate: {
    type: Date
  },
  carrier: {
    name: String,
    trackingNumber: String,
    trackingUrl: String
  },
  notes: {
    type: String
  },
  totalValue: {
    type: Number,
    default: 0
  },
  warehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse'
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

// Create indexes
ShipmentSchema.index({ shipmentNumber: 1 });
ShipmentSchema.index({ companyId: 1 });
ShipmentSchema.index({ status: 1 });
ShipmentSchema.index({ expectedDate: 1 });
ShipmentSchema.index({ warehouseId: 1 });

// Pre-save middleware to update timestamps
ShipmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Shipment', ShipmentSchema);
