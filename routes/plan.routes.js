const express = require('express');
const {
  getPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
  assignPlanToCompany,
  createCheckoutSession,
  stripeWebhook
} = require('../controllers/plan.controller');

const router = express.Router();

// Import middleware
const { protect, authorize } = require('../middlewares/auth.middleware');

// Public webhook route
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// Protected routes
router.use(protect);

// Routes accessible to all authenticated users
router.get('/', getPlans);
router.get('/:id', getPlan);

// Admin only routes
router.post('/:id/checkout', authorize('Admin'), createCheckoutSession);

// SuperAdmin only routes
router.post('/', authorize('SuperAdmin'), createPlan);
router.put('/:id', authorize('SuperAdmin'), updatePlan);
router.delete('/:id', authorize('SuperAdmin'), deletePlan);
router.post('/:id/assign/:companyId', authorize('SuperAdmin'), assignPlanToCompany);

module.exports = router;
