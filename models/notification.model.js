const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Stock', 'Shipment', 'System', 'Plan', 'Security'],
    required: true
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  relatedTo: {
    model: {
      type: String,
      enum: ['Inventory', 'Shipment', 'User', 'Company', 'Plan']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  recipients: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    read: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date
    }
  }],
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date
  }
});

// Create indexes
NotificationSchema.index({ companyId: 1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ 'recipients.userId': 1 });
NotificationSchema.index({ createdAt: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);
