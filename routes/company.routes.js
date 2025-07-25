const express = require("express");
const {
  getCompanies,
  getCompany,
  updateCompany,
  deleteCompany,
  getDashboardStats,
} = require("../controllers/company.controller");

const router = express.Router();

// Import middleware
const {
  protect,
  authorize,
  companyScope,
} = require("../middlewares/auth.middleware");

// Apply protection to all routes
router.use(protect);

// SuperAdmin only routes
router.route("/").get(authorize("super_admin"), getCompanies);

router.route("/:id").delete(authorize("super_admin"), deleteCompany);

// SuperAdmin or company_admin (own company) routes
router
  .route("/:id")
  .get(companyScope, authorize("super_admin", "company_admin"), getCompany)
  .put(companyScope, authorize("super_admin", "company_admin"), updateCompany);

// Dashboard stats route
router
  .route("/dashboard/stats")
  .get(authorize("super_admin", "company_admin"), getDashboardStats);

module.exports = router;
