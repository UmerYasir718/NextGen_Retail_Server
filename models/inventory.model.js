const mongoose = require("mongoose");

const InventorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please add item name"],
    trim: true,
  },
  sku: {
    type: String,
    required: [true, "Please add SKU"],
    trim: true,
  },
  tagId: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
  },
  category: {
    type: String,
    required: [true, "Please add a category"],
  },
  quantity: {
    type: Number,
    required: [true, "Please add quantity"],
    default: 0,
  },
  threshold: {
    type: Number,
    default: 5,
  },
  location: {
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: false,
    },
    zoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
      required: false,
    },
    shelfId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shelf",
      required: false,
    },
    binId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bin",
      required: false,
    },
  },
  status: {
    type: String,
    enum: ["Available", "Low Stock", "Out of Stock", "Discontinued"],
    default: "Available",
  },
  inventoryStatus: {
    type: String,
    enum: ["purchase", "sale_pending", "sale", "purchased"],
    default: "purchase",
  },
  lowStockAlertSent: {
    type: Boolean,
    default: false,
  },
  price: {
    cost: {
      type: Number,
      default: 0,
    },
    retail: {
      type: Number,
      default: 0,
    },
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "File",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  saleDate: {
    type: Date,
    default: Date.now,
  },
});

// Create indexes for faster queries
InventorySchema.index({ sku: 1, companyId: 1 }, { unique: true });
InventorySchema.index({ tagId: 1 });
InventorySchema.index({ companyId: 1 });
InventorySchema.index({ category: 1, companyId: 1 });
InventorySchema.index({ "location.warehouseId": 1 });
InventorySchema.index({ fileId: 1 });

// Pre-save middleware to update status based on quantity and threshold
InventorySchema.pre("save", function (next) {
  if (this.quantity <= 0) {
    this.status = "Out of Stock";
  } else if (this.quantity <= this.threshold) {
    this.status = "Low Stock";
  } else {
    this.status = "Available";
  }

  // Keep inventoryStatus unchanged if it's already set
  if (!this.inventoryStatus) {
    this.inventoryStatus = "purchase";
  }

  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Inventory", InventorySchema);
