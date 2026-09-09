# Collaborative Project Management Tool (Board App)

A full-stack, real-time Kanban board application styled like Trello.

## Tech Stack
- Frontend: HTML, CSS, Vanilla JS
- Backend: Node.js, Express.js
- Database: MongoDB (using `mongodb-memory-server` out-of-the-box for zero setup!)
- Real-time: Socket.io
- Auth: JWT + bcrypt

## Features
- Signup, Login, JWT Authentication
- Create Projects, Invite Members
- Kanban Board with drag-and-drop columns
- Task assignment, due dates, descriptions
- Comments thread per task
- Live real-time updates via Socket.io (no refresh needed)
- In-app notification bell

## How to Run

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the app:**
   ```bash
   npm start
   ```
   *Note: Because it uses an in-memory database by default for zero setup, `npm start` will automatically run the seed script if it detects the database is empty!*

3. **Optional manual seeding (if using external Mongo):**
   ```bash
   npm run seed
   ```

4. **Open in browser:**
   Go to `http://localhost:5000`

## Demo Login
The database is auto-seeded with 6 users and 3 projects.
- **Email:** `demo@boardapp.com`
- **Password:** `demo1234`
