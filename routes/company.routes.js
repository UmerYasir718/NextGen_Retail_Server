const express = require("express");
const {
  getCompanies,
  getCompany,
  updateCompany,
  deleteCompany,
  getDashboardStats,
  getCompanyPlan,
  editCompanyDetails,
  getCompanyStats,
  approveCompanySubscription,
  getStripeTransactions,
  getAdminOverview,
  bulkCompanyOperations,
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
router.route("/stats").get(authorize("super_admin"), getCompanyStats);
router
  .route("/stripe/transactions")
  .get(authorize("super_admin"), getStripeTransactions);
router.route("/admin/overview").get(authorize("super_admin"), getAdminOverview);
router.route("/bulk-operations").post(authorize("super_admin"), bulkCompanyOperations);

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

// Company plan details route
router
  .route("/plan")
  .get(authorize("super_admin", "company_admin"), getCompanyPlan);

// Edit company details route (without company name)
router
  .route("/edit-details")
  .put(authorize("company_admin"), editCompanyDetails);

// Company subscription approval (SuperAdmin only)
router
  .route("/:id/approve-subscription")
  .post(authorize("super_admin"), approveCompanySubscription);

module.exports = router;
