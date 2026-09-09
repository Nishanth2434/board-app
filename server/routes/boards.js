const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Board = require('../models/Board');
const User = require('../models/User');

// Get user's boards
router.get('/', auth, async (req, res) => {
    try {
        const boards = await Board.find({ members: req.user.id }).populate('members', 'username avatarUrl email');
        res.json(boards);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get a single board
router.get('/:id', auth, async (req, res) => {
    try {
        const board = await Board.findById(req.params.id).populate('members', 'username avatarUrl email');
        if (!board) return res.status(404).json({ message: 'Board not found' });
        
        console.log("Checking board membership for user:", req.user.id);
        console.log("Board members are:", board.members.map(m => m._id.toString()));
        
        if (!board.members.some(m => m._id.toString() === req.user.id)) {
            return res.status(403).json({ message: 'Not a member of this board' });
        }
        res.json(board);
    } catch (err) {
        console.error("Error fetching board:", err);
        res.status(500).send('Server Error');
    }
});

// Create board
router.post('/', auth, async (req, res) => {
    try {
        const { name, backgroundColor } = req.body;
        const defaultLists = [
            { name: 'To Do', order: 1 },
            { name: 'Doing', order: 2 },
            { name: 'Done', order: 3 }
        ];
        const board = new Board({
            name,
            backgroundColor: backgroundColor || '#0079BF',
            members: [req.user.id],
            lists: defaultLists
        });
        await board.save();
        
        const populatedBoard = await Board.findById(board._id).populate('members', 'username avatarUrl email');
        res.json(populatedBoard);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Add member
router.post('/:id/members', auth, async (req, res) => {
    try {
        const { emailOrUsername } = req.body;
        const board = await Board.findById(req.params.id);
        
        if (!board.members.includes(req.user.id)) return res.status(403).json({ message: 'Unauthorized' });

        const userToAdd = await User.findOne({
            $or: [{ email: emailOrUsername }, { username: emailOrUsername }]
        });

        if (!userToAdd) return res.status(404).json({ message: 'User not found' });
        if (board.members.includes(userToAdd._id)) return res.status(400).json({ message: 'User already a member' });

        board.members.push(userToAdd._id);
        await board.save();
        
        const updatedBoard = await Board.findById(board._id).populate('members', 'username avatarUrl email');
        
        const io = req.app.get('io');
        if (io) io.to(board._id.toString()).emit('board_updated', updatedBoard);
        
        res.json(updatedBoard);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Add List
router.post('/:id/lists', auth, async (req, res) => {
    try {
        const { name } = req.body;
        const board = await Board.findById(req.params.id);
        if (!board.members.includes(req.user.id)) return res.status(403).json({ message: 'Unauthorized' });

        const order = board.lists.length + 1;
        board.lists.push({ name, order });
        await board.save();

        const io = req.app.get('io');
        if (io) io.to(board._id.toString()).emit('board_updated', board);

        res.json(board);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Delete List
router.delete('/:id/lists/:listId', auth, async (req, res) => {
    try {
        const board = await Board.findById(req.params.id);
        if (!board.members.includes(req.user.id)) return res.status(403).json({ message: 'Unauthorized' });

        board.lists = board.lists.filter(c => c._id.toString() !== req.params.listId);
        await board.save();

        const io = req.app.get('io');
        if (io) io.to(board._id.toString()).emit('board_updated', board);

        res.json(board);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
