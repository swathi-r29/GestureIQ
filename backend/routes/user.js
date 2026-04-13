// backend/routes/user.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const MudraContent = require('../models/MudraContent');

// Get mudra content for students
router.get('/mudra/content/:mudraName', auth, async (req, res) => {
  try {
    let content = await MudraContent.findOne({ mudraName: req.params.mudraName.toLowerCase() });

    // Auto-initialize if not found
    if (!content) {
      const doubleMudras = [
        'anjali', 'kapotha', 'karkata', 'svastika', 'dola', 'puspaputa', 
        'utsanga', 'sivalinga', 'katakavardhana', 'kartarisvastika', 
        'sakata', 'sankha', 'chakra', 'samputa', 'pasa', 'kilaka', 
        'matsya', 'kurma', 'varaha', 'garuda', 'nagabandha', 'bherunda', 'katva'
      ];
      const isDouble = doubleMudras.includes(req.params.mudraName.toLowerCase());
      
      content = new MudraContent({
        mudraName: req.params.mudraName.toLowerCase(),
        handType: isDouble ? 'double' : 'single'
      });
      await content.save();
    }

    // Ensure primaryImage has a fallback if not explicitly set
    const response = content.toObject ? content.toObject() : content;
    if (!response.primaryImage && response.images && response.images.length > 0) {
      response.primaryImage = response.images[0];
    }

    res.json(response);
  } catch (err) {
    console.error('API Error [/mudra/content/:mudraName]:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get user progress
router.get('/progress', auth, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      console.error('Auth middleware error: req.user or req.user.id missing');
      return res.status(401).json({ msg: 'Authorization denied' });
    }
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      console.warn(`User with ID ${req.user.id} not found in database`);
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Database Error in [/progress]:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Update progress when mudra detected
router.post('/progress/update', auth, async (req, res) => {
  try {
    const { mudraName, score } = req.body;
    const user = await User.findById(req.user.id);

    // Initialize mudraScores if it doesn't exist (for existing users)
    if (!user.progress.mudraScores) {
      user.progress.mudraScores = new Map();
    }

    if (!user.progress.detectedMudras.includes(mudraName)) {
      user.progress.detectedMudras.push(mudraName);
    }

    // Update best score if provided
    if (score) {
      const currentBest = user.progress.mudraScores.get(mudraName) || 0;
      if (score > currentBest) {
        user.progress.mudraScores.set(mudraName, score);
      }
    }

    user.progress.practiceCount += 1;
    user.progress.lastPracticed = new Date();
    await user.save();

    res.json(user.progress);
  } catch (err) {
    console.error(err);
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

    const LiveClass = require('../models/LiveClass');
    const nextClass = await LiveClass.findOne({
      status: 'scheduled',
      scheduledAt: { $gte: new Date() }
    }).populate('staffId', 'name institution_name');

    // Only return if it matches student's institution
    const dashboardNextClass = (nextClass && nextClass.staffId && nextClass.staffId.institution_name && user.institution_name &&
                                 nextClass.staffId.institution_name.toLowerCase() === user.institution_name.toLowerCase()) 
      ? nextClass 
      : null;

    res.json({
      user: {
        name: user.name,
        role: user.role,
        experience_level: user.experience_level,
        institution_name: user.institution_name
      },
      stats: {
        mastered: masteredMudrasCount,
        total: totalMudras,
        percentage: progressPercentage,
        currentLevel: calculatedLevel,
        lastPracticedMudra,
        practiceStreak
      },
      nextClass: dashboardNextClass
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;