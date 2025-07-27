const express = require('express');
const {
  registerFCMToken,
  updateFCMToken,
  deleteFCMToken,
  testPushNotification
} = require('../controllers/fcmToken.controller');

const router = express.Router();

// Import middleware
const { protect } = require('../middlewares/auth');

// Apply protection to all routes
router.use(protect);

// FCM token routes
router.route('/fcm-token')
  .post(registerFCMToken)
  .put(updateFCMToken)
  .delete(deleteFCMToken);

// Test push notification route
router.route('/notifications/mobile/test-push')
  .post(testPushNotification);

module.exports = router;
