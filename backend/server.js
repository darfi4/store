const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/kirieshka_store', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    verificationCode: String,
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Game Schema
const gameSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: String,
    price: Number,
    image: String,
    isActive: { type: Boolean, default: true }
});

const Game = mongoose.model('Game', gameSchema);

// Email configuration (you'll need to set up your email service)
const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Routes

// Get all games
app.get('/api/games', async (req, res) => {
    try {
        const games = await Game.find({ isActive: true });
        res.json(games);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Search games
app.get('/api/games/search', async (req, res) => {
    try {
        const query = req.query.q;
        const games = await Game.find({
            name: { $regex: query, $options: 'i' },
            isActive: true
        }).limit(10);
        res.json(games);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// User registration
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate verification code
        const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        // Create user
        const user = new User({
            name,
            email,
            password: hashedPassword,
            verificationCode
        });

        await user.save();

        // Send verification email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Verify your email - Kirieshka.store',
            html: `
                <h2>Welcome to Kirieshka.store!</h2>
                <p>Your verification code: <strong>${verificationCode}</strong></p>
                <p>Enter this code on the website to complete your registration.</p>
            `
        };

        await transporter.sendMail(mailOptions);

        res.json({ message: 'Registration successful. Check your email for verification code.' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Verify email
app.post('/api/verify', async (req, res) => {
    try {
        const { email, code } = req.body;
        
        const user = await User.findOne({ email, verificationCode: code });
        if (!user) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        user.isVerified = true;
        user.verificationCode = undefined;
        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id }, 
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({ token, message: 'Email verified successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// User login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }

        if (!user.isVerified) {
            return res.status(400).json({ error: 'Please verify your email first' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Invalid password' });
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});