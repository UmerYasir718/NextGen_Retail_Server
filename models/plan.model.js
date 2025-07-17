const mongoose = require('mongoose');

const PlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a plan name'],
    trim: true,
    unique: true
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  duration: {
    type: Number,
    required: [true, 'Please specify the duration in months'],
    enum: [1, 6, 12] // Monthly, 6-Month, Yearly
  },
  price: {
    type: Number,
    required: [true, 'Please add a price']
  },
  features: {
    warehouseLimit: {
      type: Number,
      default: 1
    },
    userLimit: {
      type: Number,
      default: 5
    },
    inventoryLimit: {
      type: Number,
      default: 1000
    },
    includesAIForecasting: {
      type: Boolean,
      default: false
    },
    includesAdvancedReporting: {
      type: Boolean,
      default: false
    }
  },
  stripePriceId: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Plan', PlanSchema);
