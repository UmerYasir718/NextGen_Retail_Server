const Company = require('../models/company.model');
const User = require('../models/user.model');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all companies
// @route   GET /api/companies
// @access  Private/SuperAdmin
exports.getCompanies = async (req, res, next) => {
  try {
    const companies = await Company.find();

    res.status(200).json({
      success: true,
      count: companies.length,
      data: companies
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

    if (req.user.role === 'SuperAdmin') {
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
      data: company
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

    if (req.user.role === 'SuperAdmin') {
      // SuperAdmin can update any company
      company = await Company.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
      });
    } else {
      // Others can only update their own company
      if (req.params.id !== req.user.companyId.toString()) {
        return next(
          new ErrorResponse(`Not authorized to update this company`, 403)
        );
      }

      // Prevent changing critical fields if not SuperAdmin
      const restrictedFields = ['planId', 'planStartDate', 'planEndDate', 'isTrialPeriod', 'trialEndDate', 'stripeCustomerId', 'isActive'];
      restrictedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          delete req.body[field];
        }
      });

      company = await Company.findByIdAndUpdate(req.user.companyId, req.body, {
        new: true,
        runValidators: true
      });
    }

    if (!company) {
      return next(
        new ErrorResponse(`Company not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: company
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
      data: {}
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
      return next(new ErrorResponse('Company not found', 404));
    }

    // Calculate days remaining in trial or plan
    let daysRemaining = 0;
    let planStatus = '';

    if (company.isTrialPeriod) {
      const trialEnd = new Date(company.trialEndDate);
      const today = new Date();
      daysRemaining = Math.ceil((trialEnd - today) / (1000 * 60 * 60 * 24));
      planStatus = 'Trial';
    } else if (company.planEndDate) {
      const planEnd = new Date(company.planEndDate);
      const today = new Date();
      daysRemaining = Math.ceil((planEnd - today) / (1000 * 60 * 60 * 24));
      planStatus = 'Paid Plan';
    }

    // Get user count
    const userCount = await User.countDocuments({ companyId });

    // Return dashboard stats
    res.status(200).json({
      success: true,
      data: {
        companyName: company.name,
        planStatus,
        daysRemaining,
        userCount,
        isActive: company.isActive
      }
    });
  } catch (err) {
    next(err);
  }
};
