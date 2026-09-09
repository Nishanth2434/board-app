const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

// Get all notifications for user
router.get('/', auth, async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50);
        res.json(notifications);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Mark all as read
router.post('/read', auth, async (req, res) => {
    try {
        await Notification.updateMany({ userId: req.user.id, read: false }, { $set: { read: true } });
        res.json({ message: 'Notifications marked as read' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
