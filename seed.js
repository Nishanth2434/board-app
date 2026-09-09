const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const User = require('./server/models/User');
const Board = require('./server/models/Board');
const Card = require('./server/models/Card');
const Comment = require('./server/models/Comment');

async function seedDatabase() {
    console.log('Clearing old data...');
    await User.deleteMany({});
    await Board.deleteMany({});
    await Card.deleteMany({});
    await Comment.deleteMany({});

    console.log('Creating users...');
    const salt = await bcrypt.genSalt(10);
    const demoPassword = await bcrypt.hash('demo1234', salt);

    const users = await User.insertMany([
        { username: 'demo', email: 'demo@boardapp.com', passwordHash: demoPassword, avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=demo' },
        { username: 'alice', email: 'alice@example.com', passwordHash: demoPassword, avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=alice' },
        { username: 'bob', email: 'bob@example.com', passwordHash: demoPassword, avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=bob' },
        { username: 'charlie', email: 'charlie@example.com', passwordHash: demoPassword, avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=charlie' },
        { username: 'diana', email: 'diana@example.com', passwordHash: demoPassword, avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=diana' },
        { username: 'evan', email: 'evan@example.com', passwordHash: demoPassword, avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=evan' }
    ]);

    const demoUser = users[0];

    console.log('Creating boards...');
    const defaultLists = [
        { name: 'To Do', order: 1 },
        { name: 'Doing', order: 2 },
        { name: 'Done', order: 3 }
    ];

    const b1 = new Board({
        name: 'Website Redesign',
        backgroundColor: '#0079BF', // Trello blue
        members: [users[0]._id, users[1]._id, users[2]._id],
        lists: defaultLists
    });
    const b2 = new Board({
        name: 'Mobile App Launch',
        backgroundColor: '#D29034', // Trello orange
        members: [users[0]._id, users[3]._id, users[4]._id],
        lists: defaultLists
    });
    const b3 = new Board({
        name: 'Marketing Campaign',
        backgroundColor: '#519839', // Trello green
        members: [users[0]._id, users[1]._id, users[5]._id],
        lists: defaultLists
    });

    await Board.insertMany([b1, b2, b3]);

    console.log('Creating cards...');
    const cardsB1 = [
        { boardId: b1._id, listId: b1.lists[0]._id, title: 'Mockup Homepage', description: 'Figma mockups for the homepage', assignees: [users[1]._id], labels: ['blue', 'green'], order: 0 },
        { boardId: b1._id, listId: b1.lists[0]._id, title: 'Copywriting', description: 'Write copy for about page', assignees: [users[2]._id], labels: ['yellow'], order: 1 },
        { boardId: b1._id, listId: b1.lists[1]._id, title: 'Setup Repo', description: 'Initialize GitHub repository', assignees: [users[0]._id], labels: ['red'], order: 0 },
        { boardId: b1._id, listId: b1.lists[2]._id, title: 'Kickoff Meeting', description: 'Discuss goals', assignees: [users[0]._id], labels: [], order: 0 }
    ];
    
    const cardsB2 = [
        { boardId: b2._id, listId: b2.lists[0]._id, title: 'API Design', description: 'Design REST API', assignees: [users[3]._id], labels: ['purple'], order: 0 },
        { boardId: b2._id, listId: b2.lists[1]._id, title: 'Auth Implementation', description: 'JWT setup', assignees: [users[0]._id], labels: ['orange'], order: 0 },
        { boardId: b2._id, listId: b2.lists[2]._id, title: 'DB Schema', description: 'Setup MongoDB', assignees: [users[4]._id], labels: [], order: 0 }
    ];

    const cards = await Card.insertMany([...cardsB1, ...cardsB2]);

    console.log('Creating comments...');
    await Comment.insertMany([
        { cardId: cards[0]._id, userId: users[1]._id, text: 'I started working on this today.' },
        { cardId: cards[2]._id, userId: users[0]._id, text: 'Repo is live, invite sent to everyone.' }
    ]);

    console.log('Seed complete!');
}

async function runSeed() {
    let mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pmtool';
    try {
        await mongoose.connect(mongoUri);
        console.log(`Connected to MongoDB at ${mongoUri}`);
        await seedDatabase();
        process.exit(0);
    } catch (err) {
        console.error('Failed to connect to local MongoDB for seeding. If using Memory Server, it will auto-seed on start.');
        process.exit(0);
    }
}

if (require.main === module) {
    runSeed();
}

module.exports = seedDatabase;
