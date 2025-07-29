const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  userRole: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true,
  },
  module: {
    type: String,
    required: true,
    enum: [
      "Authentication",
      "User",
      "Company",
      "Plan",
      "Warehouse",
      "Zone",
      "Shelf",
      "Bin",
      "Inventory",
      "Shipment",
      "Report",
      "Settings",
      "UHF Reader",
    ],
  },
  description: {
    type: String,
    required: true,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
  },
  ipAddress: {
    type: String,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Create indexes
AuditLogSchema.index({ userId: 1 });
AuditLogSchema.index({ companyId: 1 });
AuditLogSchema.index({ module: 1 });
AuditLogSchema.index({ timestamp: 1 });

module.exports = mongoose.model("AuditLog", AuditLogSchema);
