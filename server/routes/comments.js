const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Comment = require('../models/Comment');
const Card = require('../models/Card');
const Notification = require('../models/Notification');

// Get comments for a card
router.get('/card/:cardId', auth, async (req, res) => {
    try {
        const comments = await Comment.find({ cardId: req.params.cardId }).populate('userId', 'username avatarUrl email').sort({ createdAt: 1 });
        res.json(comments);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Add a comment
router.post('/', auth, async (req, res) => {
    try {
        const { cardId, text } = req.body;
        const card = await Card.findById(cardId);
        if (!card) return res.status(404).json({ message: 'Card not found' });

        const comment = new Comment({ cardId, userId: req.user.id, text });
        await comment.save();

        const populatedComment = await Comment.findById(comment._id).populate('userId', 'username avatarUrl email');

        const io = req.app.get('io');
        if (io) {
            io.to(card.boardId.toString()).emit('comment_added', populatedComment);
        }

        // Notify assignees if someone else comments
        if (card.assignees && card.assignees.length > 0) {
            card.assignees.forEach(async (aId) => {
                if (aId.toString() !== req.user.id) {
                    const notif = new Notification({
                        userId: aId, type: 'comment', message: `New comment on card: ${card.title}`, relatedCardId: card._id
                    });
                    await notif.save();
                    if (io) io.to(aId.toString()).emit('notification', notif);
                }
            });
        }

        res.json(populatedComment);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Delete comment
router.delete('/:id', auth, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });
        
        if (comment.userId.toString() !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });

        await Comment.findByIdAndDelete(req.params.id);

        const card = await Card.findById(comment.cardId);
        const io = req.app.get('io');
        if (io && card) {
            io.to(card.boardId.toString()).emit('comment_deleted', { id: comment._id, cardId: comment.cardId });
        }

        res.json({ message: 'Comment removed' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
