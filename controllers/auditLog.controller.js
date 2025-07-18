const AuditLog = require('../models/auditLog.model');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/user.model');

// @desc    Get all audit logs
// @route   GET /api/audit-logs
// @access  Private/Admin
exports.getAuditLogs = async (req, res, next) => {
  try {
    // Build query
    let query = { companyId: req.user.companyId };

    // Filter by user if provided
    if (req.query.userId) {
      query.userId = req.query.userId;
    }

    // Filter by action type if provided
    if (req.query.actionType) {
      query.actionType = req.query.actionType;
    }

    // Filter by entity type if provided
    if (req.query.entityType) {
      query.entityType = req.query.entityType;
    }

    // Filter by entity ID if provided
    if (req.query.entityId) {
      query.entityId = req.query.entityId;
    }

    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      query.timestamp = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      query.timestamp = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      query.timestamp = { $lte: new Date(req.query.endDate) };
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await AuditLog.countDocuments(query);

    // Execute query
    const auditLogs = await AuditLog.find(query)
      .populate('userId', 'name email role')
      .skip(startIndex)
      .limit(limit)
      .sort({ timestamp: -1 });

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: auditLogs.length,
      pagination,
      total,
      data: auditLogs
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single audit log
// @route   GET /api/audit-logs/:id
// @access  Private/Admin
exports.getAuditLog = async (req, res, next) => {
  try {
    const auditLog = await AuditLog.findOne({
      _id: req.params.id,
      companyId: req.user.companyId
    }).populate('userId', 'name email role');

    if (!auditLog) {
      return next(
        new ErrorResponse(`Audit log not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: auditLog
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create audit log
// @route   POST /api/audit-logs
// @access  Private
exports.createAuditLog = async (req, res, next) => {
  try {
    // Set company ID and user ID from authenticated user
    req.body.companyId = req.user.companyId;
    req.body.userId = req.user.id;

    // Create audit log
    const auditLog = await AuditLog.create(req.body);

    res.status(201).json({
      success: true,
      data: auditLog
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get audit log statistics
// @route   GET /api/audit-logs/stats
// @access  Private/Admin
exports.getAuditLogStats = async (req, res, next) => {
  try {
    // Set time range (default to last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (req.query.days || 30));

    // Get total count
    const totalCount = await AuditLog.countDocuments({
      companyId: req.user.companyId,
      timestamp: { $gte: startDate, $lte: endDate }
    });

    // Get counts by action type
    const actionTypeCounts = await AuditLog.aggregate([
      {
        $match: {
          companyId: req.user.companyId,
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$actionType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get counts by entity type
    const entityTypeCounts = await AuditLog.aggregate([
      {
        $match: {
          companyId: req.user.companyId,
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$entityType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get counts by user
    const userCounts = await AuditLog.aggregate([
      {
        $match: {
          companyId: req.user.companyId,
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Get user details
    const userIds = userCounts.map(item => item._id);
    const users = await User.find({ _id: { $in: userIds } }).select('name email role');

    // Map user details to counts
    const userActivityCounts = userCounts.map(item => {
      const user = users.find(u => u._id.toString() === item._id.toString());
      return {
        userId: item._id,
        name: user ? user.name : 'Unknown',
        email: user ? user.email : 'Unknown',
        role: user ? user.role : 'Unknown',
        count: item.count
      };
    });

    // Get daily activity counts
    const dailyActivity = await AuditLog.aggregate([
      {
        $match: {
          companyId: req.user.companyId,
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalCount,
        actionTypeCounts,
        entityTypeCounts,
        userActivityCounts,
        dailyActivity
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete old audit logs
// @route   DELETE /api/audit-logs/cleanup
// @access  Private/SuperAdmin
exports.cleanupAuditLogs = async (req, res, next) => {
  try {
    const { olderThanDays } = req.body;
    
    if (!olderThanDays || olderThanDays < 30) {
      return next(
        new ErrorResponse('Please provide a valid number of days (minimum 30)', 400)
      );
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await AuditLog.deleteMany({
      companyId: req.user.companyId,
      timestamp: { $lt: cutoffDate }
    });

    res.status(200).json({
      success: true,
      data: {
        deletedCount: result.deletedCount
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get inventory location audit logs
// @route   GET /api/audit-logs/inventory-location
// @access  Private/Admin
exports.getInventoryLocationAuditLogs = async (req, res, next) => {
  try {
    // Build query
    let query = { 
      companyId: req.user.companyId,
      module: 'Inventory',
      'details.previousLocation': { $exists: true },
      'details.currentLocation': { $exists: true }
    };

    // Filter by inventory ID if provided
    if (req.query.inventoryId) {
      query['details.inventoryId'] = req.query.inventoryId;
    }

    // Filter by user if provided
    if (req.query.userId) {
      query.userId = req.query.userId;
    }

    // Filter by warehouse if provided
    if (req.query.warehouseId) {
      query.$or = [
        { 'details.previousLocation.warehouseId': req.query.warehouseId },
        { 'details.currentLocation.warehouseId': req.query.warehouseId }
      ];
    }

    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      query.timestamp = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      query.timestamp = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      query.timestamp = { $lte: new Date(req.query.endDate) };
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await AuditLog.countDocuments(query);

    // Execute query
    const auditLogs = await AuditLog.find(query)
      .populate('userId', 'name email role')
      .skip(startIndex)
      .limit(limit)
      .sort({ timestamp: -1 });

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: auditLogs.length,
      pagination,
      total,
      data: auditLogs
    });
  } catch (err) {
    next(err);
  }
};
