const mongoose = require('mongoose');
const Plan = require('../models/plan.model');
require('dotenv').config();

// Connect to DB
const connectDB = require('../config/db');
connectDB();

// Create free trial plan
const createFreePlan = async () => {
  try {
    // Check if free trial plan already exists
    const existingPlan = await Plan.findOne({ name: 'Free Trial' });
    
    if (existingPlan) {
      console.log('Free Trial plan already exists');
      return existingPlan;
    }
    
    // Create free trial plan
    const freePlan = await Plan.create({
      name: 'Free Trial',
      description: '14-day free trial with basic features',
      duration: 1, // 1 month equivalent for trial
      price: 0,
      limits: {
        warehouseLimit: 1,
        userLimit: 3,
        inventoryLimit: 100,
        includesAIForecasting: false,
        includesAdvancedReporting: false
      },
      features: ['Basic inventory management', 'Single warehouse', 'Up to 3 users'],
      isActive: true
    });
    
    console.log('Free Trial plan created:', freePlan);
    return freePlan;
  } catch (err) {
    console.error('Error creating Free Trial plan:', err);
    process.exit(1);
  }
};

// Export the function to be used in other files
module.exports = { createFreePlan };

// If this script is run directly
if (require.main === module) {
  createFreePlan().then(() => {
    console.log('Plan seeding completed');
    process.exit(0);
  });
}
