const express = require("express");
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
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

router
  .route("/:id")
  .get(authorize("company_admin", "super_admin"), getUser)
  .put(authorize("company_admin", "super_admin"), updateUser)
  .delete(authorize("company_admin", "super_admin"), deleteUser);

module.exports = router;
