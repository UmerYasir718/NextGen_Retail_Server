const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const emailTemplates = require("./emailTemplates");

/**
 * Enhanced email sending utility with HTML templates and logo
 * @param {Object} options - Email options
 * @param {String} options.email - Recipient email
 * @param {String} options.subject - Email subject
 * @param {String} options.templateName - Template name to use (e.g., 'verification', 'passwordReset')
 * @param {Object} options.templateData - Data to pass to the template
 * @param {String} options.plainText - Plain text version of the email (fallback)
 */
const sendEnhancedEmail = async (options) => {
  try {
    // Create reusable transporter
    const transporter = nodemailer.createTransport({
      //   host: process.env.EMAIL_HOST,
      //   port: process.env.EMAIL_PORT,
      //   secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Get the appropriate template
    let htmlContent;
    switch (options.templateName) {
      case "verification":
        htmlContent = emailTemplates.verificationEmail(options.templateData);
        break;
      case "passwordReset":
        htmlContent = emailTemplates.passwordResetEmail(options.templateData);
        break;
      default:
        // Use base template if specific template not found
        htmlContent = emailTemplates.baseTemplate({
          title: options.subject,
          content:
            options.templateData.content || "Please see the information below.",
          buttonText: options.templateData.buttonText,
          buttonUrl: options.templateData.buttonUrl,
        });
    }

    // Path to company logo
    const logoPath = path.join(__dirname, "../public/images/logo.png");

    // Check if logo exists, use default path if not
    const logoExists = fs.existsSync(logoPath);

    // Define email options
    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      text: options.plainText, // Plain text version
      html: htmlContent,
      attachments: [],
    };

    // Add logo as attachment if it exists
    if (logoExists) {
      mailOptions.attachments.push({
        filename: "logo.png",
        path: logoPath,
        cid: "company-logo", // Same cid value as in the template
      });
    }

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Enhanced email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error("Error sending enhanced email:", error);
    throw error;
  }
};

module.exports = sendEnhancedEmail;
