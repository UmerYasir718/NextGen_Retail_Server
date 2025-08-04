const express = require("express");
const {
  getPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
  assignPlanToCompany,
  createCheckoutSession,
  stripeWebhook,
  manualPlanUpdate,
} = require("../controllers/plan.controller");

const router = express.Router();

// Import middleware
const { protect, authorize } = require("../middlewares/auth.middleware");

// Public webhook route
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

// Protected routes
router.use(protect);

// Routes accessible to all authenticated users
router.get("/", getPlans);
router.get("/:id", getPlan);

// Admin only routes
router.post("/checkout", authorize("company_admin"), createCheckoutSession);

// super_admin only routes
router.post("/", authorize("super_admin"), createPlan);
router.put("/:id", authorize("super_admin"), updatePlan);
router.delete("/:id", authorize("super_admin"), deletePlan);
router.post(
  "/:id/assign/:companyId",
  authorize("super_admin"),
  assignPlanToCompany
);
router.post("/manual-update", authorize("super_admin"), manualPlanUpdate);

module.exports = router;
