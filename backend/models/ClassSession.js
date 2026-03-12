const mongoose = require('mongoose');

const ClassSessionSchema = new mongoose.Schema({
  classId: String,
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: String,
  conductedAt: Date,
  duration: Number,
  mudrasCovered: [String],
  studentReports: [
    {
      studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      studentName: String,
      mudraScores: [
        {
          mudra: String,
          attempts: Number,
          bestScore: Number,
          averageScore: Number,
          corrections: [String]
        }
      ],
      overallScore: Number,
      attendanceDuration: Number,
      suggestions: [String]
    }
  ],
  classAverage: Number,
  totalStudents: Number,
  pdfPath: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ClassSession', ClassSessionSchema);
