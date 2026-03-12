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
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Dear ${studentName},</h2>
        <p>Your teacher <strong>${staffName}</strong> from <strong>${institutionName}</strong> has scheduled a new class for you.</p>
        <div style="background: #f4f4f4; padding: 15px; border-radius: 5px;">
          <p><strong>Class:</strong> ${classTitle}</p>
          <p><strong>Date:</strong> ${new Date(scheduledAt).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${new Date(scheduledAt).toLocaleTimeString()}</p>
          <p><strong>Duration:</strong> ${duration} minutes</p>
        </div>
        <p>Click below to join:</p>
        <div style="margin: 20px 0;">
          <a href="${joinLink}" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Join Class</a>
        </div>
        <p>If you do not have an account yet, you can register using the same link.</p>
        <p>— GestureIQ Team</p>
      </div>
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
