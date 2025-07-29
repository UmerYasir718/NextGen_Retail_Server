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
  getLowInventoryNotifications,
  getLowInventoryCount,
  markLowInventoryAsRead,
  markAllLowInventoryAsRead,
  getLowInventoryItems,
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

// Low inventory notification routes
router.route("/low-inventory").get(getLowInventoryNotifications);
router.route("/low-inventory/count").get(getLowInventoryCount);
router.route("/low-inventory/read-all").put(markAllLowInventoryAsRead);
router.route("/low-inventory/items").get(getLowInventoryItems);

router
  .route("/:id")
  .get(getNotification)
  .delete(authorize("company_admin", "super_admin"), deleteNotification);

router.route("/:id/read").put(markAsRead);
router.route("/low-inventory/:id/read").put(markLowInventoryAsRead);

module.exports = router;
