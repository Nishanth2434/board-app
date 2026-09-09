require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Connect to MongoDB
const connectDB = async () => {
    let mongoUri = process.env.MONGO_URI;
    let isMemory = false;
    if (!mongoUri) {
        const mongoServer = await MongoMemoryServer.create();
        mongoUri = mongoServer.getUri();
        isMemory = true;
        console.log(`MongoDB Memory Server started at ${mongoUri}`);
    }
    
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected');

    if (isMemory) {
        const User = require('./models/User');
        const count = await User.countDocuments();
        if (count === 0) {
            console.log('In-memory DB is empty. Auto-seeding...');
            const seedDatabase = require('../seed');
            await seedDatabase();
        }
    }
};
connectDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/boards', require('./routes/boards'));
app.use('/api/cards', require('./routes/cards'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/notifications', require('./routes/notifications'));

// Socket.io for Real-time
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    
    const jwt = require('jsonwebtoken');
    jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET || 'fallback_secret', (err, decoded) => {
        if (err) return next(new Error('Authentication error'));
        socket.userId = decoded.user.id;
        next();
    });
});

io.on('connection', (socket) => {
    console.log('New client connected:', socket.userId);
    socket.join(socket.userId); // Join personal room for notifications

    socket.on('join_board', (boardId) => {
        socket.join(boardId);
        console.log(`User ${socket.userId} joined board ${boardId}`);
    });

    socket.on('leave_board', (boardId) => {
        socket.leave(boardId);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Serve frontend for all other routes
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
