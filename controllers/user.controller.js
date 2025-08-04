const User = require("../models/user.model");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    // Get users for the current company only (unless SuperAdmin)
    let query = {};

    if (req.user.role !== "SuperAdmin") {
      query.companyId = req.user.companyId;
    }

    // const users = await User.find(query).select("-password");
    const users = await User.find(query)
      .select("-password")
      .populate("companyId", "name"); // Only fetch company name

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUser = async (req, res, next) => {
  try {
    // Get user by ID (and company if not SuperAdmin)
    let query = { _id: req.params.id };

    if (req.user.role !== "SuperAdmin") {
      query.companyId = req.user.companyId;
    }

    const user = await User.findOne(query).select("-password");

    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (req, res, next) => {
  try {
    // Set company ID from authenticated user if not SuperAdmin
    if (req.user.role !== "super_admin") {
      req.body.companyId = req.user.companyId;
    }

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return next(
        new ErrorResponse(
          `User with email ${req.body.email} already exists`,
          400
        )
      );
    }

    // Create user
    const user = await User.create(req.body);

    // Send verification email if user is not verified by default
    if (!user.isVerified) {
      // Generate verification token
      const verificationToken = user.getVerificationToken();
      await user.save({ validateBeforeSave: false });

      // Create verification URL with frontend URL
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

      try {
        const sendEnhancedEmail = require("../utils/enhancedEmail");
        await sendEnhancedEmail({
          email: user.email,
          subject: "Email Verification - Account Created by Admin",
          templateName: "verification",
          templateData: {
            name: user.name,
            verificationUrl,
            createdBy: req.user.name,
            companyName: req.user.companyName || "your company",
          },
          plainText: `Hello ${user.name},

Your account has been created by ${req.user.name} (${req.user.role}) from ${
            req.user.companyName || "your company"
          }.

Please click the link below to verify your email address and activate your account:

${verificationUrl}

If you did not expect this email, please contact your administrator.

Best regards,
The Windsurf Team`,
        });

        res.status(201).json({
          success: true,
          message: "User created successfully. Verification email sent.",
          data: {
            ...user.toObject(),
            password: undefined, // Don't send password in response
          },
        });
      } catch (emailErr) {
        console.error("Email sending error:", emailErr);
        user.verificationToken = undefined;
        user.verificationExpire = undefined;
        await user.save({ validateBeforeSave: false });

        res.status(201).json({
          success: true,
          message:
            "User created successfully but verification email could not be sent. Please contact the user directly.",
          data: {
            ...user.toObject(),
            password: undefined,
          },
        });
      }
    } else {
      res.status(201).json({
        success: true,
        message: "User created successfully",
        data: {
          ...user.toObject(),
          password: undefined,
        },
      });
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
  try {
    // Find user by ID (and company if not SuperAdmin)
    let query = { _id: req.params.id };

    if (req.user.role !== "SuperAdmin") {
      query.companyId = req.user.companyId;
    }

    // Prevent changing company ID if not SuperAdmin
    if (req.user.role !== "SuperAdmin" && req.body.companyId) {
      delete req.body.companyId;
    }

    // Prevent changing role to SuperAdmin
    if (req.body.role === "SuperAdmin" && req.user.role !== "SuperAdmin") {
      return next(
        new ErrorResponse("Not authorized to create SuperAdmin users", 403)
      );
    }

    // Find and update user
    const user = await User.findOneAndUpdate(query, req.body, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    // Find user by ID (and company if not SuperAdmin)
    let query = { _id: req.params.id };

    if (req.user.role !== "SuperAdmin") {
      query.companyId = req.user.companyId;
    }

    // Prevent deleting SuperAdmin
    const userToDelete = await User.findOne(query);

    if (!userToDelete) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }

    if (userToDelete.role === "SuperAdmin") {
      return next(new ErrorResponse("SuperAdmin users cannot be deleted", 403));
    }

    // Delete user
    await User.findOneAndDelete(query);

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Edit user details (without email permission)
// @route   PUT /api/users/edit-details
// @access  Private
exports.editUserDetails = async (req, res, next) => {
  try {
    // Remove email from request body to prevent changing it
    const { email, ...updateData } = req.body;

    // Additional restricted fields that cannot be changed
    const restrictedFields = [
      "role",
      "companyId",
      "planId",
      "isVerified",
      "verificationToken",
      "verificationExpire",
      "resetPasswordToken",
      "resetPasswordExpire",
      "createdAt",
    ];

    restrictedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        delete updateData[field];
      }
    });

    // Update user details
    const user = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return next(new ErrorResponse("User not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "User details updated successfully",
      data: user,
    });
  } catch (err) {
    next(err);
  }
};
