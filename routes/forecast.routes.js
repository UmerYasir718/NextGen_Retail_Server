const express = require("express");
const {
  getForecasts,
  getForecast,
  createForecast,
  updateForecast,
  deleteForecast,
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

module.exports = router;
