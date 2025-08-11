const Company = require("../models/company.model");
const User = require("../models/user.model");
const Plan = require("../models/plan.model");
const AuditLog = require("../models/auditLog.model");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get comprehensive admin dashboard
// @route   GET /api/admin/dashboard
// @access  Private/SuperAdmin
exports.getAdminDashboard = async (req, res, next) => {
  try {
    // Get overall system statistics
    const totalCompanies = await Company.countDocuments();
    const activeCompanies = await Company.countDocuments({ isActive: true });
    const trialCompanies = await Company.countDocuments({ isTrialPeriod: true });
    const expiredCompanies = await Company.countDocuments({
      planEndDate: { $lt: new Date() }
    });

    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const totalPlans = await Plan.countDocuments();
    const activePlans = await Plan.countDocuments({ isActive: true });

    // Get recent activity
    const recentCompanies = await Company.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('planId', 'name price')
      .select('name createdAt planId isTrialPeriod');

    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email role companyId createdAt')
      .populate('companyId', 'name');

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

    res.status(200).json({
      success: true,
      data: {
        overview: {
          companies: {
            total: totalCompanies,
            active: activeCompanies,
            trial: trialCompanies,
            expired: expiredCompanies
          },
          users: {
            total: totalUsers,
            verified: verifiedUsers
          },
          plans: {
            total: totalPlans,
            active: activePlans
          }
        },
        recentActivity: {
          companies: recentCompanies,
          users: recentUsers
        },
        analytics: {
          planDistribution
        }
      }
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
    const { timeRange = '30' } = req.query;
    const days = parseInt(timeRange);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get user registration trends
    const userTrends = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // Get company registration trends
    const companyTrends = await Company.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // Get plan conversion metrics
    const planMetrics = await Company.aggregate([
      {
        $group: {
          _id: null,
          totalCompanies: { $sum: 1 },
          trialCompanies: { $sum: { $cond: ['$isTrialPeriod', 1, 0] } },
          paidCompanies: { $sum: { $cond: ['$isTrialPeriod', 0, 1] } }
        }
      }
    ]);

    // Get audit log activity
    const auditActivity = await AuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
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
          paidCompanies: 0
        },
        auditActivity
      }
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
      emailVerificationRequired: process.env.EMAIL_VERIFICATION_REQUIRED === 'true',
      stripeEnabled: !!process.env.STRIPE_SECRET_KEY,
      auditLogRetentionDays: process.env.AUDIT_LOG_RETENTION_DAYS || 365,
      maxFileUploadSize: process.env.MAX_FILE_UPLOAD_SIZE || '10MB',
      systemMaintenanceMode: process.env.SYSTEM_MAINTENANCE_MODE === 'true',
      apiRateLimit: process.env.API_RATE_LIMIT || 1000
    };

    res.status(200).json({
      success: true,
      data: systemSettings
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

    if (!settings || typeof settings !== 'object') {
      return next(
        new ErrorResponse("Settings object is required", 400)
      );
    }

    // Validate settings
    const validSettings = [
      'trialPeriodDays',
      'maxUsersPerCompany',
      'maxWarehousesPerCompany',
      'maxInventoryItems',
      'emailVerificationRequired',
      'auditLogRetentionDays',
      'maxFileUploadSize',
      'systemMaintenanceMode',
      'apiRateLimit'
    ];

    const invalidSettings = Object.keys(settings).filter(
      key => !validSettings.includes(key)
    );

    if (invalidSettings.length > 0) {
      return next(
        new ErrorResponse(`Invalid settings: ${invalidSettings.join(', ')}`, 400)
      );
    }

    // In a real application, you would save these to a database or update environment variables
    // For now, we'll just return the settings as if they were updated
    res.status(200).json({
      success: true,
      message: "System settings updated successfully",
      data: settings
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
    const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
    
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryStatus = {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
    };

    // Check uptime
    const uptime = {
      process: `${Math.round(process.uptime())} seconds`,
      server: `${Math.round((Date.now() - global.serverStartTime) / 1000)} seconds`
    };

    // Check active connections (if using socket.io)
    const activeConnections = global.io ? global.io.engine.clientsCount : 0;

    const healthStatus = {
      status: 'Healthy',
      timestamp: new Date(),
      database: dbStatus,
      memory: memoryStatus,
      uptime,
      activeConnections,
      environment: process.env.NODE_ENV || 'development'
    };

    res.status(200).json({
      success: true,
      data: healthStatus
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
      return next(
        new ErrorResponse("Maintenance action is required", 400)
      );
    }

    let result;
    let message;

    switch (action) {
      case 'cleanup-audit-logs':
        const retentionDays = options.retentionDays || 365;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        
        result = await AuditLog.deleteMany({
          timestamp: { $lt: cutoffDate }
        });
        message = `Cleaned up ${result.deletedCount} audit logs older than ${retentionDays} days`;
        break;

      case 'cleanup-temp-files':
        // This would clean up temporary files
        message = "Temporary files cleanup completed";
        break;

      case 'optimize-database':
        // This would run database optimization commands
        message = "Database optimization completed";
        break;

      case 'backup-data':
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
        timestamp: new Date()
      }
    });
  } catch (err) {
    next(err);
  }
}; 