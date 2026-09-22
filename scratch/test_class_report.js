const { generateClassReportPDF } = require('../backend/utils/pdfGenerator');
const path = require('path');

const sampleSession = {
  classId: 'CLASS-9921',
  title: 'Full Body Stance & Adavu Masterclass',
  conductedAt: new Date(),
  duration: 60,
  totalStudents: 3,
  mudrasCovered: ['araimandi', 'nattadavu', 'veeshi_adavu'],
  classAverage: 88.5,
  studentReports: [
    {
      studentName: 'Divyadharshini R V',
      overallScore: 92,
      mudraScores: [
        { mudra: 'araimandi', attempts: 5, bestScore: 94 },
        { mudra: 'nattadavu', attempts: 4, bestScore: 90 }
      ],
      suggestions: ['Maintain deep knee bend in Araimandi']
    },
    {
      studentName: 'Ananya Sharma',
      overallScore: 85,
      mudraScores: [
        { mudra: 'araimandi', attempts: 3, bestScore: 82 },
        { mudra: 'veeshi_adavu', attempts: 4, bestScore: 88 }
      ],
      suggestions: ['Keep spine vertical during Veeshi Adavu']
    },
    {
      studentName: 'Kavya Nair',
      overallScore: 48,
      mudraScores: [
        { mudra: 'nattadavu', attempts: 2, bestScore: 48 }
      ],
      suggestions: ['Practice Muzhumandi sit-down holds daily']
    }
  ]
};

const sampleStaff = {
  name: 'Divyadharshini',
  institution_name: 'DancingHub Institute'
};

const outputPath = path.join(__dirname, 'test_class_report_output.pdf');

generateClassReportPDF(sampleSession, sampleStaff, outputPath)
  .then(() => {
    console.log('PDF generated successfully at:', outputPath);
  })
  .catch(err => {
    console.error('PDF generation error:', err);
  });
