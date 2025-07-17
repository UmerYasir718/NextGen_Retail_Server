/**
 * Email templates for the application
 * Contains reusable HTML templates for different types of emails
 */

/**
 * Creates a base HTML email template with the company logo and styling
 * @param {Object} options - Template options
 * @param {String} options.title - Email title
 * @param {String} options.content - Main email content (can include HTML)
 * @param {String} options.buttonText - Optional button text
 * @param {String} options.buttonUrl - Optional button URL
 * @param {String} options.footerText - Optional footer text
 * @returns {String} - Complete HTML email template
 */
const baseTemplate = (options) => {
  const {
    title,
    content,
    buttonText,
    buttonUrl,
    footerText = '© NextGen. All rights reserved.'
  } = options;

  // Button HTML - only include if buttonText and buttonUrl are provided
  const buttonHtml = buttonText && buttonUrl
    ? `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="btn btn-primary">
        <tbody>
          <tr>
            <td align="center">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tbody>
                  <tr>
                    <td>
                      <a href="${buttonUrl}" target="_blank">${buttonText}</a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
      `
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
      <title>${title}</title>
      <style>
        @media only screen and (max-width: 620px) {
          table.body h1 {
            font-size: 28px !important;
            margin-bottom: 10px !important;
          }
          
          table.body p,
          table.body ul,
          table.body ol,
          table.body td,
          table.body span,
          table.body a {
            font-size: 16px !important;
          }
          
          table.body .wrapper,
          table.body .article {
            padding: 10px !important;
          }
          
          table.body .content {
            padding: 0 !important;
          }
          
          table.body .container {
            padding: 0 !important;
            width: 100% !important;
          }
          
          table.body .main {
            border-left-width: 0 !important;
            border-radius: 0 !important;
            border-right-width: 0 !important;
          }
          
          table.body .btn table {
            width: 100% !important;
          }
          
          table.body .btn a {
            width: 100% !important;
          }
          
          table.body .img-responsive {
            height: auto !important;
            max-width: 100% !important;
            width: auto !important;
          }
        }
        @media all {
          .ExternalClass {
            width: 100%;
          }
          
          .ExternalClass,
          .ExternalClass p,
          .ExternalClass span,
          .ExternalClass font,
          .ExternalClass td,
          .ExternalClass div {
            line-height: 100%;
          }
          
          .apple-link a {
            color: inherit !important;
            font-family: inherit !important;
            font-size: inherit !important;
            font-weight: inherit !important;
            line-height: inherit !important;
            text-decoration: none !important;
          }
          
          #MessageViewBody a {
            color: inherit;
            text-decoration: none;
            font-size: inherit;
            font-family: inherit;
            font-weight: inherit;
            line-height: inherit;
          }
          
          .btn-primary table td:hover {
            background-color: #0056b3 !important;
          }
          
          .btn-primary a:hover {
            background-color: #0056b3 !important;
            border-color: #0056b3 !important;
          }
        }
      </style>
    </head>
    <body style="background-color: #f6f6f6; font-family: sans-serif; -webkit-font-smoothing: antialiased; font-size: 14px; line-height: 1.4; margin: 0; padding: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;">
      <span class="preheader" style="color: transparent; display: none; height: 0; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all; visibility: hidden; width: 0;">${title}</span>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f6f6f6; width: 100%;" width="100%" bgcolor="#f6f6f6">
        <tr>
          <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">&nbsp;</td>
          <td class="container" style="font-family: sans-serif; font-size: 14px; vertical-align: top; display: block; max-width: 580px; padding: 10px; width: 580px; margin: 0 auto;" width="580" valign="top">
            <div class="content" style="box-sizing: border-box; display: block; margin: 0 auto; max-width: 580px; padding: 10px;">
              <!-- START CENTERED WHITE CONTAINER -->
              <table role="presentation" class="main" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background: #ffffff; border-radius: 3px; width: 100%;" width="100%">
                <!-- START LOGO HEADER -->
                <tr>
                  <td class="header" style="font-family: sans-serif; font-size: 14px; vertical-align: top; padding: 20px 0; text-align: center;" valign="top" align="center">
                    <img src="cid:company-logo" alt="NextGen Logo" style="border: none; -ms-interpolation-mode: bicubic; max-width: 100%; height: auto; width: 180px;">
                  </td>
                </tr>
                <!-- END LOGO HEADER -->
                <!-- START MAIN CONTENT AREA -->
                <tr>
                  <td class="wrapper" style="font-family: sans-serif; font-size: 14px; vertical-align: top; box-sizing: border-box; padding: 20px;" valign="top">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;" width="100%">
                      <tr>
                        <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">
                          <h1 style="color: #000000; font-family: sans-serif; font-weight: 300; line-height: 1.4; margin: 0; margin-bottom: 30px; font-size: 35px; text-align: center; text-transform: capitalize;">${title}</h1>
                          <div style="font-family: sans-serif; font-size: 14px; font-weight: normal; margin: 0; margin-bottom: 15px;">
                            ${content}
                          </div>
                          ${buttonHtml}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- END MAIN CONTENT AREA -->
              </table>
              <!-- START FOOTER -->
              <div class="footer" style="clear: both; margin-top: 10px; text-align: center; width: 100%;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;" width="100%">
                  <tr>
                    <td class="content-block" style="font-family: sans-serif; vertical-align: top; padding-bottom: 10px; padding-top: 10px; color: #999999; font-size: 12px; text-align: center;" valign="top" align="center">
                      <span class="apple-link" style="color: #999999; font-size: 12px; text-align: center;">${footerText}</span>
                    </td>
                  </tr>
                </table>
              </div>
              <!-- END FOOTER -->
            </div>
          </td>
          <td style="font-family: sans-serif; font-size: 14px; vertical-align: top;" valign="top">&nbsp;</td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

/**
 * Email verification template
 * @param {Object} options - Template options
 * @param {String} options.name - User's name
 * @param {String} options.verificationUrl - Verification URL
 * @returns {String} - Complete HTML email template
 */
const verificationEmail = (options) => {
  const { name, verificationUrl } = options;
  
  const content = `
    <p>Hello ${name},</p>
    <p>Thank you for registering with NextGen. To complete your registration and verify your email address, please click the button below:</p>
  `;
  
  return baseTemplate({
    title: 'Verify Your Email Address',
    content,
    buttonText: 'Verify Email',
    buttonUrl: verificationUrl,
    footerText: 'If you did not create an account, no further action is required.'
  });
};

/**
 * Password reset template
 * @param {Object} options - Template options
 * @param {String} options.name - User's name
 * @param {String} options.resetUrl - Password reset URL
 * @returns {String} - Complete HTML email template
 */
const passwordResetEmail = (options) => {
  const { name, resetUrl } = options;
  
  const content = `
    <p>Hello ${name},</p>
    <p>You are receiving this email because you (or someone else) has requested the reset of a password.</p>
    <p>Please click the button below to reset your password. This link will expire in 10 minutes.</p>
  `;
  
  return baseTemplate({
    title: 'Reset Your Password',
    content,
    buttonText: 'Reset Password',
    buttonUrl: resetUrl,
    footerText: 'If you did not request a password reset, please ignore this email or contact support if you have concerns.'
  });
};

module.exports = {
  baseTemplate,
  verificationEmail,
  passwordResetEmail
};
