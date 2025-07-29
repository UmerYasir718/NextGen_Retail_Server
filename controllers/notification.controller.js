const Notification = require("../models/notification.model");
const User = require("../models/user.model");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get all notifications for a user
// @route   GET /api/notifications
// @access  Private
exports.getUserNotifications = async (req, res, next) => {
  try {
    // Build query
    let query = {
      companyId: req.user.companyId,
      "recipients.userId": req.user.id,
    };

    // Filter by read status if provided
    if (req.query.read !== undefined) {
      const isRead = req.query.read === "true";
      query["recipients.$.read"] = isRead;
    }

    // Filter by priority if provided
    if (req.query.priority) {
      query.priority = req.query.priority;
    }

    // Filter by type if provided
    if (req.query.type) {
      query.type = req.query.type;
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Notification.countDocuments(query);

    // Execute query
    const notifications = await Notification.find(query)
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
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
      count: notifications.length,
      pagination,
      total,
      data: notifications,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all notifications (admin)
// @route   GET /api/notifications/all
// @access  Private/Admin
exports.getAllNotifications = async (req, res, next) => {
  try {
    // Build query
    let query = { companyId: req.user.companyId };

    // Filter by priority if provided
    if (req.query.priority) {
      query.priority = req.query.priority;
    }

    // Filter by type if provided
    if (req.query.type) {
      query.type = req.query.type;
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Notification.countDocuments(query);

    // Execute query
    const notifications = await Notification.find(query)
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
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
      count: notifications.length,
      pagination,
      total,
      data: notifications,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single notification
// @route   GET /api/notifications/:id
// @access  Private
exports.getNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
      "recipients.userId": req.user.id,
    });

    if (!notification) {
      return next(
        new ErrorResponse(
          `Notification not found with id of ${req.params.id}`,
          404
        )
      );
    }

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create notification
// @route   POST /api/notifications
// @access  Private/Admin
exports.createNotification = async (req, res, next) => {
  try {
    // Set company ID from authenticated user
    req.body.companyId = req.user.companyId;
    req.body.createdBy = req.user.id;

    // If recipients not provided, send to all users in company
    if (!req.body.recipients || req.body.recipients.length === 0) {
      const users = await User.find({ companyId: req.user.companyId }).select(
        "_id"
      );
      req.body.recipients = users.map((user) => ({
        userId: user._id,
        read: false,
      }));
    }

    // Create notification
    const notification = await Notification.create(req.body);

    res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
      "recipients.userId": req.user.id,
    });

    if (!notification) {
      return next(
        new ErrorResponse(
          `Notification not found with id of ${req.params.id}`,
          404
        )
      );
    }

    // Find recipient index
    const recipientIndex = notification.recipients.findIndex(
      (recipient) => recipient.userId.toString() === req.user.id.toString()
    );

    if (recipientIndex !== -1) {
      // Update read status
      notification.recipients[recipientIndex].read = true;
      notification.recipients[recipientIndex].readAt = Date.now();
      await notification.save();
    }

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      {
        companyId: req.user.companyId,
        "recipients.userId": req.user.id,
        "recipients.read": false,
      },
      {
        $set: {
          "recipients.$.read": true,
          "recipients.$.readAt": Date.now(),
        },
      }
    );

    res.status(200).json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private/Admin
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!notification) {
      return next(
        new ErrorResponse(
          `Notification not found with id of ${req.params.id}`,
          404
        )
      );
    }

    await notification.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      companyId: req.user.companyId,
      recipients: {
        $elemMatch: {
          userId: req.user.id,
          read: false,
        },
      },
    });

    res.status(200).json({
      success: true,
      data: {
        count,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get low inventory notifications
// @route   GET /api/notifications/low-inventory
// @access  Private
exports.getLowInventoryNotifications = async (req, res, next) => {
  try {
    // Build query for low inventory notifications
    let query = {
      companyId: req.user.companyId,
      type: "Stock",
      "recipients.userId": req.user.id,
    };

    // Filter by read status if provided
    if (req.query.read !== undefined) {
      const isRead = req.query.read === "true";
      query["recipients.$.read"] = isRead;
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Notification.countDocuments(query);

    // Execute query
    const notifications = await Notification.find(query)
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate("relatedTo.id", "name sku quantity threshold location");

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
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
      count: notifications.length,
      pagination,
      total,
      data: notifications,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get low inventory notification count
// @route   GET /api/notifications/low-inventory/count
// @access  Private
exports.getLowInventoryCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      companyId: req.user.companyId,
      type: "Stock",
      recipients: {
        $elemMatch: {
          userId: req.user.id,
          read: false,
        },
      },
    });

    res.status(200).json({
      success: true,
      data: {
        count,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark low inventory notification as read
// @route   PUT /api/notifications/low-inventory/:id/read
// @access  Private
exports.markLowInventoryAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
      type: "Stock",
      "recipients.userId": req.user.id,
    });

    if (!notification) {
      return next(
        new ErrorResponse(
          `Low inventory notification not found with id of ${req.params.id}`,
          404
        )
      );
    }

    // Find recipient index
    const recipientIndex = notification.recipients.findIndex(
      (recipient) => recipient.userId.toString() === req.user.id.toString()
    );

    if (recipientIndex !== -1) {
      // Update read status
      notification.recipients[recipientIndex].read = true;
      notification.recipients[recipientIndex].readAt = Date.now();
      await notification.save();
    }

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark all low inventory notifications as read
// @route   PUT /api/notifications/low-inventory/read-all
// @access  Private
exports.markAllLowInventoryAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      {
        companyId: req.user.companyId,
        type: "Stock",
        "recipients.userId": req.user.id,
        "recipients.read": false,
      },
      {
        $set: {
          "recipients.$.read": true,
          "recipients.$.readAt": Date.now(),
        },
      }
    );

    res.status(200).json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get low inventory items (for dashboard)
// @route   GET /api/notifications/low-inventory/items
// @access  Private
exports.getLowInventoryItems = async (req, res, next) => {
  try {
    const Inventory = require("../models/inventory.model");

    // Get low inventory items
    const lowInventoryItems = await Inventory.find({
      companyId: req.user.companyId,
      $expr: { $lte: ["$quantity", "$threshold"] },
    })
      .select("name sku quantity threshold location status lowStockAlertSent")
      .populate("location.warehouseId", "name")
      .populate("location.zoneId", "name")
      .populate("location.shelfId", "name")
      .populate("location.binId", "name")
      .sort({ quantity: 1 })
      .limit(parseInt(req.query.limit) || 20);

    res.status(200).json({
      success: true,
      count: lowInventoryItems.length,
      data: lowInventoryItems,
    });
  } catch (err) {
    next(err);
  }
};
