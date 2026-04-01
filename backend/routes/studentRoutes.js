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

module.exports = router;
