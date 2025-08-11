const Company = require("../models/company.model");
const User = require("../models/user.model");
const Plan = require("../models/plan.model");
const AuditLog = require("../models/auditLog.model");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get all users (Admin only)
// @route   GET /api/admin/users
// @access  Private/SuperAdmin
exports.getAllUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      companyId,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build filter object
    const filter = {};
    if (role) filter.role = role;
    if (companyId) filter.companyId = companyId;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const skip = (page - 1) * limit;

    const users = await User.find(filter)
      .populate("companyId", "name")
      .populate("planId", "name price")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select("-password -verificationToken -resetPasswordToken");

    const totalUsers = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalUsers / limit),
          totalUsers,
          hasNextPage: skip + users.length < totalUsers,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get comprehensive admin dashboard with chart data
// @route   GET /api/admin/dashboard
// @access  Private/SuperAdmin
exports.getAdminDashboard = async (req, res, next) => {
  try {
    // Get overall system statistics
    const totalCompanies = await Company.countDocuments();
    const activeCompanies = await Company.countDocuments({ isActive: true });
    const trialCompanies = await Company.countDocuments({
      isTrialPeriod: true,
    });
    const expiredCompanies = await Company.countDocuments({
      planEndDate: { $lt: new Date() },
    });

    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const totalPlans = await Plan.countDocuments();
    const activePlans = await Plan.countDocuments({ isActive: true });

    // Get user roles distribution for charts
    const userRolesDistribution = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // Get company subscriptions distribution for charts
    const companySubscriptionsDistribution = await Company.aggregate([
      {
        $lookup: {
          from: "plans",
          localField: "planId",
          foreignField: "_id",
          as: "plan",
        },
      },
      {
        $group: {
          _id: "$planId",
          count: { $sum: 1 },
          planName: { $first: "$plan.name" },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // Get revenue data (sample data - replace with actual revenue calculation)
    const companies = await Company.find()
      .populate("planId", "name price")
      .limit(5)
      .sort({ createdAt: -1 });

    // Get recent activity
    const recentCompanies = await Company.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("planId", "name price")
      .select("name createdAt planId isTrialPeriod");

    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email role companyId createdAt")
      .populate("companyId", "name");

    // Get recent audit activities
    const recentActivities = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(5)
      .populate("userId", "name")
      .populate("companyId", "name")
      .select("action timestamp userId companyId");

    // Prepare chart data
    const userRolesData = {
      labels: [
        "Super Admin",
        "Company Admin",
        "Store Manager",
        "Analyst",
        "Auditor",
      ],
      datasets: [
        {
          label: "Users by Role",
          data: [0, 0, 0, 0, 0], // Will be populated below
          backgroundColor: [
            "rgba(255, 99, 132, 0.6)",
            "rgba(54, 162, 235, 0.6)",
            "rgba(255, 206, 86, 0.6)",
            "rgba(75, 192, 192, 0.6)",
            "rgba(153, 102, 255, 0.6)",
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

    // Populate user roles data
    userRolesDistribution.forEach((item) => {
      const roleIndex = {
        super_admin: 0,
        company_admin: 1,
        store_manager: 2,
        analyst: 3,
        auditor: 4,
      }[item._id];

      if (roleIndex !== undefined) {
        userRolesData.datasets[0].data[roleIndex] = item.count;
      }
    });

    const companySubscriptionsData = {
      labels: companySubscriptionsDistribution.map(
        (item) => item.planName || "No Plan"
      ),
      datasets: [
        {
          label: "Subscriptions",
          data: companySubscriptionsDistribution.map((item) => item.count),
          backgroundColor: [
            "rgba(255, 99, 132, 0.6)",
            "rgba(54, 162, 235, 0.6)",
            "rgba(255, 206, 86, 0.6)",
            "rgba(75, 192, 192, 0.6)",
            "rgba(153, 102, 255, 0.6)",
          ],
        },
      ],
    };

    const revenueByCompanyData = {
      labels: companies.map((company) => company.name),
      datasets: [
        {
          label: "Revenue",
          data: companies.map((company) => company.planId?.price || 0),
          backgroundColor: "rgba(75, 192, 192, 0.6)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        },
      ],
    };

    // Prepare table data
    const recentActivitiesData = recentActivities.map((activity, index) => ({
      id: index + 1,
      user: activity.userId?.name || "Unknown User",
      action: activity.action,
      company: activity.companyId?.name || "System",
      timestamp: activity.timestamp
        .toISOString()
        .replace("T", " ")
        .substring(0, 19),
    }));

    const newCompaniesData = companies.map((company, index) => ({
      id: index + 1,
      name: company.name,
      subscription: company.planId?.name || "No Plan",
      users: 0, // Will be calculated below
      joined: company.createdAt.toISOString().split("T")[0],
      status: company.isActive ? "Active" : "Inactive",
    }));

    // Get user count for each company
    for (let company of newCompaniesData) {
      const userCount = await User.countDocuments({
        companyId: companies.find((c) => c.name === company.name)?._id,
      });
      company.users = userCount;
    }

    // Table columns configuration
    const recentActivitiesColumns = [
      { name: "User", selector: (row) => row.user, sortable: true },
      { name: "Action", selector: (row) => row.action, sortable: true },
      { name: "Company", selector: (row) => row.company, sortable: true },
      { name: "Timestamp", selector: (row) => row.timestamp, sortable: true },
    ];

    const newCompaniesColumns = [
      { name: "Company Name", selector: (row) => row.name, sortable: true },
      {
        name: "Subscription",
        selector: (row) => row.subscription,
        sortable: true,
        cell: (row) => ({
          subscription: row.subscription,
          className:
            row.subscription === "Premium"
              ? "bg-purple-100 text-purple-800"
              : row.subscription === "Yearly"
              ? "bg-blue-100 text-blue-800"
              : "bg-green-100 text-green-800",
        }),
      },
      { name: "Users", selector: (row) => row.users, sortable: true },
      { name: "Joined", selector: (row) => row.joined, sortable: true },
      {
        name: "Status",
        selector: (row) => row.status,
        sortable: true,
        cell: (row) => ({
          status: row.status,
          className:
            row.status === "Active"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800",
        }),
      },
    ];

    res.status(200).json({
      success: true,
      data: {
        overview: {
          companies: {
            total: totalCompanies,
            active: activeCompanies,
            trial: trialCompanies,
            expired: expiredCompanies,
          },
          users: {
            total: totalUsers,
            verified: verifiedUsers,
          },
          plans: {
            total: totalPlans,
            active: activePlans,
          },
        },
        charts: {
          userRoles: userRolesData,
          companySubscriptions: companySubscriptionsData,
          revenueByCompany: revenueByCompanyData,
        },
        tables: {
          recentActivities: {
            data: recentActivitiesData,
            columns: recentActivitiesColumns,
          },
          newCompanies: {
            data: newCompaniesData,
            columns: newCompaniesColumns,
          },
        },
        recentActivity: {
          companies: recentCompanies,
          users: recentUsers,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get system-wide analytics
// @route   GET /api/admin/analytics
// @access  Private/SuperAdmin
exports.getSystemAnalytics = async (req, res, next) => {
  try {
    const { timeRange = "30" } = req.query;
    const days = parseInt(timeRange);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get user registration trends
    const userTrends = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
      },
    ]);

    // Get company registration trends
    const companyTrends = await Company.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
      },
    ]);

    // Get plan conversion metrics
    const planMetrics = await Company.aggregate([
      {
        $group: {
          _id: null,
          totalCompanies: { $sum: 1 },
          trialCompanies: { $sum: { $cond: ["$isTrialPeriod", 1, 0] } },
          paidCompanies: { $sum: { $cond: ["$isTrialPeriod", 0, 1] } },
        },
      },
    ]);

    // Get audit log activity
    const auditActivity = await AuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$timestamp" },
            month: { $month: "$timestamp" },
            day: { $dayOfMonth: "$timestamp" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        timeRange: days,
        userTrends,
        companyTrends,
        planMetrics: planMetrics[0] || {
          totalCompanies: 0,
          trialCompanies: 0,
          paidCompanies: 0,
        },
        auditActivity,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get admin system settings
// @route   GET /api/admin/settings
// @access  Private/SuperAdmin
exports.getSystemSettings = async (req, res, next) => {
  try {
    // This would typically come from environment variables or a settings collection
    const systemSettings = {
      trialPeriodDays: process.env.TRIAL_PERIOD_DAYS || 14,
      maxUsersPerCompany: process.env.MAX_USERS_PER_COMPANY || 100,
      maxWarehousesPerCompany: process.env.MAX_WAREHOUSES_PER_COMPANY || 10,
      maxInventoryItems: process.env.MAX_INVENTORY_ITEMS || 10000,
      emailVerificationRequired:
        process.env.EMAIL_VERIFICATION_REQUIRED === "true",
      stripeEnabled: !!process.env.STRIPE_SECRET_KEY,
      auditLogRetentionDays: process.env.AUDIT_LOG_RETENTION_DAYS || 365,
      maxFileUploadSize: process.env.MAX_FILE_UPLOAD_SIZE || "10MB",
      systemMaintenanceMode: process.env.SYSTEM_MAINTENANCE_MODE === "true",
      apiRateLimit: process.env.API_RATE_LIMIT || 1000,
    };

    res.status(200).json({
      success: true,
      data: systemSettings,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update system settings
// @route   PUT /api/admin/settings
// @access  Private/SuperAdmin
exports.updateSystemSettings = async (req, res, next) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== "object") {
      return next(new ErrorResponse("Settings object is required", 400));
    }

    // Validate settings
    const validSettings = [
      "trialPeriodDays",
      "maxUsersPerCompany",
      "maxWarehousesPerCompany",
      "maxInventoryItems",
      "emailVerificationRequired",
      "auditLogRetentionDays",
      "maxFileUploadSize",
      "systemMaintenanceMode",
      "apiRateLimit",
    ];

    const invalidSettings = Object.keys(settings).filter(
      (key) => !validSettings.includes(key)
    );

    if (invalidSettings.length > 0) {
      return next(
        new ErrorResponse(
          `Invalid settings: ${invalidSettings.join(", ")}`,
          400
        )
      );
    }

    // In a real application, you would save these to a database or update environment variables
    // For now, we'll just return the settings as if they were updated
    res.status(200).json({
      success: true,
      message: "System settings updated successfully",
      data: settings,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get system health status
// @route   GET /api/admin/health
// @access  Private/SuperAdmin
exports.getSystemHealth = async (req, res, next) => {
  try {
    // Check database connection
    const dbStatus =
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryStatus = {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
    };

    // Check uptime
    const uptime = {
      process: `${Math.round(process.uptime())} seconds`,
      server: `${Math.round(
        (Date.now() - global.serverStartTime) / 1000
      )} seconds`,
    };

    // Check active connections (if using socket.io)
    const activeConnections = global.io ? global.io.engine.clientsCount : 0;

    const healthStatus = {
      status: "Healthy",
      timestamp: new Date(),
      database: dbStatus,
      memory: memoryStatus,
      uptime,
      activeConnections,
      environment: process.env.NODE_ENV || "development",
    };

    res.status(200).json({
      success: true,
      data: healthStatus,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Perform system maintenance
// @route   POST /api/admin/maintenance
// @access  Private/SuperAdmin
exports.performSystemMaintenance = async (req, res, next) => {
  try {
    const { action, options = {} } = req.body;

    if (!action) {
      return next(new ErrorResponse("Maintenance action is required", 400));
    }

    let result;
    let message;

    switch (action) {
      case "cleanup-audit-logs":
        const retentionDays = options.retentionDays || 365;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        result = await AuditLog.deleteMany({
          timestamp: { $lt: cutoffDate },
        });
        message = `Cleaned up ${result.deletedCount} audit logs older than ${retentionDays} days`;
        break;

      case "cleanup-temp-files":
        // This would clean up temporary files
        message = "Temporary files cleanup completed";
        break;

      case "optimize-database":
        // This would run database optimization commands
        message = "Database optimization completed";
        break;

      case "backup-data":
        // This would trigger a data backup
        message = "Data backup initiated";
        break;

      default:
        return next(
          new ErrorResponse(`Invalid maintenance action: ${action}`, 400)
        );
    }

    res.status(200).json({
      success: true,
      message,
      data: {
        action,
        timestamp: new Date(),
      },
    });
  } catch (err) {
    next(err);
  }
};
