const mongoose = require('mongoose');

const AdminSettingsSchema = new mongoose.Schema({
    passingScore: { type: Number, default: 75 },
    allowStudentRegistration: { type: Boolean, default: true },
    allowStaffRegistration: { type: Boolean, default: true },
    mudraOrder: [{ type: String }],
    certificateTitle: { type: String, default: "Certificate of Proficiency" },
    institutionName: { type: String, default: "GestureIQ" },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AdminSettings', AdminSettingsSchema);
