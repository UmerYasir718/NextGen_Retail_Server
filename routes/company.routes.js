const express = require('express');
const {
  getCompanies,
  getCompany,
  updateCompany,
  deleteCompany,
  getDashboardStats
} = require('../controllers/company.controller');

const router = express.Router();

// Import middleware
const { protect, authorize, companyScope } = require('../middlewares/auth.middleware');

// Apply protection to all routes
router.use(protect);

// SuperAdmin only routes
router.route('/')
  .get(authorize('SuperAdmin'), getCompanies);

router.route('/:id')
  .delete(authorize('SuperAdmin'), deleteCompany);

// SuperAdmin or Admin (own company) routes
router.route('/:id')
  .get(companyScope, authorize('SuperAdmin', 'Admin'), getCompany)
  .put(companyScope, authorize('SuperAdmin', 'Admin'), updateCompany);

// Dashboard stats route
router.route('/dashboard/stats')
  .get(authorize('SuperAdmin', 'Admin'), getDashboardStats);

module.exports = router;
