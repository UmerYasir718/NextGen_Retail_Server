const mongoose = require("mongoose");
const User = require("../models/user.model");
const Company = require("../models/company.model");
const Plan = require("../models/plan.model");
const { createFreePlan } = require("../seeder/planSeeder");
require("dotenv").config();

// Connect to DB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Test functions
const testPlanExpiration = async () => {
  try {
    console.log("Starting plan expiration tests...");

    // 1. Create a free trial plan if it doesn't exist
    const freePlan = await createFreePlan();
    console.log("Free trial plan:", freePlan);

    // 2. Create a test company with an expired trial
    const expiredCompanyName = `Test Expired Company ${Date.now()}`;
    const expiredCompany = await Company.create({
      name: expiredCompanyName,
      contactEmail: `expired${Date.now()}@test.com`,
      planId: freePlan._id,
      isTrialPeriod: true,
      planStartDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
      trialEndDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago (expired)
    });
    console.log("Created expired company:", expiredCompany);

    // 3. Create users for the expired company
    const adminUser = await User.create({
      name: "Admin Test User",
      email: `admin${Date.now()}@test.com`,
      password: "password123",
      role: "company_admin",
      companyId: expiredCompany._id,
      planId: freePlan._id,
      isVerified: true,
    });

    const regularUser = await User.create({
      name: "Regular Test User",
      email: `regular${Date.now()}@test.com`,
      password: "password123",
      role: "analyst",
      companyId: expiredCompany._id,
      planId: freePlan._id,
      isVerified: true,
    });

    console.log("Created test users:", {
      admin: adminUser.email,
      regular: regularUser.email,
    });

    // 4. Create a test company with an active trial
    const activeCompanyName = `Test Active Company ${Date.now()}`;
    const activeCompany = await Company.create({
      name: activeCompanyName,
      contactEmail: `active${Date.now()}@test.com`,
      planId: freePlan._id,
      isTrialPeriod: true,
      planStartDate: new Date(), // today
      trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    });
    console.log("Created active company:", activeCompany);

    // 5. Create users for the active company
    const activeAdminUser = await User.create({
      name: "Active Admin Test User",
      email: `activeadmin${Date.now()}@test.com`,
      password: "password123",
      role: "company_admin",
      companyId: activeCompany._id,
      planId: freePlan._id,
      isVerified: true,
    });

    const activeRegularUser = await User.create({
      name: "Active Regular Test User",
      email: `activeregular${Date.now()}@test.com`,
      password: "password123",
      role: "analyst",
      companyId: activeCompany._id,
      planId: freePlan._id,
      isVerified: true,
    });

    console.log("Created active test users:", {
      admin: activeAdminUser.email,
      regular: activeRegularUser.email,
    });

    console.log("\nTest Instructions:");
    console.log("1. Try logging in with the expired company regular user:");
    console.log(`   Email: ${regularUser.email}`);
    console.log("   Password: password123");
    console.log(
      '   Expected result: Login denied with "Your company plan has expired" message'
    );

    console.log("\n2. Try logging in with the expired company admin user:");
    console.log(`   Email: ${adminUser.email}`);
    console.log("   Password: password123");
    console.log(
      "   Expected result: Login successful with isPlanExpired=true flag in response"
    );

    console.log("\n3. Try logging in with the active company regular user:");
    console.log(`   Email: ${activeRegularUser.email}`);
    console.log("   Password: password123");
    console.log(
      "   Expected result: Login successful with isPlanExpired=false flag in response"
    );

    console.log("\n4. Try logging in with the active company admin user:");
    console.log(`   Email: ${activeAdminUser.email}`);
    console.log("   Password: password123");
    console.log(
      "   Expected result: Login successful with isPlanExpired=false flag in response"
    );

    console.log("\nTest data created successfully!");
  } catch (err) {
    console.error("Error in test:", err);
  } finally {
    // Disconnect from DB
    mongoose.disconnect();
  }
};

// Run the tests
testPlanExpiration();
