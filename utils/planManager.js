const Company = require("../models/company.model");
const User = require("../models/user.model");
const Plan = require("../models/plan.model");

/**
 * Get the effective plan for a user
 * @param {string} userId - User ID
 * @returns {Object} Plan object or null
 */
exports.getUserEffectivePlan = async (userId) => {
  try {
    const user = await User.findById(userId).populate({
      path: "companyId",
      populate: {
        path: "planId",
      },
    });

    if (!user || !user.companyId) {
      return null;
    }

    return user.companyId.planId || null;
  } catch (error) {
    console.error("Error getting user effective plan:", error);
    return null;
  }
};

/**
 * Check if user has access to a specific feature
 * @param {string} userId - User ID
 * @param {string} feature - Feature to check
 * @returns {boolean} Whether user has access
 */
exports.checkUserFeatureAccess = async (userId, feature) => {
  try {
    const plan = await exports.getUserEffectivePlan(userId);

    if (!plan) {
      return false;
    }

    switch (feature) {
      case "aiForecasting":
        return plan.limits.includesAIForecasting;
      case "advancedReporting":
        return plan.limits.includesAdvancedReporting;
      case "multipleWarehouses":
        return plan.limits.warehouseLimit > 1;
      default:
        return false;
    }
  } catch (error) {
    console.error("Error checking user feature access:", error);
    return false;
  }
};

/**
 * Check if company can add more users
 * @param {string} companyId - Company ID
 * @returns {Object} { canAdd: boolean, current: number, limit: number }
 */
exports.checkUserLimit = async (companyId) => {
  try {
    const company = await Company.findById(companyId).populate("planId");

    if (!company) {
      return { canAdd: false, current: 0, limit: 0 };
    }

    const currentUserCount = await User.countDocuments({ companyId });

    // Default limits for companies without a plan
    const defaultLimits = {
      userLimit: 3,
      warehouseLimit: 1,
      inventoryLimit: 100,
    };

    const limits = company.planId?.limits || defaultLimits;

    return {
      canAdd: currentUserCount < limits.userLimit,
      current: currentUserCount,
      limit: limits.userLimit,
    };
  } catch (error) {
    console.error("Error checking user limit:", error);
    return { canAdd: false, current: 0, limit: 0 };
  }
};

/**
 * Check if company can add more warehouses
 * @param {string} companyId - Company ID
 * @returns {Object} { canAdd: boolean, current: number, limit: number }
 */
exports.checkWarehouseLimit = async (companyId) => {
  try {
    const company = await Company.findById(companyId).populate("planId");

    if (!company) {
      return { canAdd: false, current: 0, limit: 0 };
    }

    const Warehouse = require("../models/warehouse.model");
    const currentWarehouseCount = await Warehouse.countDocuments({ companyId });

    // Default limits for companies without a plan
    const defaultLimits = {
      userLimit: 3,
      warehouseLimit: 1,
      inventoryLimit: 100,
    };

    const limits = company.planId?.limits || defaultLimits;

    return {
      canAdd: currentWarehouseCount < limits.warehouseLimit,
      current: currentWarehouseCount,
      limit: limits.warehouseLimit,
    };
  } catch (error) {
    console.error("Error checking warehouse limit:", error);
    return { canAdd: false, current: 0, limit: 0 };
  }
};

/**
 * Check if company can add more inventory items
 * @param {string} companyId - Company ID
 * @returns {Object} { canAdd: boolean, current: number, limit: number }
 */
exports.checkInventoryLimit = async (companyId) => {
  try {
    const company = await Company.findById(companyId).populate("planId");

    if (!company) {
      return { canAdd: false, current: 0, limit: 0 };
    }

    const Inventory = require("../models/inventory.model");
    const currentInventoryCount = await Inventory.countDocuments({ companyId });

    // Default limits for companies without a plan
    const defaultLimits = {
      userLimit: 3,
      warehouseLimit: 1,
      inventoryLimit: 100,
    };

    const limits = company.planId?.limits || defaultLimits;

    return {
      canAdd: currentInventoryCount < limits.inventoryLimit,
      current: currentInventoryCount,
      limit: limits.inventoryLimit,
    };
  } catch (error) {
    console.error("Error checking inventory limit:", error);
    return { canAdd: false, current: 0, limit: 0 };
  }
};

/**
 * Update company plan and sync all users
 * @param {string} companyId - Company ID
 * @param {string} planId - New plan ID
 * @param {Date} startDate - Plan start date
 * @param {Date} endDate - Plan end date
 * @returns {Object} Updated company
 */
exports.updateCompanyPlan = async (companyId, planId, startDate, endDate) => {
  try {
    console.log("🔄 Updating company plan...");
    console.log("📋 Company ID:", companyId);
    console.log("📋 New Plan ID:", planId);
    console.log("📅 Start Date:", startDate);
    console.log("📅 End Date:", endDate);

    // Get current company state
    const currentCompany = await Company.findById(companyId);
    console.log("📊 Current company planId:", currentCompany?.planId);
    console.log("📊 Current isTrialPeriod:", currentCompany?.isTrialPeriod);

    // Update company plan
    const company = await Company.findByIdAndUpdate(
      companyId,
      {
        planId,
        planStartDate: startDate,
        planEndDate: endDate,
        isTrialPeriod: false,
      },
      { new: true }
    );

    console.log("✅ Company updated successfully");
    console.log("📊 Updated company planId:", company.planId);
    console.log("📊 Updated isTrialPeriod:", company.isTrialPeriod);

    // Remove planId from all users (they'll inherit from company)
    const userUpdateResult = await User.updateMany(
      { companyId },
      { $unset: { planId: 1 } }
    );
    console.log("👥 Users updated:", userUpdateResult.modifiedCount);

    console.log(
      `Updated plan for company ${company.name} and synced all users`
    );
    return company;
  } catch (error) {
    console.error("❌ Error updating company plan:", error);
    throw error;
  }
};

/**
 * Check if company plan is expired
 * @param {string} companyId - Company ID
 * @returns {Object} { isExpired: boolean, daysRemaining: number }
 */
exports.checkPlanExpiration = async (companyId) => {
  try {
    const company = await Company.findById(companyId);

    if (!company) {
      return { isExpired: true, daysRemaining: 0 };
    }

    let endDate;
    if (company.isTrialPeriod) {
      endDate = company.trialEndDate;
    } else {
      endDate = company.planEndDate;
    }

    if (!endDate) {
      return { isExpired: true, daysRemaining: 0 };
    }

    const now = new Date();
    const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

    return {
      isExpired: daysRemaining <= 0,
      daysRemaining: Math.max(0, daysRemaining),
    };
  } catch (error) {
    console.error("Error checking plan expiration:", error);
    return { isExpired: true, daysRemaining: 0 };
  }
};

/**
 * Get plan usage statistics for a company
 * @param {string} companyId - Company ID
 * @returns {Object} Usage statistics
 */
exports.getPlanUsage = async (companyId) => {
  try {
    const company = await Company.findById(companyId).populate("planId");
    const User = require("../models/user.model");
    const Warehouse = require("../models/warehouse.model");
    const Inventory = require("../models/inventory.model");

    if (!company) {
      throw new Error("Company not found");
    }

    const [userCount, warehouseCount, inventoryCount] = await Promise.all([
      User.countDocuments({ companyId }),
      Warehouse.countDocuments({ companyId }),
      Inventory.countDocuments({ companyId }),
    ]);

    // Default limits for companies without a plan (fallback)
    const defaultLimits = {
      warehouseLimit: 1,
      userLimit: 3,
      inventoryLimit: 100,
      includesAIForecasting: false,
      includesAdvancedReporting: false,
    };

    // Use company plan limits if available, otherwise use defaults
    const limits = company.planId?.limits || defaultLimits;

    return {
      plan: company.planId,
      usage: {
        users: {
          current: userCount,
          limit: limits.userLimit,
          percentage: Math.round((userCount / limits.userLimit) * 100),
        },
        warehouses: {
          current: warehouseCount,
          limit: limits.warehouseLimit,
          percentage: Math.round(
            (warehouseCount / limits.warehouseLimit) * 100
          ),
        },
        inventory: {
          current: inventoryCount,
          limit: limits.inventoryLimit,
          percentage: Math.round(
            (inventoryCount / limits.inventoryLimit) * 100
          ),
        },
      },
      features: {
        aiForecasting: limits.includesAIForecasting,
        advancedReporting: limits.includesAdvancedReporting,
      },
    };
  } catch (error) {
    console.error("Error getting plan usage:", error);
    throw error;
  }
};
