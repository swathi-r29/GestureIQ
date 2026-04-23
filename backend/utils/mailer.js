const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendClassNotificationEmail = async (studentEmail, studentName, staffName, institutionName, classTitle, scheduledAt, duration, joinLink) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'GestureIQ <onboarding@resend.dev>',
      to: [studentEmail],
      subject: 'GestureIQ — New Class Scheduled for You',
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
    });

    if (error) {
      return console.error(`Error sending email to ${studentEmail}:`, error);
    }

    console.log(`Email sent successfully to ${studentEmail}:`, data.id);
  } catch (err) {
    console.error(`Unexpected error sending email to ${studentEmail}:`, err);
  }
};

const sendStaffApprovalEmail = async (email, name) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'GestureIQ <onboarding@resend.dev>',
      to: [email],
      subject: 'Congratulations! Your GestureIQ Staff Account is Approved',
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
          <div style="background: #8B1A1A; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; letter-spacing: 2px;">GestureIQ</h1>
          </div>
          <div style="padding: 40px; color: #333;">
            <h2 style="color: #8B1A1A;">Hello ${name},</h2>
            <p style="line-height: 1.6; font-size: 16px;">
              Great news! Your application to join **GestureIQ** as an instructor has been **approved** by our administration team.
            </p>
            <p style="line-height: 1.6; font-size: 16px;">
              You can now log in to your dashboard to create classes, manage students, and start your digital teaching journey.
            </p>
            <div style="text-align: center; margin: 40px 0;">
              <a href="https://astrological-tiffany-qualificatory.ngrok-free.dev/login" style="background: #8B1A1A; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Log In to Dashboard</a>
            </div>
            <p style="font-size: 14px; color: #666; text-align: center;">
              Welcome to the community! We're excited to have you onboard.
            </p>
          </div>
          <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #999;">
            &copy; ${new Date().getFullYear()} GestureIQ Academy. All rights reserved.
          </div>
        </div>
      `
    });
    if (error) console.error("Resend Error:", error);
    return data;
  } catch (err) {
    console.error("Mail Error:", err);
  }
};

const sendStaffRejectionEmail = async (email, name, reason) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'GestureIQ <onboarding@resend.dev>',
      to: [email],
      subject: 'Update regarding your GestureIQ Application',
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
          <div style="background: #333; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; letter-spacing: 2px;">GestureIQ</h1>
          </div>
          <div style="padding: 40px; color: #333;">
            <h2>Hello ${name},</h2>
            <p style="line-height: 1.6; font-size: 16px;">
              Thank you for your interest in joining GestureIQ. After reviewing your application, we are unable to approve your account at this time.
            </p>
            <div style="background: #fff5f5; border-left: 4px solid #c53030; padding: 20px; margin: 20px 0;">
              <strong style="color: #c53030; display: block; margin-bottom: 5px;">Reason for decision:</strong>
              <span style="color: #4a5568;">${reason || "Your profile does not currently meet our community requirements."}</span>
            </div>
            <p style="line-height: 1.6; font-size: 16px;">
              If you believe this was an error or have updated your credentials, you are welcome to apply again in the future.
            </p>
          </div>
          <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #999;">
            &copy; ${new Date().getFullYear()} GestureIQ Academy. All rights reserved.
          </div>
        </div>
      `
    });
    if (error) console.error("Resend Error:", error);
    return data;
  } catch (err) {
    console.error("Mail Error:", err);
  }
};

module.exports = { 
  sendClassNotificationEmail, 
  sendStaffApprovalEmail, 
  sendStaffRejectionEmail 
};
