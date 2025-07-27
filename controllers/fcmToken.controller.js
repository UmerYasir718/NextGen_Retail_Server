const User = require('../models/user.model');
const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Register FCM token for push notifications
 * @route   POST /api/users/fcm-token
 * @access  Private
 */
exports.registerFCMToken = asyncHandler(async (req, res, next) => {
  const { fcmToken, deviceId, deviceType, deviceModel } = req.body;
  const userId = req.user._id;

  // Validate required fields
  if (!fcmToken || !deviceId) {
    return next(new ErrorResponse('FCM token and device ID are required', 400));
  }

  // Update user with FCM token
  const user = await User.findByIdAndUpdate(
    userId,
    {
      fcmToken,
      deviceInfo: {
        deviceId,
        deviceType: deviceType || 'unknown',
        deviceModel: deviceModel || 'unknown',
        lastUpdated: Date.now()
      }
    },
    { new: true, runValidators: true }
  );

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      message: 'FCM token registered successfully'
    }
  });
});

/**
 * @desc    Update FCM token
 * @route   PUT /api/users/fcm-token
 * @access  Private
 */
exports.updateFCMToken = asyncHandler(async (req, res, next) => {
  const { fcmToken, deviceId } = req.body;
  const userId = req.user._id;

  // Validate required fields
  if (!fcmToken || !deviceId) {
    return next(new ErrorResponse('FCM token and device ID are required', 400));
  }

  // Update user with FCM token
  const user = await User.findOneAndUpdate(
    {
      _id: userId,
      'deviceInfo.deviceId': deviceId
    },
    {
      fcmToken,
      'deviceInfo.lastUpdated': Date.now()
    },
    { new: true, runValidators: true }
  );

  if (!user) {
    return next(new ErrorResponse('User or device not found', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      message: 'FCM token updated successfully'
    }
  });
});

/**
 * @desc    Delete FCM token
 * @route   DELETE /api/users/fcm-token
 * @access  Private
 */
exports.deleteFCMToken = asyncHandler(async (req, res, next) => {
  const { deviceId } = req.body;
  const userId = req.user._id;

  // Validate required fields
  if (!deviceId) {
    return next(new ErrorResponse('Device ID is required', 400));
  }

  // Remove FCM token
  const user = await User.findByIdAndUpdate(
    userId,
    {
      $unset: { fcmToken: 1 },
      'deviceInfo.deviceId': null,
      'deviceInfo.lastUpdated': Date.now()
    },
    { new: true }
  );

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      message: 'FCM token deleted successfully'
    }
  });
});

/**
 * @desc    Test push notification
 * @route   POST /api/notifications/mobile/test-push
 * @access  Private
 */
exports.testPushNotification = asyncHandler(async (req, res, next) => {
  const { title, body, data } = req.body;
  const userId = req.user._id;

  // Get user with FCM token
  const user = await User.findById(userId).select('fcmToken');

  if (!user || !user.fcmToken) {
    return next(new ErrorResponse('User has no registered FCM token', 400));
  }

  try {
    // Import Firebase notification utility
    const firebaseNotification = require('../utils/firebaseNotification');
    
    // Send test notification
    const result = await firebaseNotification.sendToUser(
      userId,
      {
        title: title || 'Test Notification',
        body: body || 'This is a test push notification'
      },
      data || { type: 'test', timestamp: Date.now().toString() }
    );

    if (!result.success) {
      return next(new ErrorResponse(`Failed to send push notification: ${result.error}`, 500));
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'Test push notification sent successfully',
        result
      }
    });
  } catch (error) {
    return next(new ErrorResponse(`Error sending push notification: ${error.message}`, 500));
  }
});
