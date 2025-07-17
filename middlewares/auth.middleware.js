const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  // Check if token exists in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  }

  // Check if token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from the token
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found with this ID'
      });
    }

    // Add decoded token data to request
    req.user.companyId = decoded.companyId;
    req.user.role = decoded.role;
    req.user.email = decoded.email;
    req.user.name = decoded.name;

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Company scope middleware
exports.companyScope = async (req, res, next) => {
  // SuperAdmin can access all companies
  if (req.user.role === 'SuperAdmin') {
    return next();
  }

  // For other roles, ensure they only access their company's data
  if (req.params.companyId && req.params.companyId !== req.user.companyId.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access other company data'
    });
  }

  // If companyId is in the body, ensure it matches user's company
  if (req.body.companyId && req.body.companyId !== req.user.companyId.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to set data for other companies'
    });
  }

  // Set companyId in the request body if not provided
  if (!req.body.companyId) {
    req.body.companyId = req.user.companyId;
  }

  next();
};
