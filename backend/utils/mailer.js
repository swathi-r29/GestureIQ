const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendClassNotificationEmail = async (studentEmail, studentName, staffName, institutionName, classTitle, scheduledAt, duration, joinLink) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: studentEmail,
    subject: "GestureIQ — New Class Scheduled for You",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
      <meta charset="utf-8">
      <title>New Class Scheduled</title>
      </head>
      <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); max-width: 600px; width: 100%;">
                <!-- Header -->
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px 40px;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 0.5px;">GestureIQ</h1>
                  </td>
                </tr>
                
                <!-- Body -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #1f2937; font-size: 22px; font-weight: 600; margin-top: 0; margin-bottom: 20px;">Hello ${studentName},</h2>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                      Your instructor <strong style="color: #1f2937;">${staffName}</strong> from <strong style="color: #1f2937;">${institutionName}</strong> has scheduled a new live class for you.
                    </p>
                    
                    <!-- Class Details Card -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="20" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 30px;">
                      <tr>
                        <td>
                          <table width="100%" border="0" cellspacing="0" cellpadding="8">
                            <tr>
                              <td width="30%" style="color: #6b7280; font-size: 14px; font-weight: 600; text-transform: uppercase;">Class</td>
                              <td width="70%" style="color: #111827; font-size: 16px; font-weight: 500;">${classTitle}</td>
                            </tr>
                            <tr>
                              <td style="color: #6b7280; font-size: 14px; font-weight: 600; text-transform: uppercase;">Date</td>
                              <td style="color: #111827; font-size: 16px; font-weight: 500;">${new Date(scheduledAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                            </tr>
                            <tr>
                              <td style="color: #6b7280; font-size: 14px; font-weight: 600; text-transform: uppercase;">Time</td>
                              <td style="color: #111827; font-size: 16px; font-weight: 500;">${new Date(scheduledAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</td>
                            </tr>
                            <tr>
                              <td style="color: #6b7280; font-size: 14px; font-weight: 600; text-transform: uppercase;">Duration</td>
                              <td style="color: #111827; font-size: 16px; font-weight: 500;">${duration} minutes</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- CTA Button -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center">
                          <a href="${joinLink}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.3);">Join the Class</a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px; margin-bottom: 0;">
                      If you don't have an account yet, you can register using the same link above.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td align="center" style="background-color: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #9ca3af; font-size: 13px; margin: 0;">&copy; ${new Date().getFullYear()} GestureIQ. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${studentEmail}`);
  } catch (error) {
    console.error(`Error sending email to ${studentEmail}:`, error);
  }
};

module.exports = { sendClassNotificationEmail };
