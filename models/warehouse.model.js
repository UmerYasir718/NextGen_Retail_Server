const mongoose = require("mongoose");

const WarehouseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please add a warehouse name"],
    trim: true,
  },
  address: {
    street: {
      type: String,
      required: [true, "Please add street address"],
    },
    city: {
      type: String,
      required: [true, "Please add city"],
    },
    state: {
      type: String,
      required: [true, "Please add state/province"],
    },
    zipCode: {
      type: String,
      required: [true, "Please add zip/postal code"],
    },
    country: {
      type: String,
      required: [true, "Please add country"],
    },
  },
  contactInfo: {
    name: { type: "String" },
    phone: { type: "String" },
    email: { type: "String" },
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  capacity: {
    type: String,
  },
});

// Create indexes for faster queries
WarehouseSchema.index({ companyId: 1 });
WarehouseSchema.index({ name: 1, companyId: 1 }, { unique: true });

module.exports = mongoose.model("Warehouse", WarehouseSchema);
