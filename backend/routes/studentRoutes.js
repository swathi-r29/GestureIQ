const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const LiveClass = require('../models/LiveClass');
const ClassSession = require('../models/ClassSession');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   GET /api/student/notifications
router.get('/notifications', auth, async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(notifications);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/student/notification/:notifId/read
router.put('/notification/:notifId/read', auth, async (req, res) => {
    try {
        await Notification.findOneAndUpdate(
            { _id: req.params.notifId, userId: req.user.id },
            { isRead: true }
        );
        res.json({ msg: 'Notification marked as read' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/student/class/join/:classId
// No auth required for initial check
router.get('/class/join/:classId', async (req, res) => {
    try {
        const liveClass = await LiveClass.findOne({ classId: req.params.classId })
            .populate('staffId', 'name institution_name');
        
        if (!liveClass) return res.status(404).json({ msg: 'Class not found' });
        if (liveClass.status === 'ended') return res.status(400).json({ msg: 'Class has ended' });

        res.json({
            title: liveClass.title,
            staffName: liveClass.staffId.name,
            institutionName: liveClass.staffId.institution_name,
            scheduledAt: liveClass.scheduledAt,
            duration: liveClass.duration,
            status: liveClass.status,
            targetMudra: liveClass.mudrasList?.[0] || '',
            mudrasList: liveClass.mudrasList || []
        });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/student/class/:classId/join
router.post('/class/:classId/join', auth, async (req, res) => {
    try {
        const liveClass = await LiveClass.findOne({ classId: req.params.classId });
        if (!liveClass) return res.status(404).json({ msg: 'Class not found' });
        
        if (!liveClass.studentsEnrolled.includes(req.user.id)) {
            liveClass.studentsEnrolled.push(req.user.id);
            await liveClass.save();
        }

        res.json({ msg: 'Joined class successfully' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/student/class-history
router.get('/class-history', auth, async (req, res) => {
    try {
        const history = await ClassSession.find({
            "studentReports.studentId": req.user.id
        }).sort({ conductedAt: -1 });

        const formattedHistory = history.map(session => {
            const myReport = session.studentReports.find(r => r.studentId.toString() === req.user.id);
            return {
                classTitle: session.title,
                conductedAt: session.conductedAt,
                mudraScores: myReport.mudraScores,
                overallScore: myReport.overallScore,
                suggestions: myReport.suggestions
            };
        });

        res.json(formattedHistory);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/student/classes/upcoming
router.get('/classes/upcoming', auth, async (req, res) => {
    try {
        const student = await User.findById(req.user.id);
        const classes = await LiveClass.find({
            status: 'scheduled',
            scheduledAt: { $gte: new Date() }
        }).populate('staffId', 'name institution_name');
        
        // Robust filtering: ensure staffId exists and institution names match (case-insensitive)
        const filtered = classes.filter(c => 
            c.staffId && 
            c.staffId.institution_name && 
            student.institution_name &&
            c.staffId.institution_name.toLowerCase() === student.institution_name.toLowerCase()
        );
        res.json(filtered);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/student/classes/active
router.get('/classes/active', auth, async (req, res) => {
    try {
        const student = await User.findById(req.user.id);
        const classes = await LiveClass.find({
            status: 'live'
        }).populate('staffId', 'name institution_name');
        
        const filtered = classes.filter(c => 
            c.staffId && 
            c.staffId.institution_name && 
            student.institution_name &&
            c.staffId.institution_name.toLowerCase() === student.institution_name.toLowerCase()
        );
        res.json(filtered);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/student/download_dance_report
const { generateDanceReport } = require('../utils/pdfGenerator');
const path = require('path');
const fs = require('fs');

router.post('/download_dance_report', async (req, res) => {
  try {
    const sessionData = req.body;
    const reportsDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const fileName = `Report_${sessionData.danceName}_${Date.now()}.pdf`;
    const filePath = path.join(reportsDir, fileName);

    await generateDanceReport(sessionData, filePath);

    res.download(filePath, fileName, (err) => {
      if (err) console.error('Download error:', err);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
  } catch (err) {
    console.error('Report endpoint error:', err);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
});

// In-memory student practice history store
const STUDENT_PRACTICE_HISTORY = [
  {
    id: 'session_demo_1',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    danceName: 'Alarippu',
    overallScore: 88,
    grade: 'A',
    stanceBreakdown: { Araimandi: 75, Samapada: 25 },
    talaSyncScore: 92,
    feedback: ['Maintain knee outward alignment in Araimandi']
  },
  {
    id: 'session_demo_2',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    danceName: 'Veeshi_Adavu_Suite',
    overallScore: 91,
    grade: 'A+',
    stanceBreakdown: { Araimandi: 90, Nattadavu: 10 },
    talaSyncScore: 94,
    feedback: ['Excellent Veeshi arm extension!']
  }
];

// @route   POST /api/student/save_session
router.post('/save_session', (req, res) => {
    try {
        const session = {
            id: `session_${Date.now()}`,
            timestamp: new Date().toISOString(),
            danceName: req.body.danceName || 'Alarippu',
            overallScore: req.body.overallScore || 85,
            grade: req.body.grade || 'A',
            stanceBreakdown: req.body.stanceBreakdown || { Araimandi: 100 },
            talaSyncScore: req.body.talaSyncScore || 90,
            feedback: req.body.feedback || []
        };
        STUDENT_PRACTICE_HISTORY.unshift(session);
        if (STUDENT_PRACTICE_HISTORY.length > 50) STUDENT_PRACTICE_HISTORY.pop();
        res.json({ status: 'success', session });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// @route   GET /api/student/history
router.get('/history', (req, res) => {
    try {
        const total = STUDENT_PRACTICE_HISTORY.length;
        const avgScore = total > 0 
            ? Math.round(STUDENT_PRACTICE_HISTORY.reduce((a, b) => a + (b.overallScore || 85), 0) / total) 
            : 89;

        // Dynamic stance analysis from stance breakdowns across history
        const stanceScores = {};
        STUDENT_PRACTICE_HISTORY.forEach(s => {
          if (s.stanceBreakdown) {
            Object.entries(s.stanceBreakdown).forEach(([st, pct]) => {
              const cleanName = st.replace(' Stance', '').trim();
              if (!stanceScores[cleanName]) stanceScores[cleanName] = [];
              stanceScores[cleanName].push(s.overallScore || 85);
            });
          }
        });

        const mastered = [];
        const weak = [];
        Object.entries(stanceScores).forEach(([st, scores]) => {
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          if (avg >= 85) {
            mastered.push(`${st} Stance`);
          } else {
            weak.push(`${st} Stance`);
          }
        });

        if (mastered.length === 0) mastered.push('Araimandi Stance', 'Samapada Stance');
        if (weak.length === 0) weak.push('Muzhumandi Stance');

        // Streak calculation (unique practice days)
        const uniqueDays = new Set(STUDENT_PRACTICE_HISTORY.map(s => new Date(s.timestamp).toDateString()));

        res.json({
            status: 'success',
            history: STUDENT_PRACTICE_HISTORY,
            stats: {
                totalSessions: total,
                averageScore: avgScore,
                masteredStances: mastered,
                weakStances: weak,
                currentStreak: `${uniqueDays.size} Days`
            }
        });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

module.exports = router;
