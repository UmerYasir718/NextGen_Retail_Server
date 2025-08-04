const crypto = require("crypto");
const User = require("../models/user.model");
const Company = require("../models/company.model");
const Plan = require("../models/plan.model");
const ErrorResponse = require("../utils/errorResponse");
const sendEnhancedEmail = require("../utils/enhancedEmail");
const { createFreePlan } = require("../seeder/planSeeder");

// @desc    Register user (Admin)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, companyName, address } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "Email is already registered", error: true });
    }
    const existingCompany = await Company.findOne({ name: companyName });
    if (existingCompany) {
      return res
        .status(409)
        .json({ message: "Company is not Available!", error: true });
    }

    // Get or create free trial plan
    const freePlan = await createFreePlan();

    // Create company first with free trial plan
    const company = await Company.create({
      name: companyName,
      address,
      contactEmail: email,
      createdAt: Date.now(),
      planId: freePlan._id,
      isTrialPeriod: true,
      planStartDate: Date.now(),
      trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    });

    // Create user with Admin role and assign the free plan
    const user = await User.create({
      name,
      email,
      password,
      role: "company_admin",
      companyId: company._id,
      planId: freePlan._id,
      isActive: true,
    });

    // Generate verification token
    const verificationToken = user.getVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Create verification URL with frontend URL
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

    try {
      await sendEnhancedEmail({
        email: user.email,
        subject: "Email Verification",
        templateName: "verification",
        templateData: {
          name: user.name,
          verificationUrl,
        },
        plainText: `You are receiving this email because you need to confirm your email address. Please click the link below to verify your email address: 

 ${verificationUrl}`,
      });

      // Update company with created user
      company.createdBy = user._id;
      await company.save();

      res.status(200).json({
        success: true,
        message: "Email sent for verification",
      });
    } catch (err) {
      console.log(err);
      user.verificationToken = undefined;
      user.verificationExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return next(new ErrorResponse("Email could not be sent", 500));
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return next(
        new ErrorResponse("Please provide an email and password", 400)
      );
    }

    // Check for user
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return next(new ErrorResponse("Invalid credentials", 401));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return next(new ErrorResponse("Invalid credentials", 401));
    }

    // Check if user is verified (except for SuperAdmin)
    if (user.role !== "super_admin" && !user.isVerified) {
      return next(new ErrorResponse("Please verify your email first", 401));
    }

    // For non-super_admin users, check company plan status
    let isPlanExpired = false;
    let company = null;

    if (user.role !== "super_admin" && user.companyId) {
      company = await Company.findById(user.companyId);

      if (company) {
        // Check if trial period or plan has expired
        if (company.isTrialPeriod && company.trialEndDate < Date.now()) {
          isPlanExpired = true;
        } else if (
          !company.isTrialPeriod &&
          company.planEndDate &&
          company.planEndDate < Date.now()
        ) {
          isPlanExpired = true;
        }

        // If plan expired and user is not company_admin, deny access
        if (isPlanExpired && user.role !== "company_admin") {
          return next(
            new ErrorResponse(
              "Your company plan has expired. Please contact your administrator.",
              403
            )
          );
        }
      }
    }

    // Send token response with plan expiration flag
    await sendTokenResponse(user, 200, res, isPlanExpired);
  } catch (err) {
    next(err);
  }
};

// @desc    Verify email (Backend endpoint for direct verification)
// @route   GET /api/auth/verify-email/:token
// @access  Public
exports.verifyEmail = async (req, res, next) => {
  try {
    // Get hashed token
    const verificationToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      verificationToken,
      verificationExpire: { $gt: Date.now() },
    });

    if (!user) {
      return next(new ErrorResponse("Invalid token", 400));
    }

    // Set user as verified
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Verify email (Frontend endpoint for token verification)
// @route   POST /api/auth/verify-email-token
// @access  Public
exports.verifyEmailToken = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return next(new ErrorResponse("Token is required", 400));
    }

    // Get hashed token
    const verificationToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      verificationToken,
      verificationExpire: { $gt: Date.now() },
    });

    if (!user) {
      return next(new ErrorResponse("Invalid or expired token", 400));
    }

    // Set user as verified
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
      data: {
        userId: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return next(new ErrorResponse("There is no user with that email", 404));
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // Create reset url with frontend URL
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    try {
      await sendEnhancedEmail({
        email: user.email,
        subject: "Password Reset",
        templateName: "passwordReset",
        templateData: {
          name: user.name,
          resetUrl,
        },
        plainText: `You are receiving this email because you (or someone else) has requested the reset of a password. Please click on the following link to reset your password: 

 ${resetUrl} 

 If you did not request this, please ignore this email and your password will remain unchanged.`,
      });

      res.status(200).json({ success: true, message: "Email sent" });
    } catch (err) {
      console.log(err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validateBeforeSave: false });

      return next(new ErrorResponse("Email could not be sent", 500));
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return next(new ErrorResponse("Invalid token", 400));
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Reset password with token in body (for frontend integration)
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPasswordWithToken = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return next(new ErrorResponse("Token and password are required", 400));
    }

    // Get hashed token
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return next(new ErrorResponse("Invalid or expired token", 400));
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Update password
// @route   PUT /api/auth/update-password
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("+password");

    // Check current password
    if (!(await user.matchPassword(req.body.currentPassword))) {
      return next(new ErrorResponse("Password is incorrect", 401));
    }

    user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Change password (alias for update password)
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("+password");

    // Check current password
    if (!(await user.matchPassword(req.body.currentPassword))) {
      return next(new ErrorResponse("Current password is incorrect", 401));
    }

    user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public
exports.resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(new ErrorResponse("Email is required", 400));
    }

    const user = await User.findOne({ email });

    if (!user) {
      return next(new ErrorResponse("User not found", 404));
    }

    if (user.isVerified) {
      return next(new ErrorResponse("Email is already verified", 400));
    }

    // Generate new verification token
    const verificationToken = user.getVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Create verification URL
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

    try {
      await sendEnhancedEmail({
        email: user.email,
        subject: "Email Verification - Resend",
        templateName: "verification",
        templateData: {
          name: user.name,
          verificationUrl,
        },
        plainText: `Hello ${user.name},

You requested a new verification email. Please click the link below to verify your email address:

${verificationUrl}

If you did not request this email, please ignore it.

Best regards,
The Windsurf Team`,
      });

      res.status(200).json({
        success: true,
        message: "Verification email sent successfully",
      });
    } catch (err) {
      console.error("Email sending error:", err);
      user.verificationToken = undefined;
      user.verificationExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return next(new ErrorResponse("Email could not be sent", 500));
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Log user out / clear cookie
// @route   GET /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: "User logged out successfully",
    data: {},
  });
};

// @desc    SuperAdmin login
// @route   POST /api/auth/superadmin/login
// @access  Public
exports.superAdminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return next(
        new ErrorResponse("Please provide an email and password", 400)
      );
    }

    // Check if credentials match the environment variables
    console.log(process.env.SUPER_ADMIN_EMAIL);
    if (
      email !== process.env.SUPER_ADMIN_EMAIL ||
      password !== process.env.SUPER_ADMIN_PASSWORD
    ) {
      return next(new ErrorResponse("Invalid credentials", 401));
    }

    // Find or create SuperAdmin user
    let superAdmin = await User.findOne({ role: "super_admin" });

    if (!superAdmin) {
      superAdmin = await User.create({
        name: "Super Admin",
        email: process.env.SUPER_ADMIN_EMAIL,
        password: process.env.SUPER_ADMIN_PASSWORD,
        role: "super_admin",
        isVerified: true,
      });
    }

    await sendTokenResponse(superAdmin, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    SuperAdmin select company
// @route   POST /api/auth/superadmin/select-company/:companyId
// @access  Private/SuperAdmin
exports.selectCompany = async (req, res, next) => {
  try {
    // Check if user is SuperAdmin
    if (req.user.role !== "super_admin") {
      return next(new ErrorResponse("Not authorized", 403));
    }

    // Check if company exists
    const company = await Company.findById(req.params.companyId);

    if (!company) {
      return next(new ErrorResponse("Company not found", 404));
    }

    // Generate token with selected company
    const token = jwt.sign(
      {
        id: req.user.id,
        companyId: company._id,
        role: "super_admin",
        email: req.user.email,
        name: req.user.name,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRE,
      }
    );

    res.status(200).json({
      success: true,
      token,
    });
  } catch (err) {
    next(err);
  }
};

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = async (
  user,
  statusCode,
  res,
  isPlanExpired = false
) => {
  // Create token
  const token = user.getSignedJwtToken();

  // Get plan information if user has a company
  let planInfo = null;
  if (user.companyId) {
    try {
      const planManager = require("../utils/planManager");
      const planUsage = await planManager.getPlanUsage(user.companyId);
      const planExpiration = await planManager.checkPlanExpiration(
        user.companyId
      );
      const company = await Company.findById(user.companyId).populate("planId");

      planInfo = {
        id: company?.planId?._id,
        name: company?.planId?.name || "Free Trial",
        isTrialPeriod: company?.isTrialPeriod || false,
        isExpired: planExpiration.isExpired,
        daysRemaining: planExpiration.daysRemaining,
        limits: company?.planId?.limits || {
          warehouseLimit: 1,
          userLimit: 3,
          inventoryLimit: 100,
          includesAIForecasting: false,
          includesAdvancedReporting: false,
        },
        usage: planUsage.usage,
      };
    } catch (error) {
      console.error("Error getting plan info:", error);
    }
  }

  res.status(statusCode).json({
    success: true,
    token,
    isPlanExpired,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    },
    plan: planInfo,
  });
};
