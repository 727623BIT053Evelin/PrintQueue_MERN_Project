const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        // Enforce that only the specific email can act as admin
        const ADMIN_EMAIL = 'evelinadmin@mcet.in';
        const isAdmin = user.isAdmin && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: isAdmin,
            token: generateToken(user._id),
        });
    } else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Restrict to @mcet.in domain
        if (!email.endsWith('@mcet.in')) {
            return res.status(400).json({ message: 'Registration restricted to @mcet.in emails only' });
        }

        // Only specific email can be admin
        const ADMIN_EMAIL = 'evelinadmin@mcet.in';
        const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

        const user = await User.create({
            name,
            email,
            password,
            isAdmin,
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { authUser, registerUser };
