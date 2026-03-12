const mongoose = require('mongoose');

const LiveClassSchema = new mongoose.Schema({
  classId: { type: String, unique: true },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: String,
  description: String,
  scheduledAt: Date,
  duration: Number,
  maxStudents: Number,
  mudrasList: [String],
  language: String,
  status: {
    type: String,
    enum: ['scheduled', 'live', 'ended'],
    default: 'scheduled'
  },
  joinLink: String,
  studentsEnrolled: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LiveClass', LiveClassSchema);
