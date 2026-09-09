const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Card = require('../models/Card');
const Board = require('../models/Board');
const Notification = require('../models/Notification');

// Get all cards for a board
router.get('/board/:boardId', auth, async (req, res) => {
    try {
        const cards = await Card.find({ boardId: req.params.boardId }).populate('assignees', 'username avatarUrl email');
        res.json(cards);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Create card
router.post('/', auth, async (req, res) => {
    try {
        const { boardId, listId, title, description, assignees, labels, dueDate } = req.body;
        
        const cardsInList = await Card.find({ listId });
        const order = cardsInList.length;

        const card = new Card({
            boardId, listId, title, description, assignees, labels, dueDate, order
        });
        await card.save();

        const populatedCard = await Card.findById(card._id).populate('assignees', 'username avatarUrl email');
        
        const io = req.app.get('io');
        if (io) {
            io.to(boardId.toString()).emit('card_created', populatedCard);
        }

        if (assignees && assignees.length > 0) {
            assignees.forEach(async (aId) => {
                if (aId.toString() !== req.user.id) {
                    const notif = new Notification({
                        userId: aId, type: 'assignment', message: `You were assigned to card: ${title}`, relatedCardId: card._id
                    });
                    await notif.save();
                    if (io) io.to(aId.toString()).emit('notification', notif);
                }
            });
        }

        res.json(populatedCard);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Update card
router.put('/:id', auth, async (req, res) => {
    try {
        const { title, description, assignees, labels, dueDate, listId, order } = req.body;
        const card = await Card.findById(req.params.id);
        if (!card) return res.status(404).json({ message: 'Card not found' });

        const oldAssignees = card.assignees.map(a => a.toString());
        const oldListId = card.listId;

        if (title !== undefined) card.title = title;
        if (description !== undefined) card.description = description;
        if (assignees !== undefined) card.assignees = assignees;
        if (labels !== undefined) card.labels = labels;
        if (dueDate !== undefined) card.dueDate = dueDate;
        if (listId !== undefined) card.listId = listId;
        if (order !== undefined) card.order = order;

        await card.save();
        const populatedCard = await Card.findById(card._id).populate('assignees', 'username avatarUrl email');

        const io = req.app.get('io');
        if (io) {
            io.to(card.boardId.toString()).emit('card_updated', populatedCard);
        }

        // Notification for new assignees
        if (assignees) {
            assignees.forEach(async (aId) => {
                if (!oldAssignees.includes(aId.toString()) && aId.toString() !== req.user.id) {
                    const notif = new Notification({
                        userId: aId, type: 'assignment', message: `You were assigned to card: ${card.title}`, relatedCardId: card._id
                    });
                    await notif.save();
                    if (io) io.to(aId.toString()).emit('notification', notif);
                }
            });
        }

        // Notify assignees if list changes (status change)
        if (listId && listId.toString() !== oldListId.toString() && card.assignees && card.assignees.length > 0) {
            card.assignees.forEach(async (aId) => {
                if (aId.toString() !== req.user.id) {
                    const notif = new Notification({
                        userId: aId, type: 'status_change', message: `Card "${card.title}" moved.`, relatedCardId: card._id
                    });
                    await notif.save();
                    if (io) io.to(aId.toString()).emit('notification', notif);
                }
            });
        }

        res.json(populatedCard);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Delete card
router.delete('/:id', auth, async (req, res) => {
    try {
        const card = await Card.findById(req.params.id);
        if (!card) return res.status(404).json({ message: 'Card not found' });
        
        await Card.findByIdAndDelete(req.params.id);
        
        const io = req.app.get('io');
        if (io) {
            io.to(card.boardId.toString()).emit('card_deleted', { id: card._id, listId: card.listId });
        }

        res.json({ message: 'Card removed' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
