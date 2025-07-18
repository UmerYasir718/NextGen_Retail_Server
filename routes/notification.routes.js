const express = require("express");
const {
  getUserNotifications,
  getAllNotifications,
  getNotification,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} = require("../controllers/notification.controller");

const router = express.Router();

// Import middleware
const {
  protect,
  authorize,
  companyScope,
} = require("../middlewares/auth.middleware");

// Apply protection to all routes
router.use(protect);
router.use(companyScope);

// Notification routes
router
  .route("/")
  .get(getUserNotifications)
  .post(authorize("company_admin", "super_admin"), createNotification);

router
  .route("/all")
  .get(authorize("company_admin", "super_admin"), getAllNotifications);

router.route("/read-all").put(markAllAsRead);

router.route("/unread-count").get(getUnreadCount);

router
  .route("/:id")
  .get(getNotification)
  .delete(authorize("company_admin", "super_admin"), deleteNotification);

router.route("/:id/read").put(markAsRead);

module.exports = router;
