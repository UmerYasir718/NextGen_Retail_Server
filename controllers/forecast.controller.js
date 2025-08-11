const Forecast = require("../models/forecast.model");
const asyncHandler = require("../middlewares/async");
const ErrorResponse = require("../utils/errorResponse");

/**
 * @desc    Get forecasts with date range filter
 * @route   GET /api/forecasts
 * @access  Private
 */
exports.getForecasts = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  // Validate required date parameters
  if (!startDate || !endDate) {
    return next(
      new ErrorResponse("Start date and end date are required parameters", 400)
    );
  }

  // Validate date format
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return next(
      new ErrorResponse("Invalid date format. Use YYYY-MM-DD format", 400)
    );
  }

  // Validate date range
  if (start >= end) {
    return next(new ErrorResponse("Start date must be before end date", 400));
  }

  // Build query
  const query = {
    companyId: req.user.companyId,
    createdAt: {
      $gte: start,
      $lte: end,
    },
  };

  // Add status filter if provided
  if (req.query.status) {
    query.status = req.query.status;
  }

  // Add model filter if provided
  if (req.query.model) {
    query.model = req.query.model;
  }

  // Execute query with pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const forecasts = await Forecast.find(query)
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit)
    .populate("createdBy", "name email");

  const total = await Forecast.countDocuments(query);

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit,
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit,
    };
  }

  res.status(200).json({
    success: true,
    count: forecasts.length,
    pagination,
    data: forecasts,
  });
});

/**
 * @desc    Get single forecast
 * @route   GET /api/forecasts/:id
 * @access  Private
 */
exports.getForecast = asyncHandler(async (req, res, next) => {
  const forecast = await Forecast.findById(req.params.id)
    .populate("createdBy", "name email")
    .populate("companyId", "name");

  if (!forecast) {
    return next(
      new ErrorResponse(`Forecast not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if forecast belongs to user's company
  if (forecast.companyId.toString() !== req.user.companyId.toString()) {
    return next(
      new ErrorResponse("Not authorized to access this forecast", 401)
    );
  }

  res.status(200).json({
    success: true,
    data: forecast,
  });
});

/**
 * @desc    Create new forecast
 * @route   POST /api/forecasts
 * @access  Private
 */
exports.createForecast = asyncHandler(async (req, res, next) => {
  // Add company ID and user ID to request body
  req.body.companyId = req.user.companyId;
  req.body.createdBy = req.user.id;

  const forecast = await Forecast.create(req.body);

  res.status(201).json({
    success: true,
    data: forecast,
  });
});

/**
 * @desc    Update forecast
 * @route   PUT /api/forecasts/:id
 * @access  Private
 */
exports.updateForecast = asyncHandler(async (req, res, next) => {
  let forecast = await Forecast.findById(req.params.id);

  if (!forecast) {
    return next(
      new ErrorResponse(`Forecast not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if forecast belongs to user's company
  if (forecast.companyId.toString() !== req.user.companyId.toString()) {
    return next(
      new ErrorResponse("Not authorized to update this forecast", 401)
    );
  }

  forecast = await Forecast.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: forecast,
  });
});

/**
 * @desc    Delete forecast
 * @route   DELETE /api/forecasts/:id
 * @access  Private
 */
exports.deleteForecast = asyncHandler(async (req, res, next) => {
  const forecast = await Forecast.findById(req.params.id);

  if (!forecast) {
    return next(
      new ErrorResponse(`Forecast not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if forecast belongs to user's company
  if (forecast.companyId.toString() !== req.user.companyId.toString()) {
    return next(
      new ErrorResponse("Not authorized to delete this forecast", 401)
    );
  }

  await forecast.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});

/**
 * @desc    Get forecasts by company ID with comprehensive data
 * @route   GET /api/forecast/company/:companyId
 * @access  Private
 */
exports.getForecastsByCompany = asyncHandler(async (req, res, next) => {
  const { companyId } = req.params;
  const { model, status, limit = 10 } = req.query;

  // Build query
  const query = { companyId };

  // Add filters if provided
  if (model) {
    query.model = { $regex: model, $options: "i" };
  }

  if (status) {
    query.status = status;
  }

  // Execute query with sorting by creation date
  const forecasts = await Forecast.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .select("-__v");

  if (!forecasts || forecasts.length === 0) {
    return next(
      new ErrorResponse(`No forecasts found for company ID ${companyId}`, 404)
    );
  }

  // Calculate summary statistics
  const summary = {
    totalForecasts: forecasts.length,
    averageConfidence:
      forecasts.reduce((sum, f) => sum + f.confidence, 0) / forecasts.length,
    models: [...new Set(forecasts.map((f) => f.model))],
    statuses: [...new Set(forecasts.map((f) => f.status))],
    latestForecast: forecasts[0].createdAt,
    oldestForecast: forecasts[forecasts.length - 1].createdAt,
  };

  res.status(200).json({
    success: true,
    count: forecasts.length,
    companyId,
    summary,
    data: forecasts,
  });
});

/**
 * @desc    Get forecast analytics and insights
 * @route   GET /api/forecast/analytics/:companyId
 * @access  Private
 */
exports.getForecastAnalytics = asyncHandler(async (req, res, next) => {
  const { companyId } = req.params;

  // Get all forecasts for the company
  const forecasts = await Forecast.find({ companyId })
    .sort({ createdAt: -1 })
    .select("data metadata confidence model status createdAt");

  if (!forecasts || forecasts.length === 0) {
    return next(
      new ErrorResponse(`No forecasts found for company ID ${companyId}`, 404)
    );
  }

  // Aggregate analytics data
  const analytics = {
    companyId,
    totalForecasts: forecasts.length,
    averageConfidence:
      forecasts.reduce((sum, f) => sum + f.confidence, 0) / forecasts.length,
    modelPerformance: {},
    categoryInsights: {},
    productInsights: {},
    inventoryInsights: {},
    seasonalTrends: {},
  };

  // Analyze model performance
  forecasts.forEach((forecast) => {
    if (!analytics.modelPerformance[forecast.model]) {
      analytics.modelPerformance[forecast.model] = {
        count: 0,
        totalConfidence: 0,
        averageConfidence: 0,
      };
    }
    analytics.modelPerformance[forecast.model].count++;
    analytics.modelPerformance[forecast.model].totalConfidence +=
      forecast.confidence;
  });

  // Calculate average confidence per model
  Object.keys(analytics.modelPerformance).forEach((model) => {
    const modelData = analytics.modelPerformance[model];
    modelData.averageConfidence = modelData.totalConfidence / modelData.count;
  });

  // Get latest comprehensive forecast data
  const latestForecast = forecasts[0];
  if (latestForecast.data) {
    analytics.categoryInsights = latestForecast.data.categoryForecast || {};
    analytics.productInsights = latestForecast.data.productForecast || {};
    analytics.inventoryInsights = latestForecast.data.inventoryForecast || {};
    analytics.seasonalTrends = latestForecast.data.demandForecast || {};
  }

  res.status(200).json({
    success: true,
    data: analytics,
  });
});
