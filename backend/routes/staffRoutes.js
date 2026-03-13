const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { nanoid } = require('nanoid');
const path = require('path');
const fs = require('fs');
const LiveClass = require('../models/LiveClass');
const ClassSession = require('../models/ClassSession');
const Notification = require('../models/Notification');
const User = require('../models/User');
const staffAuth = require('../middleware/staffAuth');
const { sendClassNotificationEmail } = require('../utils/mailer');
const { generateClassReportPDF } = require('../utils/pdfGenerator');

// --- DASHBOARD ---
// @route   GET /api/staff/dashboard
router.get('/dashboard', staffAuth, async (req, res) => {
    try {
        const totalClasses = await LiveClass.countDocuments({ staffId: req.user.id });
        
        // Count unique students across all classes
        const classes = await LiveClass.find({ staffId: req.user.id });
        const studentIds = new Set();
        classes.forEach(c => c.studentsEnrolled.forEach(id => studentIds.add(id.toString())));
        const totalStudents = studentIds.size;

        const nextClass = await LiveClass.findOne({
            staffId: req.user.id,
            status: 'scheduled',
            scheduledAt: { $gte: new Date() }
        }).sort({ scheduledAt: 1 });

        const recentSessions = await ClassSession.find({ staffId: req.user.id })
            .sort({ conductedAt: -1 })
            .limit(5);

        const unreadNotifications = await Notification.countDocuments({
            userId: req.user.id,
            isRead: false
        });

        res.json({
            totalClasses,
            totalStudents,
            nextClass,
            recentSessions,
            notifications: unreadNotifications
        });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// --- CLASS MANAGEMENT ---
// @route   POST /api/staff/class/create
router.post('/class/create', staffAuth, async (req, res) => {
    try {
        const { title, description, scheduledAt, duration, maxStudents, mudrasList, language } = req.body;
        
        const classId = nanoid(10);
        const joinLink = `${process.env.CLIENT_URL}/class/join/${classId}`;

        const newClass = new LiveClass({
            classId,
            staffId: req.user.id,
            title,
            description,
            scheduledAt,
            duration,
            maxStudents,
            mudrasList,
            language,
            joinLink
        });

        await newClass.save();

        // Find students from the same institution or all active students
        const staff = await User.findById(req.user.id);
        const students = await User.find({
            role: 'student',
            institution_name: staff.institution_name
        });

        // Async sending notifications and emails
        Promise.all(students.map(async (student) => {
            const notification = new Notification({
                userId: student._id,
                title: 'New Class Scheduled',
                message: `Teacher ${staff.name} has scheduled a new class: ${title}`,
                type: 'class_scheduled',
                classId,
                joinLink
            });
            await notification.save();

            await sendClassNotificationEmail(
                student.email,
                student.name,
                staff.name,
                staff.institution_name,
                title,
                scheduledAt,
                duration,
                joinLink
            );
        })).catch(err => console.error('Error sending background emails/notifications:', err));

        res.json(newClass);
    } catch (err) {
        res.status(500).send('Creation Failed');
    }
});

// @route   GET /api/staff/classes
router.get('/classes', staffAuth, async (req, res) => {
    try {
        const { status } = req.query;
        let query = { staffId: req.user.id };
        if (status && status !== 'all') {
            query.status = status;
        }

        const classes = await LiveClass.find(query).sort({ scheduledAt: -1 });
        res.json(classes);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/staff/class/:classId
router.get('/class/:classId', staffAuth, async (req, res) => {
    try {
        console.log(`[Route Debug] Fetching classId: ${req.params.classId} for staffId: ${req.user.id}`);
        const liveClass = await LiveClass.findOne({ classId: req.params.classId, staffId: req.user.id })
            .populate('studentsEnrolled', 'name email');
        
        if (!liveClass) {
            console.warn(`[Route Warn] Class ${req.params.classId} not found or not owned by staff ${req.user.id}`);
            return res.status(404).json({ msg: 'Class not found' });
        }
        res.json(liveClass);
    } catch (err) {
        console.error(`[Route Error] ${err.message}`);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/staff/class/:classId
router.put('/class/:classId', staffAuth, async (req, res) => {
    try {
        const { scheduledAt } = req.body;
        const oldClass = await LiveClass.findOne({ classId: req.params.classId, staffId: req.user.id });
        if (!oldClass) return res.status(404).json({ msg: 'Class not found' });

        const updatedClass = await LiveClass.findOneAndUpdate(
            { classId: req.params.classId, staffId: req.user.id },
            { $set: req.body },
            { new: true }
        );

        if (scheduledAt && scheduledAt !== oldClass.scheduledAt.toISOString()) {
            // Resend notification if time changed
            const staff = await User.findById(req.user.id);
            const students = await User.find({ _id: { $in: updatedClass.studentsEnrolled } });

            Promise.all(students.map(async (student) => {
                await sendClassNotificationEmail(
                    student.email,
                    student.name,
                    staff.name,
                    staff.institution_name,
                    updatedClass.title,
                    scheduledAt,
                    updatedClass.duration,
                    updatedClass.joinLink
                );
            })).catch(err => console.error('Error resending update emails:', err));
        }

        res.json(updatedClass);
    } catch (err) {
        res.status(500).send('Update Failed');
    }
});

// @route   DELETE /api/staff/class/:classId
router.delete('/class/:classId', staffAuth, async (req, res) => {
    try {
        const liveClass = await LiveClass.findOne({ classId: req.params.classId, staffId: req.user.id });
        if (!liveClass) return res.status(404).json({ msg: 'Class not found' });
        if (liveClass.status !== 'scheduled') {
            return res.status(400).json({ msg: 'Only scheduled classes can be cancelled' });
        }

        const staff = await User.findById(req.user.id);
        const students = await User.find({ _id: { $in: liveClass.studentsEnrolled } });

        // Send cancellation emails
        Promise.all(students.map(async (student) => {
            // reuse sendClassNotificationEmail or create a delete one. For now just notification.
            const notification = new Notification({
                userId: student._id,
                title: 'Class Cancelled',
                message: `Teacher ${staff.name} has cancelled the class: ${liveClass.title}`,
                type: 'class_cancelled',
                classId: liveClass.classId
            });
            await notification.save();
        })).catch(err => console.error('Error sending cancellation notifications:', err));

        await LiveClass.findOneAndDelete({ classId: req.params.classId, staffId: req.user.id });
        res.json({ msg: 'Class cancelled' });
    } catch (err) {
        res.status(500).send('Deletion Failed');
    }
});

// --- LIVE CLASS ---
// @route   POST /api/staff/class/:classId/start
router.post('/class/:classId/start', staffAuth, async (req, res) => {
    try {
        const liveClass = await LiveClass.findOneAndUpdate(
            { classId: req.params.classId, staffId: req.user.id },
            { status: 'live' },
            { new: true }
        );
        if (!liveClass) return res.status(404).json({ msg: 'Class not found' });

        // Notifications to students
        const students = await User.find({ _id: { $in: liveClass.studentsEnrolled } });
        Promise.all(students.map(async (student) => {
            const notification = new Notification({
                userId: student._id,
                title: 'Class Started',
                message: `The class "${liveClass.title}" is now LIVE! Join now.`,
                type: 'class_started',
                classId: liveClass.classId,
                joinLink: liveClass.joinLink
            });
            await notification.save();
        })).catch(err => console.error('Error sending start notifications:', err));

        res.json({ msg: 'Class started', liveClass });
    } catch (err) {
        res.status(500).send('Failed to start class');
    }
});

// @route   POST /api/staff/class/:classId/end
router.post('/class/:classId/end', staffAuth, async (req, res) => {
    try {
        const { studentReports } = req.body;
        const liveClass = await LiveClass.findOne({ classId: req.params.classId, staffId: req.user.id });
        if (!liveClass) return res.status(404).json({ msg: 'Class not found' });

        // 1. Update status
        liveClass.status = 'ended';
        await liveClass.save();

        // 2. Process reports
        const processedReports = studentReports.map(report => {
            let totalBestScore = 0;
            const mudraCount = report.mudraScores.length;
            
            const suggestions = [];
            report.mudraScores.forEach(ms => {
                totalBestScore += ms.bestScore;
                if (ms.bestScore < 50) {
                    suggestions.push(`Practice ${ms.mudra} daily for 10 minutes`);
                } else if (ms.bestScore < 75) {
                    suggestions.push(`${ms.mudra} needs improvement. Focus on finger positions`);
                } else {
                    suggestions.push(`Good work on ${ms.mudra}. Maintain consistency`);
                }
            });

            const overallScore = mudraCount > 0 ? totalBestScore / mudraCount : 0;
            return {
                ...report,
                overallScore,
                suggestions
            };
        });

        const classAverage = processedReports.length > 0 
            ? processedReports.reduce((acc, r) => acc + r.overallScore, 0) / processedReports.length 
            : 0;

        // 5. Create Session
        const session = new ClassSession({
            classId: liveClass.classId,
            staffId: req.user.id,
            title: liveClass.title,
            conductedAt: new Date(),
            duration: liveClass.duration,
            mudrasCovered: liveClass.mudrasList,
            studentReports: processedReports,
            classAverage,
            totalStudents: processedReports.length
        });

        // 6. Generate PDF
        const staff = await User.findById(req.user.id);
        const dateStr = new Date().toISOString().split('T')[0];
        const pdfName = `${liveClass.classId}-${dateStr}.pdf`;
        const pdfPath = path.join(__dirname, `../reports/${pdfName}`);
        
        await generateClassReportPDF(session, staff, pdfPath);
        session.pdfPath = pdfPath;
        await session.save();

        res.json({ msg: 'Class ended and report generated', session });
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to end class');
    }
});

// --- REPORTS ---
// @route   GET /api/staff/reports
router.get('/reports', staffAuth, async (req, res) => {
    try {
        const sessions = await ClassSession.find({ staffId: req.user.id }).sort({ conductedAt: -1 });
        res.json(sessions);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/staff/report/:sessionId
router.get('/report/:sessionId', staffAuth, async (req, res) => {
    try {
        const session = await ClassSession.findOne({ _id: req.params.sessionId, staffId: req.user.id });
        if (!session) return res.status(404).json({ msg: 'Report not found' });
        res.json(session);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/staff/report/:sessionId/pdf
router.get('/report/:sessionId/pdf', staffAuth, async (req, res) => {
    try {
        const session = await ClassSession.findOne({ _id: req.params.sessionId, staffId: req.user.id });
        if (!session || !session.pdfPath) return res.status(404).json({ msg: 'PDF not found' });
        
        if (fs.existsSync(session.pdfPath)) {
            res.sendFile(session.pdfPath);
        } else {
            res.status(404).json({ msg: 'File missing on server' });
        }
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// --- STUDENTS ---
// @route   GET /api/staff/students
router.get('/students', staffAuth, async (req, res) => {
    try {
        // Unique students across all sessions
        const studentsData = await ClassSession.aggregate([
            { $match: { staffId: new mongoose.Types.ObjectId(req.user.id) } },
            { $unwind: "$studentReports" },
            { $group: {
                _id: "$studentReports.studentId",
                name: { $first: "$studentReports.studentName" },
                classesAttended: { $sum: 1 },
                avgOverallScore: { $avg: "$studentReports.overallScore" },
                lastActive: { $max: "$conductedAt" }
            }},
            { $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "userDetails"
            }},
            { $unwind: "$userDetails" },
            { $project: {
                studentId: "$_id",
                name: 1,
                email: "$userDetails.email",
                classesAttended: 1,
                avgOverallScore: 1,
                lastActive: 1
            }}
        ]);

        res.json(studentsData);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/staff/student/:studentId/progress
router.get('/student/:studentId/progress', staffAuth, async (req, res) => {
    try {
        const progress = await ClassSession.find({
            staffId: req.user.id,
            "studentReports.studentId": req.params.studentId
        })
        .select('title conductedAt studentReports')
        .sort({ conductedAt: 1 });

        const formattedProgress = progress.map(session => {
            const report = session.studentReports.find(r => r.studentId.toString() === req.params.studentId);
            return {
                title: session.title,
                date: session.conductedAt,
                report
            };
        });

        res.json(formattedProgress);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// --- NOTIFICATIONS ---
// @route   GET /api/staff/notifications
router.get('/notifications', staffAuth, async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(notifications);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// --- PROFILE ---
// @route   GET /api/staff/profile
router.get('/profile', staffAuth, async (req, res) => {
    try {
        const staff = await User.findById(req.user.id).select('-password');
        const classesTaught = await ClassSession.countDocuments({ staffId: req.user.id });
        
        // Count unique students guided
        const sessions = await ClassSession.find({ staffId: req.user.id });
        const studentIds = new Set();
        sessions.forEach(s => s.studentReports.forEach(r => studentIds.add(r.studentId.toString())));

        res.json({
            ...staff.toObject(),
            stats: {
                classesTaught,
                studentsReached: studentIds.size
            }
        });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
