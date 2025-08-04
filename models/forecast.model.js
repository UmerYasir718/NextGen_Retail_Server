const mongoose = require("mongoose");

const ForecastSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ["success", "failed", "pending"],
    default: "pending",
  },
  message: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  model: {
    type: String,
    required: true,
  },
  confidence: {
    type: Number,
    required: true,
  },
  data: {
    salesForecast: {
      monthly: {
        type: Object,
        default: {},
      },
      quarterly: {
        type: Object,
        default: {},
      },
      confidence: Number,
      algorithm: String,
      lastUpdated: Date,
    },
    inventoryForecast: {
      monthly: {
        type: Object,
        default: {},
      },
      quarterly: {
        type: Object,
        default: {},
      },
      stockoutRisk: Number,
      optimalReorderPoints: [Number],
      lastUpdated: Date,
    },
    demandForecast: {
      monthly: {
        type: Object,
        default: {},
      },
      quarterly: {
        type: Object,
        default: {},
      },
      seasonality: String,
      trendDirection: String,
      lastUpdated: Date,
    },
    productForecast: {
      data: [
        {
          id: String,
          name: String,
          category: String,
          currentSales: Number,
          forecastedSales: Number,
          growth: Number,
          price: Number,
          revenue: Number,
          confidence: Number,
          trend: String,
          seasonality: String,
        },
      ],
      summary: {
        totalProducts: Number,
        averageGrowth: Number,
        totalRevenue: Number,
        highGrowthProducts: Number,
        lastUpdated: Date,
      },
    },
    categoryForecast: {
      labels: [String],
      values: [Number],
      trends: Object,
      confidence: Number,
      lastUpdated: Date,
    },
  },
  metadata: {
    trainingDataPoints: Number,
    predictionHorizon: String,
    algorithm: String,
    accuracy: Number,
    processedItems: Number,
  },
  forecastCsvUrl: {
    type: String,
    default: null,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field on save
ForecastSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Forecast", ForecastSchema);
