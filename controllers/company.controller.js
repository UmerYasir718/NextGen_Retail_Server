const mongoose = require("mongoose");
const Company = require("../models/company.model");
const User = require("../models/user.model");
const Inventory = require("../models/inventory.model");
const Shipment = require("../models/shipment.model");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get all companies
// @route   GET /api/companies
// @access  Private/SuperAdmin
exports.getCompanies = async (req, res, next) => {
  try {
    const companies = await Company.find();

    res.status(200).json({
      success: true,
      count: companies.length,
      data: companies,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single company
// @route   GET /api/companies/:id
// @access  Private/SuperAdmin or Admin (own company)
exports.getCompany = async (req, res, next) => {
  try {
    let company;

    if (req.user.role === "SuperAdmin") {
      // SuperAdmin can view any company
      company = await Company.findById(req.params.id);
    } else {
      // Others can only view their own company
      if (req.params.id !== req.user.companyId.toString()) {
        return next(
          new ErrorResponse(`Not authorized to access this company`, 403)
        );
      }
      company = await Company.findById(req.user.companyId);
    }

    if (!company) {
      return next(
        new ErrorResponse(`Company not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: company,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update company
// @route   PUT /api/companies/:id
// @access  Private/SuperAdmin or Admin (own company)
exports.updateCompany = async (req, res, next) => {
  try {
    let company;

    if (req.user.role === "SuperAdmin") {
      // SuperAdmin can update any company
      company = await Company.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
    } else {
      // Others can only update their own company
      if (req.params.id !== req.user.companyId.toString()) {
        return next(
          new ErrorResponse(`Not authorized to update this company`, 403)
        );
      }

      // Prevent changing critical fields if not SuperAdmin
      const restrictedFields = [
        "planId",
        "planStartDate",
        "planEndDate",
        "isTrialPeriod",
        "trialEndDate",
        "stripeCustomerId",
        "isActive",
      ];
      restrictedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          delete req.body[field];
        }
      });

      company = await Company.findByIdAndUpdate(req.user.companyId, req.body, {
        new: true,
        runValidators: true,
      });
    }

    if (!company) {
      return next(
        new ErrorResponse(`Company not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: company,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete company
// @route   DELETE /api/companies/:id
// @access  Private/SuperAdmin
exports.deleteCompany = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return next(
        new ErrorResponse(`Company not found with id of ${req.params.id}`, 404)
      );
    }

    // Delete all users associated with the company
    await User.deleteMany({ companyId: req.params.id });

    // Delete the company
    await company.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get company dashboard stats
// @route   GET /api/companies/dashboard
// @access  Private/Admin
exports.getDashboardStats = async (req, res, next) => {
  try {
    // Get company ID from authenticated user
    const companyId = req.user.companyId;

    // Get company details
    const company = await Company.findById(companyId);

    if (!company) {
      return next(new ErrorResponse("Company not found", 404));
    }

    // Calculate days remaining in trial or plan
    let daysRemaining = 0;
    let planStatus = "";

    if (company.isTrialPeriod) {
      const trialEnd = new Date(company.trialEndDate);
      const today = new Date();
      daysRemaining = Math.ceil((trialEnd - today) / (1000 * 60 * 60 * 24));
      planStatus = "Trial";
    } else if (company.planEndDate) {
      const planEnd = new Date(company.planEndDate);
      const today = new Date();
      daysRemaining = Math.ceil((planEnd - today) / (1000 * 60 * 60 * 24));
      planStatus = "Paid Plan";
    }

    // Get user count
    const userCount = await User.countDocuments({ companyId });

    // Get inventory data for charts
    const inventoryData = await exports.getInventoryChartData(companyId);

    // Get sales and revenue data for charts
    const { salesData, revenueData } = await exports.getSalesAndRevenueData(
      companyId
    );

    // Get recent sales data for table
    const recentSalesData = await exports.getRecentSalesData(companyId);

    // Get low stock items for table
    const lowStockItems = await exports.getLowStockItems(companyId);

    // Return dashboard stats
    res.status(200).json({
      success: true,
      data: {
        companyName: company.name,
        planStatus,
        daysRemaining,
        userCount,
        isActive: company.isActive,
        salesData,
        inventoryData,
        revenueData,
        recentSalesData,
        lowStockItems,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Helper function to get inventory data for charts
exports.getInventoryChartData = async (companyId) => {
  try {
    // Get inventory categories and their counts
    const inventoryCategories = await Inventory.aggregate([
      { $match: { companyId: new mongoose.Types.ObjectId(companyId) } },
      { $group: { _id: "$category", count: { $sum: "$quantity" } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Format data for charts
    const labels = inventoryCategories.map(
      (item) => item._id || "Uncategorized"
    );
    const data = inventoryCategories.map((item) => item.count);

    // Generate random colors for chart
    const backgroundColors = labels.map(
      () =>
        `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(
          Math.random() * 255
        )}, ${Math.floor(Math.random() * 255)}, 0.2)`
    );

    const borderColors = backgroundColors.map((color) =>
      color.replace("0.2", "1")
    );

    return {
      labels,
      datasets: [
        {
          label: "Inventory Level",
          data,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1,
        },
      ],
    };
  } catch (error) {
    console.error("Error getting inventory chart data:", error);
    return {
      labels: ["Electronics", "Clothing", "Food", "Books", "Toys"],
      datasets: [
        {
          label: "Inventory Level",
          data: [300, 450, 200, 150, 350],
          backgroundColor: [
            "rgba(255, 99, 132, 0.2)",
            "rgba(54, 162, 235, 0.2)",
            "rgba(255, 206, 86, 0.2)",
            "rgba(75, 192, 192, 0.2)",
            "rgba(153, 102, 255, 0.2)",
          ],
          borderColor: [
            "rgba(255, 99, 132, 1)",
            "rgba(54, 162, 235, 1)",
            "rgba(255, 206, 86, 1)",
            "rgba(75, 192, 192, 1)",
            "rgba(153, 102, 255, 1)",
          ],
          borderWidth: 1,
        },
      ],
    };
  }
};

// Helper function to get sales and revenue data for charts
exports.getSalesAndRevenueData = async (companyId) => {
  try {
    // Get current date and date 6 months ago
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);

    // Get monthly sales data
    const monthlySales = await Inventory.aggregate([
      {
        $match: {
          companyId: new mongoose.Types.ObjectId(companyId),
          inventoryStatus: "sale",
          createdAt: { $gte: sixMonthsAgo, $lte: today },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 },
          revenue: { $sum: "$price.retail" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Format data for charts
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const labels = [];
    const salesData = [];
    const revenueData = [];

    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthYear = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      const monthName = months[d.getMonth()];

      labels.push(monthName);

      // Find data for this month
      console.log(monthlySales);
      const monthData = monthlySales.find((item) => item._id === monthYear);
      salesData.push(monthData ? monthData.count : 0);
      revenueData.push(monthData ? monthData.revenue : 0);
    }

    return {
      salesData: {
        labels,
        datasets: [
          {
            label: "Sales",
            data: salesData,
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 1,
          },
        ],
      },
      revenueData: {
        labels,
        datasets: [
          {
            label: "Revenue",
            data: revenueData,
            fill: false,
            backgroundColor: "rgba(54, 162, 235, 0.2)",
            borderColor: "rgba(54, 162, 235, 1)",
            tension: 0.1,
          },
        ],
      },
    };
  } catch (error) {
    console.error("Error getting sales and revenue data:", error);
    return {
      salesData: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [
          {
            label: "Sales",
            data: [12, 19, 3, 5, 2, 3],
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 1,
          },
        ],
      },
      revenueData: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [
          {
            label: "Revenue",
            data: [5000, 7000, 6000, 8000, 9000, 11000],
            fill: false,
            backgroundColor: "rgba(54, 162, 235, 0.2)",
            borderColor: "rgba(54, 162, 235, 1)",
            tension: 0.1,
          },
        ],
      },
    };
  }
};

// Helper function to get recent sales data for table
exports.getRecentSalesData = async (companyId) => {
  try {
    const recentSales = await Inventory.find({
      companyId: companyId,
      inventoryStatus: { $in: ["sale", "pending_sale"] },
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("_id", "name");

    return recentSales.map((sale) => ({
      id: sale._id,
      product: sale ? sale.name : "Unknown",
      customer: sale.customerName || "Unknown Customer",
      date: sale.createdAt.toISOString().split("T")[0],
      amount: sale.price.retail || 0,
      status: sale.inventoryStatus,
    }));
  } catch (error) {
    console.error("Error getting recent sales data:", error);
    return [
      {
        id: 1,
        product: "Laptop",
        customer: "John Doe",
        date: "2023-06-15",
        amount: 1200,
        status: "Completed",
      },
      {
        id: 2,
        product: "Smartphone",
        customer: "Jane Smith",
        date: "2023-06-14",
        amount: 800,
        status: "Completed",
      },
      {
        id: 3,
        product: "Headphones",
        customer: "Bob Johnson",
        date: "2023-06-13",
        amount: 150,
        status: "Pending",
      },
      {
        id: 4,
        product: "Monitor",
        customer: "Alice Brown",
        date: "2023-06-12",
        amount: 300,
        status: "Completed",
      },
      {
        id: 5,
        product: "Keyboard",
        customer: "Charlie Wilson",
        date: "2023-06-11",
        amount: 80,
        status: "Completed",
      },
    ];
  }
};

// Helper function to get low stock items for table
exports.getLowStockItems = async (companyId) => {
  try {
    const lowStock = await Inventory.find({
      companyId: companyId,
      $expr: { $lte: ["$quantity", "$threshold"] },
    })
      .sort({ quantity: 1 })
      .limit(5);

    return lowStock.map((item) => ({
      id: item._id,
      product: item.name,
      category: item.category || "Uncategorized",
      quantity: item.quantity,
      threshold: item.threshold,
    }));
  } catch (error) {
    console.error("Error getting low stock items:", error);
    return [
      {
        id: 1,
        product: "Wireless Mouse",
        category: "Electronics",
        quantity: 5,
        threshold: 10,
      },
      {
        id: 2,
        product: "T-Shirt (L)",
        category: "Clothing",
        quantity: 8,
        threshold: 15,
      },
      {
        id: 3,
        product: "Protein Bars",
        category: "Food",
        quantity: 3,
        threshold: 20,
      },
      {
        id: 4,
        product: "Notebooks",
        category: "Stationery",
        quantity: 7,
        threshold: 25,
      },
      {
        id: 5,
        product: "Action Figures",
        category: "Toys",
        quantity: 4,
        threshold: 10,
      },
    ];
  }
};
