const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function register(req, res, next) {
  try {
    const { username, password, email } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Validate username (alphanumeric, 3-30 chars)
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return res.status(400).json({ error: 'Username must be 3-30 characters and contain only letters, numbers, and underscores' });
    }
    
    // Validate password (at least 6 characters)
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Check if username already exists
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    
    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await User.findByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ error: 'Email already exists' });
      }
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user (unverified by default, unless username is "alex")
    const user = await User.create(username, passwordHash, email || null, false, false);
    
    // Set session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.is_admin = user.is_admin;
    req.session.is_verified = user.is_verified;
    
    res.status(201).json({
      id: user.id,
      username: user.username,
      email: user.email,
      is_admin: user.is_admin,
      is_verified: user.is_verified,
      message: user.is_verified ? 'Registration successful' : 'Registration successful. Please wait for admin approval.'
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Find user
    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Check password - try temporary password first if it exists
    let passwordMatch = false;
    let usingTemporaryPassword = false;
    
    if (user.temporary_password_hash) {
      passwordMatch = await bcrypt.compare(password, user.temporary_password_hash);
      if (passwordMatch) {
        usingTemporaryPassword = true;
      }
    }
    
    // If temporary password didn't match, try regular password
    if (!passwordMatch && user.password_hash) {
      passwordMatch = await bcrypt.compare(password, user.password_hash);
    }
    
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Check if user is verified
    if (!user.is_verified) {
      return res.status(403).json({ 
        error: 'Your account is pending admin approval. Please wait for verification.' 
      });
    }
    
    // If using temporary password, require password change
    if (usingTemporaryPassword) {
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.is_admin = user.is_admin;
      req.session.is_verified = user.is_verified;
      req.session.must_change_password = true;
      
      return res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        is_admin: user.is_admin,
        is_verified: user.is_verified,
        must_change_password: true,
        message: 'Please change your password'
      });
    }
    
    // Clear temporary password and must_change_password flag on successful login with regular password
    if (user.must_change_password && !usingTemporaryPassword) {
      await User.update(user.id, {
        temporary_password_hash: null,
        must_change_password: false
      });
    }
    
    // Set session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.is_admin = user.is_admin;
    req.session.is_verified = user.is_verified;
    req.session.must_change_password = false;
    
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      is_admin: user.is_admin,
      is_verified: user.is_verified
    });
  } catch (error) {
    next(error);
  }
}

function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ message: 'Logged out successfully' });
  });
}

async function getMe(req, res, next) {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      is_admin: user.is_admin,
      is_verified: user.is_verified
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  logout,
  getMe
};
