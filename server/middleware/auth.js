const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function(req, res, next) {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ message: 'Auth Error: No token provided' });

  try {
    const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.user.id);
    if (!user) {
      return res.status(401).json({ message: 'Auth Error: User no longer exists' });
    }
    req.user = decoded.user;
    next();
  } catch (e) {
    res.status(500).send({ message: 'Invalid Token' });
  }
};
