const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a company name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters'], unique: true,
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  contactEmail: {
    type: String,
    required: [true, 'Please add a contact email'],
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  contactPhone: {
    type: String
  },
  logo: {
    type: String,
    default: 'default-logo.png'
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan'
  },
  planStartDate: {
    type: Date
  },
  planEndDate: {
    type: Date
  },
  isTrialPeriod: {
    type: Boolean,
    default: true
  },
  trialEndDate: {
    type: Date,
    default: function () {
      const date = new Date();
      date.setDate(date.getDate() + 14); // 14-day trial period
      return date;
    }
  },
  stripeCustomerId: {
    type: String
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

// Create indexes
CompanySchema.index({ name: 1 });

module.exports = mongoose.model('Company', CompanySchema);
