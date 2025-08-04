const express = require("express");
const {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  resetPasswordWithToken,
  updatePassword,
  changePassword,
  logout,
  verifyEmail,
  verifyEmailToken,
  resendVerification,
  superAdminLogin,
  selectCompany,
} = require("../controllers/auth.controller");

const router = express.Router();

// Import middleware
const { protect, authorize } = require("../middlewares/auth.middleware");

// Public routes
router.post("/register", register);
router.post("/login", login);
router.get("/verify-email/:token", verifyEmail);
router.post("/verify-email-token", verifyEmailToken);
router.post("/resend-verification", resendVerification);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:token", resetPassword);
router.post("/reset-password", resetPasswordWithToken);
router.post("/superadmin/login", superAdminLogin);

// Protected routes
router.get("/me", protect, getMe);
router.put("/update-password", protect, updatePassword);
router.put("/change-password", protect, changePassword);
router.get("/logout", protect, logout);
router.post(
  "/superadmin/select-company/:companyId",
  protect,
  authorize("super_admin"),
  selectCompany
);

module.exports = router;
