const express = require("express");
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  editUserDetails,
  getUserAnalytics,
  bulkUserOperations,
} = require("../controllers/user.controller");

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

// company_admin and super_admin only routes
router
  .route("/")
  .get(authorize("company_admin", "super_admin"), getUsers)
  .post(authorize("company_admin", "super_admin"), createUser);

// Admin analytics and bulk operations
router.route("/analytics").get(authorize("company_admin", "super_admin"), getUserAnalytics);
router.route("/bulk-operations").post(authorize("company_admin", "super_admin"), bulkUserOperations);

router
  .route("/:id")
  .get(authorize("company_admin", "super_admin"), getUser)
  .put(authorize("company_admin", "super_admin"), updateUser)
  .delete(authorize("company_admin", "super_admin"), deleteUser);

// Edit user details route (without email permission)
router.route("/edit-details").put(editUserDetails);

module.exports = router;
