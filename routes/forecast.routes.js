const express = require("express");
const {
  getForecasts,
  getForecast,
  createForecast,
  updateForecast,
  deleteForecast,
  getForecastsByCompany,
  getForecastAnalytics,
} = require("../controllers/forecast.controller");

const router = express.Router();

// Import auth middleware
const { protect } = require("../middlewares/auth");

// Apply auth middleware to all routes
router.use(protect);

// Routes
router.route("/").get(getForecasts).post(createForecast);
router
  .route("/:id")
  .get(getForecast)
  .put(updateForecast)
  .delete(deleteForecast);

// Company-specific forecast routes
router.route("/company/:companyId").get(getForecastsByCompany);
router.route("/analytics/:companyId").get(getForecastAnalytics);

module.exports = router;
