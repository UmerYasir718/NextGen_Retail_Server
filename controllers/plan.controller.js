const Plan = require('../models/plan.model');
const Company = require('../models/company.model');
const ErrorResponse = require('../utils/errorResponse');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// @desc    Get all plans
// @route   GET /api/plans
// @access  Private
exports.getPlans = async (req, res, next) => {
  try {
    const plans = await Plan.find({ isActive: true });

    res.status(200).json({
      success: true,
      count: plans.length,
      data: plans
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single plan
// @route   GET /api/plans/:id
// @access  Private
exports.getPlan = async (req, res, next) => {
  try {
    const plan = await Plan.findById(req.params.id);

    if (!plan) {
      return next(
        new ErrorResponse(`Plan not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: plan
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create plan
// @route   POST /api/plans
// @access  Private/SuperAdmin
exports.createPlan = async (req, res, next) => {
  try {
    // Create plan in database
    const plan = await Plan.create(req.body);

    // Create plan in Stripe
    const stripePrice = await stripe.prices.create({
      unit_amount: req.body.price * 100, // Stripe uses cents
      currency: 'usd',
      recurring: {
        interval: req.body.duration === 1 ? 'month' : req.body.duration === 6 ? 'month' : 'year',
        interval_count: req.body.duration === 6 ? 6 : 1
      },
      product_data: {
        name: req.body.name,
        description: req.body.description
      },
    });

    // Update plan with Stripe price ID
    plan.stripePriceId = stripePrice.id;
    await plan.save();

    res.status(201).json({
      success: true,
      data: plan
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update plan
// @route   PUT /api/plans/:id
// @access  Private/SuperAdmin
exports.updatePlan = async (req, res, next) => {
  try {
    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!plan) {
      return next(
        new ErrorResponse(`Plan not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: plan
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete plan
// @route   DELETE /api/plans/:id
// @access  Private/SuperAdmin
exports.deletePlan = async (req, res, next) => {
  try {
    const plan = await Plan.findById(req.params.id);

    if (!plan) {
      return next(
        new ErrorResponse(`Plan not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if any companies are using this plan
    const companiesUsingPlan = await Company.countDocuments({ planId: req.params.id });
    
    if (companiesUsingPlan > 0) {
      return next(
        new ErrorResponse(`Cannot delete plan as it is being used by ${companiesUsingPlan} companies`, 400)
      );
    }

    // Instead of deleting, mark as inactive
    plan.isActive = false;
    await plan.save();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Assign plan to company
// @route   POST /api/plans/:id/assign/:companyId
// @access  Private/SuperAdmin
exports.assignPlanToCompany = async (req, res, next) => {
  try {
    const plan = await Plan.findById(req.params.id);
    const company = await Company.findById(req.params.companyId);

    if (!plan) {
      return next(
        new ErrorResponse(`Plan not found with id of ${req.params.id}`, 404)
      );
    }

    if (!company) {
      return next(
        new ErrorResponse(`Company not found with id of ${req.params.companyId}`, 404)
      );
    }

    // Calculate plan end date based on duration
    const startDate = new Date();
    const endDate = new Date();
    
    if (plan.duration === 1) {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (plan.duration === 6) {
      endDate.setMonth(endDate.getMonth() + 6);
    } else if (plan.duration === 12) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // Update company with plan details
    company.planId = plan._id;
    company.planStartDate = startDate;
    company.planEndDate = endDate;
    company.isTrialPeriod = false;

    await company.save();

    res.status(200).json({
      success: true,
      data: company
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create checkout session for plan subscription
// @route   POST /api/plans/:id/checkout
// @access  Private/Admin
exports.createCheckoutSession = async (req, res, next) => {
  try {
    const plan = await Plan.findById(req.params.id);
    const company = await Company.findById(req.user.companyId);

    if (!plan) {
      return next(
        new ErrorResponse(`Plan not found with id of ${req.params.id}`, 404)
      );
    }

    if (!company) {
      return next(
        new ErrorResponse(`Company not found`, 404)
      );
    }

    // Create or retrieve Stripe customer
    let customer;
    if (company.stripeCustomerId) {
      customer = await stripe.customers.retrieve(company.stripeCustomerId);
    } else {
      customer = await stripe.customers.create({
        email: req.user.email,
        name: company.name,
        metadata: {
          companyId: company._id.toString()
        }
      });
      
      // Save Stripe customer ID to company
      company.stripeCustomerId = customer.id;
      await company.save();
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.protocol}://${req.get('host')}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/payment-cancel`,
      metadata: {
        companyId: company._id.toString(),
        planId: plan._id.toString()
      }
    });

    res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Handle Stripe webhook
// @route   POST /api/plans/webhook
// @access  Public
exports.stripeWebhook = async (req, res, next) => {
  const signature = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      
      // Update company with plan details
      if (session.metadata && session.metadata.companyId && session.metadata.planId) {
        const company = await Company.findById(session.metadata.companyId);
        const plan = await Plan.findById(session.metadata.planId);
        
        if (company && plan) {
          // Calculate plan end date based on duration
          const startDate = new Date();
          const endDate = new Date();
          
          if (plan.duration === 1) {
            endDate.setMonth(endDate.getMonth() + 1);
          } else if (plan.duration === 6) {
            endDate.setMonth(endDate.getMonth() + 6);
          } else if (plan.duration === 12) {
            endDate.setFullYear(endDate.getFullYear() + 1);
          }

          // Update company with plan details
          company.planId = plan._id;
          company.planStartDate = startDate;
          company.planEndDate = endDate;
          company.isTrialPeriod = false;

          await company.save();
        }
      }
      break;
    
    case 'invoice.payment_failed':
      // Handle failed payment
      const invoice = event.data.object;
      const customerId = invoice.customer;
      
      // Find company by Stripe customer ID
      const company = await Company.findOne({ stripeCustomerId: customerId });
      
      if (company) {
        // Send notification about failed payment
        // This would be implemented in a notification service
        console.log(`Payment failed for company ${company.name}`);
      }
      break;
    
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.status(200).json({ received: true });
};
