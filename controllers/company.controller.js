const mongoose = require("mongoose");
const Company = require("../models/company.model");
const User = require("../models/user.model");
const Inventory = require("../models/inventory.model");
const Shipment = require("../models/shipment.model");
const ErrorResponse = require("../utils/errorResponse");
const {
  logEntityCreation,
  logEntityUpdate,
  logEntityDeletion,
} = require("../utils/auditLogger");

// @desc    Get all companies (SuperAdmin only)
// @route   GET /api/companies
// @access  Private/SuperAdmin
exports.getCompanies = async (req, res, next) => {
  try {
    // Build query
    let query = {};

    // Filter by status if provided
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by plan type if provided
    if (req.query.planType) {
      query["plan.planType"] = req.query.planType;
    }

    // Filter by subscription status if provided
    if (req.query.subscriptionStatus) {
      query["plan.subscriptionStatus"] = req.query.subscriptionStatus;
    }

    // Search by company name, email, or domain
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { domain: searchRegex },
      ];
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const total = await Company.countDocuments(query);

    // Execute query with pagination
    const companies = await Company.find(query)
      .populate("planId", "name planType price interval features")
      .populate("createdBy", "name email")
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Pagination result
    const pagination = {
      current: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };

    if (startIndex + limit < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    // Get summary stats
    const totalCompanies = await Company.countDocuments();
    const activeCompanies = await Company.countDocuments({ status: "active" });
    const trialCompanies = await Company.countDocuments({
      "plan.planType": "trial",
    });
    const paidCompanies = await Company.countDocuments({
      "plan.planType": { $ne: "trial" },
    });

    res.status(200).json({
      success: true,
      count: companies.length,
      total,
      pagination,
      summary: {
        totalCompanies,
        activeCompanies,
        trialCompanies,
        paidCompanies,
      },
      data: companies,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single company
// @route   GET /api/companies/:id
// @access  Private/SuperAdmin or Admin (own company)
exports.getCompany = async (req, res, next) => {
  try {
    let company;

    if (req.user.role === "SuperAdmin") {
      // SuperAdmin can view any company
      company = await Company.findById(req.params.id);
    } else {
      // Others can only view their own company
      if (req.params.id !== req.user.companyId.toString()) {
        return next(
          new ErrorResponse(`Not authorized to access this company`, 403)
        );
      }
      company = await Company.findById(req.user.companyId);
    }

    if (!company) {
      return next(
        new ErrorResponse(`Company not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: company,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update company
// @route   PUT /api/companies/:id
// @access  Private/SuperAdmin or Admin (own company)
exports.updateCompany = async (req, res, next) => {
  try {
    let company;

    // Get original company for audit log
    let originalCompany;
    if (req.user.role === "SuperAdmin") {
      originalCompany = await Company.findById(req.params.id);
    } else {
      originalCompany = await Company.findById(req.user.companyId);
    }

    if (!originalCompany) {
      return next(
        new ErrorResponse(`Company not found with id of ${req.params.id}`, 404)
      );
    }

    if (req.user.role === "SuperAdmin") {
      // SuperAdmin can update any company
      company = await Company.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
    } else {
      // Others can only update their own company
      if (req.params.id !== req.user.companyId.toString()) {
        return next(
          new ErrorResponse(`Not authorized to update this company`, 403)
        );
      }

      // Prevent changing critical fields if not SuperAdmin
      const restrictedFields = [
        "planId",
        "planStartDate",
        "planEndDate",
        "isTrialPeriod",
        "trialEndDate",
        "stripeCustomerId",
        "isActive",
      ];
      restrictedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          delete req.body[field];
        }
      });

      company = await Company.findByIdAndUpdate(req.user.companyId, req.body, {
        new: true,
        runValidators: true,
      });
    }

    // Create audit log
    await logEntityUpdate(req, originalCompany, company, "Company", "company");

    if (!company) {
      return next(
        new ErrorResponse(`Company not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: company,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete company
// @route   DELETE /api/companies/:id
// @access  Private/SuperAdmin
exports.deleteCompany = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return next(
        new ErrorResponse(`Company not found with id of ${req.params.id}`, 404)
      );
    }

    // Create audit log before deletion
    await logEntityDeletion(req, company, "Company", "company");

    // Delete all users associated with the company
    await User.deleteMany({ companyId: req.params.id });

    // Delete the company
    await company.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get company plan details
// @route   GET /api/companies/plan
// @access  Private/Admin
exports.getCompanyPlan = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const planManager = require("../utils/planManager");

    // Get comprehensive plan information
    const planUsage = await planManager.getPlanUsage(companyId);
    const planExpiration = await planManager.checkPlanExpiration(companyId);
    const company = await Company.findById(companyId).populate("planId");

    if (!company) {
      return next(new ErrorResponse("Company not found", 404));
    }

    res.status(200).json({
      success: true,
      data: {
        plan: {
          id: company.planId?._id,
          name: company.planId?.name || "Free Trial",
          description: company.planId?.description,
          price: company.planId?.price || 0,
          duration: company.planId?.duration || 1,
          isTrialPeriod: company.isTrialPeriod,
          planStartDate: company.planStartDate,
          planEndDate: company.planEndDate,
          trialEndDate: company.trialEndDate,
          isExpired: planExpiration.isExpired,
          daysRemaining: planExpiration.daysRemaining,
          limits: company.planId?.limits || {
            warehouseLimit: 1,
            userLimit: 3,
            inventoryLimit: 100,
            includesAIForecasting: false,
            includesAdvancedReporting: false,
          },
          features: company.planId?.features || ["Basic inventory management"],
        },
        usage: planUsage.usage,
        canUpgrade: !company.isTrialPeriod && planExpiration.daysRemaining > 0,
        upgradeUrl: "/plans",
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get admin dashboard overview
// @route   GET /api/companies/admin/overview
// @access  Private/SuperAdmin
exports.getAdminOverview = async (req, res, next) => {
  try {
    // Get overall statistics
    const totalCompanies = await Company.countDocuments();
    const activeCompanies = await Company.countDocuments({ isActive: true });
    const trialCompanies = await Company.countDocuments({ isTrialPeriod: true });
    const expiredCompanies = await Company.countDocuments({
      planEndDate: { $lt: new Date() }
    });

    // Get recent activity
    const recentCompanies = await Company.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('planId', 'name price')
      .select('name createdAt planId isTrialPeriod');

    // Get plan distribution
    const planDistribution = await Company.aggregate([
      {
        $lookup: {
          from: 'plans',
          localField: 'planId',
          foreignField: '_id',
          as: 'plan'
        }
      },
      {
        $group: {
          _id: '$planId',
          count: { $sum: 1 },
          planName: { $first: '$plan.name' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get monthly growth
    const monthlyGrowth = await Company.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalCompanies,
          activeCompanies,
          trialCompanies,
          expiredCompanies
        },
        recentActivity: recentCompanies,
        planDistribution,
        monthlyGrowth
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Bulk company operations
// @route   POST /api/companies/bulk-operations
// @access  Private/SuperAdmin
exports.bulkCompanyOperations = async (req, res, next) => {
  try {
    const { operation, companyIds, data } = req.body;

    if (!operation || !companyIds || !Array.isArray(companyIds)) {
      return next(
        new ErrorResponse("Operation, companyIds array, and data are required", 400)
      );
    }

    let result;
    let message;

    switch (operation) {
      case 'activate':
        result = await Company.updateMany(
          { _id: { $in: companyIds } },
          { isActive: true }
        );
        message = `${result.modifiedCount} companies activated successfully`;
        break;

      case 'deactivate':
        result = await Company.updateMany(
          { _id: { $in: companyIds } },
          { isActive: false }
        );
        message = `${result.modifiedCount} companies deactivated successfully`;
        break;

      case 'extend-trial':
        if (!data.days) {
          return next(new ErrorResponse("Days are required for trial extension", 400));
        }
        const extensionDate = new Date();
        extensionDate.setDate(extensionDate.getDate() + data.days);
        
        result = await Company.updateMany(
          { _id: { $in: companyIds } },
          { 
            trialEndDate: extensionDate,
            isTrialPeriod: true
          }
        );
        message = `${result.modifiedCount} companies trial extended by ${data.days} days`;
        break;

      case 'update':
        if (!data) {
          return next(new ErrorResponse("Data is required for update operation", 400));
        }
        result = await Company.updateMany(
          { _id: { $in: companyIds } },
          { $set: data }
        );
        message = `${result.modifiedCount} companies updated successfully`;
        break;

      default:
        return next(new ErrorResponse("Invalid operation. Use: activate, deactivate, extend-trial, or update", 400));
    }

    res.status(200).json({
      success: true,
      message,
      data: {
        operation,
        affectedCompanies: result.modifiedCount,
        totalCompanies: companyIds.length
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get company dashboard stats
// @route   GET /api/companies/dashboard
// @access  Private/Admin
exports.getDashboardStats = async (req, res, next) => {
  try {
    // Get company ID from authenticated user
    const companyId = req.user.companyId;

    // Get company details with plan information
    const company = await Company.findById(companyId).populate("planId");

    if (!company) {
      return next(new ErrorResponse("Company not found", 404));
    }

    // Get plan usage statistics
    const planManager = require("../utils/planManager");
    const planUsage = await planManager.getPlanUsage(companyId);
    const planExpiration = await planManager.checkPlanExpiration(companyId);

    // Calculate days remaining in trial or plan
    let daysRemaining = planExpiration.daysRemaining;
    let planStatus = company.isTrialPeriod ? "Trial" : "Paid Plan";

    // Get user count
    const userCount = await User.countDocuments({ companyId });

    // Get inventory data for charts
    const inventoryData = await exports.getInventoryChartData(companyId);

    // Get sales and revenue data for charts
    const { salesData, revenueData } = await exports.getSalesAndRevenueData(
      companyId
    );

    // Get recent sales data for table
    const recentSalesData = await exports.getRecentSalesData(companyId);

    // Get low stock items for table
    const lowStockItems = await exports.getLowStockItems(companyId);

    // Return dashboard stats with comprehensive plan information
    res.status(200).json({
      success: true,
      data: {
        companyName: company.name,
        planStatus,
        daysRemaining,
        userCount,
        isActive: company.isActive,
        plan: {
          id: company.planId?._id,
          name: company.planId?.name || "Free Trial",
          description: company.planId?.description,
          price: company.planId?.price || 0,
          duration: company.planId?.duration || 1,
          isTrialPeriod: company.isTrialPeriod,
          planStartDate: company.planStartDate,
          planEndDate: company.planEndDate,
          trialEndDate: company.trialEndDate,
          isExpired: planExpiration.isExpired,
          limits: company.planId?.limits || {
            warehouseLimit: 1,
            userLimit: 3,
            inventoryLimit: 100,
            includesAIForecasting: false,
            includesAdvancedReporting: false,
          },
          features: company.planId?.features || ["Basic inventory management"],
        },
        usage: planUsage.usage,
        salesData,
        inventoryData,
        revenueData,
        recentSalesData,
        lowStockItems,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get company statistics (SuperAdmin only)
// @route   GET /api/companies/stats
// @access  Private/SuperAdmin
exports.getCompanyStats = async (req, res, next) => {
  try {
    // Get comprehensive company statistics
    const totalCompanies = await Company.countDocuments();
    const activeCompanies = await Company.countDocuments({ status: "active" });
    const inactiveCompanies = await Company.countDocuments({
      status: "inactive",
    });

    // Plan type breakdown
    const trialCompanies = await Company.countDocuments({
      "plan.planType": "trial",
    });
    const basicCompanies = await Company.countDocuments({
      "plan.planType": "basic",
    });
    const premiumCompanies = await Company.countDocuments({
      "plan.planType": "premium",
    });
    const enterpriseCompanies = await Company.countDocuments({
      "plan.planType": "enterprise",
    });

    // Subscription status breakdown
    const activeSubscriptions = await Company.countDocuments({
      "plan.subscriptionStatus": "active",
    });
    const canceledSubscriptions = await Company.countDocuments({
      "plan.subscriptionStatus": "canceled",
    });
    const pastDueSubscriptions = await Company.countDocuments({
      "plan.subscriptionStatus": "past_due",
    });
    const trialingSubscriptions = await Company.countDocuments({
      "plan.subscriptionStatus": "trialing",
    });

    // Recent activity
    const lastMonthCompanies = await Company.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });

    const lastWeekCompanies = await Company.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalCompanies,
          activeCompanies,
          inactiveCompanies,
        },
        planBreakdown: {
          trial: trialCompanies,
          basic: basicCompanies,
          premium: premiumCompanies,
          enterprise: enterpriseCompanies,
        },
        subscriptionStatus: {
          active: activeSubscriptions,
          canceled: canceledSubscriptions,
          pastDue: pastDueSubscriptions,
          trialing: trialingSubscriptions,
        },
        recentActivity: {
          lastMonth: lastMonthCompanies,
          lastWeek: lastWeekCompanies,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Approve company subscription (SuperAdmin only)
// @route   POST /api/companies/:id/approve-subscription
// @access  Private/SuperAdmin
exports.approveCompanySubscription = async (req, res, next) => {
  try {
    const { planType, subscriptionStatus, trialDays, notes } = req.body;

    // Validate required fields
    if (!planType) {
      return next(new ErrorResponse("Plan type is required", 400));
    }

    // Find the company
    const company = await Company.findById(req.params.id);
    if (!company) {
      return next(
        new ErrorResponse(`Company not found with id of ${req.params.id}`, 404)
      );
    }

    // Update company subscription details
    const updateData = {
      "plan.planType": planType,
      "plan.subscriptionStatus": subscriptionStatus || "active",
      "plan.approvedBy": req.user.id,
      "plan.approvedAt": Date.now(),
      "plan.notes": notes || "",
    };

    // Set trial period if applicable
    if (planType === "trial" && trialDays) {
      updateData["plan.trialStart"] = Date.now();
      updateData["plan.trialEnd"] = new Date(
        Date.now() + trialDays * 24 * 60 * 60 * 1000
      );
      updateData["plan.subscriptionStatus"] = "trialing";
    }

    // Update the company
    const updatedCompany = await Company.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("planId", "name planType price interval features");

    // Log the approval action
    await logEntityUpdate(
      req.user.id,
      "Company",
      company._id,
      "Subscription Approved",
      {
        previousPlan: company.plan,
        newPlan: updateData.plan,
        approvedBy: req.user.id,
        notes: notes || "",
      }
    );

    res.status(200).json({
      success: true,
      message: "Company subscription approved successfully",
      data: updatedCompany,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Stripe transactions and payment statistics (SuperAdmin only)
// @route   GET /api/companies/stripe/transactions
// @access  Private/SuperAdmin
exports.getStripeTransactions = async (req, res, next) => {
  try {
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    // Get query parameters for filtering
    const { status, createdAfter, createdBefore, customerEmail } = req.query;

    // Build Stripe query parameters
    const stripeParams = {
      limit: limit,
      starting_after: page > 1 ? req.query.starting_after : undefined,
    };

    // Add filters if provided
    if (status) {
      stripeParams.status = status;
    }
    if (createdAfter) {
      stripeParams.created = { gte: new Date(createdAfter).getTime() / 1000 };
    }
    if (createdBefore) {
      if (stripeParams.created) {
        stripeParams.created.lte = new Date(createdBefore).getTime() / 1000;
      } else {
        stripeParams.created = {
          lte: new Date(createdBefore).getTime() / 1000,
        };
      }
    }

    // Get payments from Stripe
    const payments = await stripe.paymentIntents.list(stripeParams);

    // Get subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      limit: limit,
      starting_after: page > 1 ? req.query.starting_after : undefined,
    });

    // Get invoices from Stripe
    const invoices = await stripe.invoices.list({
      limit: limit,
      starting_after: page > 1 ? req.query.starting_after : undefined,
    });

    // Calculate total statistics
    const totalPayments = await stripe.paymentIntents.list({ limit: 100 });
    const totalSubscriptions = await stripe.subscriptions.list({ limit: 100 });
    const totalInvoices = await stripe.invoices.list({ limit: 100 });

    // Calculate totals
    const totalRevenue = totalPayments.data.reduce((sum, payment) => {
      return sum + (payment.amount || 0);
    }, 0);

    const totalSubscriptionsRevenue = totalSubscriptions.data.reduce(
      (sum, sub) => {
        return sum + (sub.items.data[0]?.price?.unit_amount || 0);
      },
      0
    );

    const totalInvoicesRevenue = totalInvoices.data.reduce((sum, invoice) => {
      return sum + (invoice.amount_paid || 0);
    }, 0);

    // Get recent transactions for the current page
    const recentTransactions = [];

    // Add payments
    payments.data.forEach((payment) => {
      recentTransactions.push({
        id: payment.id,
        type: "payment",
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        created: payment.created,
        customer: payment.customer,
        description: payment.description,
        metadata: payment.metadata,
      });
    });

    // Add subscriptions
    subscriptions.data.forEach((sub) => {
      recentTransactions.push({
        id: sub.id,
        type: "subscription",
        amount: sub.items.data[0]?.price?.unit_amount || 0,
        currency: sub.currency,
        status: sub.status,
        created: sub.created,
        customer: sub.customer,
        description: `Subscription: ${
          sub.items.data[0]?.price?.nickname || "Unknown Plan"
        }`,
        metadata: sub.metadata,
        currentPeriodStart: sub.current_period_start,
        currentPeriodEnd: sub.current_period_end,
      });
    });

    // Add invoices
    invoices.data.forEach((invoice) => {
      recentTransactions.push({
        id: invoice.id,
        type: "invoice",
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: invoice.status,
        created: invoice.created,
        customer: invoice.customer,
        description: `Invoice: ${invoice.description || "No description"}`,
        metadata: invoice.metadata,
        dueDate: invoice.due_date,
        paidAt:
          invoice.status === "paid" ? invoice.status_transitions.paid_at : null,
      });
    });

    // Sort by creation date (newest first)
    recentTransactions.sort((a, b) => b.created - a.created);

    // Apply pagination to recent transactions
    const paginatedTransactions = recentTransactions.slice(
      startIndex,
      startIndex + limit
    );

    // Pagination metadata
    const pagination = {
      current: {
        page,
        limit,
        total: recentTransactions.length,
        pages: Math.ceil(recentTransactions.length / limit),
      },
    };

    if (startIndex + limit < recentTransactions.length) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count: paginatedTransactions.length,
      total: recentTransactions.length,
      pagination,
      summary: {
        totalRevenue: totalRevenue / 100, // Convert from cents
        totalSubscriptionsRevenue: totalSubscriptionsRevenue / 100,
        totalInvoicesRevenue: totalInvoicesRevenue / 100,
        totalPayments: totalPayments.data.length,
        totalSubscriptions: totalSubscriptions.data.length,
        totalInvoices: totalInvoices.data.length,
        currency: "USD", // Default currency
      },
      data: paginatedTransactions,
    });
  } catch (err) {
    console.error("Error fetching Stripe transactions:", err);
    next(err);
  }
};

// Helper function to get inventory data for charts
exports.getInventoryChartData = async (companyId) => {
  try {
    // Get inventory categories and their counts
    const inventoryCategories = await Inventory.aggregate([
      { $match: { companyId: new mongoose.Types.ObjectId(companyId) } },
      { $group: { _id: "$category", count: { $sum: "$quantity" } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Format data for charts
    const labels = inventoryCategories.map(
      (item) => item._id || "Uncategorized"
    );
    const data = inventoryCategories.map((item) => item.count);

    // Generate random colors for chart
    const backgroundColors = labels.map(
      () =>
        `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(
          Math.random() * 255
        )}, ${Math.floor(Math.random() * 255)}, 0.2)`
    );

    const borderColors = backgroundColors.map((color) =>
      color.replace("0.2", "1")
    );

    return {
      labels,
      datasets: [
        {
          label: "Inventory Level",
          data,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1,
        },
      ],
    };
  } catch (error) {
    console.error("Error getting inventory chart data:", error);
    return {
      labels: ["Electronics", "Clothing", "Food", "Books", "Toys"],
      datasets: [
        {
          label: "Inventory Level",
          data: [300, 450, 200, 150, 350],
          backgroundColor: [
            "rgba(255, 99, 132, 0.2)",
            "rgba(54, 162, 235, 0.2)",
            "rgba(255, 206, 86, 0.2)",
            "rgba(75, 192, 192, 0.2)",
            "rgba(153, 102, 255, 0.2)",
          ],
          borderColor: [
            "rgba(255, 99, 132, 1)",
            "rgba(54, 162, 235, 1)",
            "rgba(255, 206, 86, 1)",
            "rgba(75, 192, 192, 1)",
            "rgba(153, 102, 255, 1)",
          ],
          borderWidth: 1,
        },
      ],
    };
  }
};

// Helper function to get sales and revenue data for charts
exports.getSalesAndRevenueData = async (companyId) => {
  try {
    // Get current date and date 6 months ago
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);

    // Get monthly sales data
    const monthlySales = await Inventory.aggregate([
      {
        $match: {
          companyId: new mongoose.Types.ObjectId(companyId),
          inventoryStatus: "sale",
          createdAt: { $gte: sixMonthsAgo, $lte: today },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 },
          revenue: { $sum: "$price.retail" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Format data for charts
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const labels = [];
    const salesData = [];
    const revenueData = [];

    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthYear = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      const monthName = months[d.getMonth()];

      labels.push(monthName);

      // Find data for this month
      console.log(monthlySales);
      const monthData = monthlySales.find((item) => item._id === monthYear);
      salesData.push(monthData ? monthData.count : 0);
      revenueData.push(monthData ? monthData.revenue : 0);
    }

    return {
      salesData: {
        labels,
        datasets: [
          {
            label: "Sales",
            data: salesData,
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 1,
          },
        ],
      },
      revenueData: {
        labels,
        datasets: [
          {
            label: "Revenue",
            data: revenueData,
            fill: false,
            backgroundColor: "rgba(54, 162, 235, 0.2)",
            borderColor: "rgba(54, 162, 235, 1)",
            tension: 0.1,
          },
        ],
      },
    };
  } catch (error) {
    console.error("Error getting sales and revenue data:", error);
    return {
      salesData: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [
          {
            label: "Sales",
            data: [12, 19, 3, 5, 2, 3],
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 1,
          },
        ],
      },
      revenueData: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [
          {
            label: "Revenue",
            data: [5000, 7000, 6000, 8000, 9000, 11000],
            fill: false,
            backgroundColor: "rgba(54, 162, 235, 0.2)",
            borderColor: "rgba(54, 162, 235, 1)",
            tension: 0.1,
          },
        ],
      },
    };
  }
};

// Helper function to get recent sales data for table
exports.getRecentSalesData = async (companyId) => {
  try {
    const recentSales = await Inventory.find({
      companyId: companyId,
      inventoryStatus: { $in: ["sale", "pending_sale"] },
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("_id", "name");

    return recentSales.map((sale) => ({
      id: sale._id,
      product: sale ? sale.name : "Unknown",
      customer: sale.customerName || "Unknown Customer",
      date: sale.createdAt.toISOString().split("T")[0],
      amount: sale.price.retail || 0,
      status: sale.inventoryStatus,
    }));
  } catch (error) {
    console.error("Error getting recent sales data:", error);
    return [
      {
        id: 1,
        product: "Laptop",
        customer: "John Doe",
        date: "2023-06-15",
        amount: 1200,
        status: "Completed",
      },
      {
        id: 2,
        product: "Smartphone",
        customer: "Jane Smith",
        date: "2023-06-14",
        amount: 800,
        status: "Completed",
      },
      {
        id: 3,
        product: "Headphones",
        customer: "Bob Johnson",
        date: "2023-06-13",
        amount: 150,
        status: "Pending",
      },
      {
        id: 4,
        product: "Monitor",
        customer: "Alice Brown",
        date: "2023-06-12",
        amount: 300,
        status: "Completed",
      },
      {
        id: 5,
        product: "Keyboard",
        customer: "Charlie Wilson",
        date: "2023-06-11",
        amount: 80,
        status: "Completed",
      },
    ];
  }
};

// Helper function to get low stock items for table
exports.getLowStockItems = async (companyId) => {
  try {
    const lowStock = await Inventory.find({
      companyId: companyId,
      $expr: { $lte: ["$quantity", "$threshold"] },
    })
      .sort({ quantity: 1 })
      .limit(5);

    return lowStock.map((item) => ({
      id: item._id,
      product: item.name,
      category: item.category || "Uncategorized",
      quantity: item.quantity,
      threshold: item.threshold,
    }));
  } catch (error) {
    console.error("Error getting low stock items:", error);
    return [
      {
        id: 1,
        product: "Wireless Mouse",
        category: "Electronics",
        quantity: 5,
        threshold: 10,
      },
      {
        id: 2,
        product: "T-Shirt (L)",
        category: "Clothing",
        quantity: 8,
        threshold: 15,
      },
      {
        id: 3,
        product: "Protein Bars",
        category: "Food",
        quantity: 3,
        threshold: 20,
      },
      {
        id: 4,
        product: "Notebooks",
        category: "Stationery",
        quantity: 7,
        threshold: 25,
      },
      {
        id: 5,
        product: "Action Figures",
        category: "Toys",
        quantity: 4,
        threshold: 10,
      },
    ];
  }
};

// @desc    Edit company details (without company name)
// @route   PUT /api/companies/edit-details
// @access  Private/Company Admin
exports.editCompanyDetails = async (req, res, next) => {
  try {
    // Only company admin can edit company details
    if (req.user.role !== "company_admin") {
      return next(
        new ErrorResponse("Only company admin can edit company details", 403)
      );
    }

    // Remove company name from request body to prevent changing it
    const { name, ...updateData } = req.body;

    // Additional restricted fields that cannot be changed
    const restrictedFields = [
      "planId",
      "planStartDate",
      "planEndDate",
      "isTrialPeriod",
      "trialEndDate",
      "stripeCustomerId",
      "isActive",
      "createdBy",
      "createdAt",
    ];

    restrictedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        delete updateData[field];
      }
    });

    // Update company details
    const company = await Company.findByIdAndUpdate(
      req.user.companyId,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!company) {
      return next(new ErrorResponse("Company not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Company details updated successfully",
      data: company,
    });
  } catch (err) {
    next(err);
  }
};
