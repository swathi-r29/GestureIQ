// backend/routes/user.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Get user progress
router.get('/progress', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Update progress when mudra detected
router.post('/progress/update', auth, async (req, res) => {
  try {
    const { mudraName } = req.body;
    const user = await User.findById(req.user.id);

    if (!user.progress.detectedMudras.includes(mudraName)) {
      user.progress.detectedMudras.push(mudraName);
    }
    user.progress.practiceCount += 1;
    user.progress.lastPracticed = new Date();
    await user.save();

    res.json(user.progress);
  } catch {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get user dashboard data
router.get('/dashboard', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const totalMudras = 28;
    const masteredMudrasCount = user.progress.detectedMudras.length;
    const progressPercentage = Math.round((masteredMudrasCount / totalMudras) * 100);

    let calculatedLevel = 'Beginner';
    if (masteredMudrasCount >= 11 && masteredMudrasCount <= 20) {
      calculatedLevel = 'Intermediate';
    } else if (masteredMudrasCount > 20) {
      calculatedLevel = 'Advanced';
    }

    // A real streak system would require tracking exact dates practiced 
    // For now we simulate streak based on practice count logic or leave barebones
    const practiceStreak = user.progress.practiceCount > 0 ? 1 : 0;

    // Find the last item in the array for 'last practiced mudra'
    const lastPracticedMudra = masteredMudrasCount > 0
      ? user.progress.detectedMudras[masteredMudrasCount - 1]
      : 'None yet';

    res.json({
      user: {
        name: user.name,
        role: user.role,
        experience_level: user.experience_level
      },
      stats: {
        mastered: masteredMudrasCount,
        total: totalMudras,
        percentage: progressPercentage,
        currentLevel: calculatedLevel,
        lastPracticedMudra,
        practiceStreak
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;