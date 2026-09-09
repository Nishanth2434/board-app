const mongoose = require('mongoose');

const ListSchema = new mongoose.Schema({
  name: { type: String, required: true },
  order: { type: Number, required: true }
});

const BoardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  backgroundColor: { type: String, default: '#0079BF' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lists: [ListSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Board', BoardSchema);
