const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory хранилище
const users = new Map();
const verificationCodes = new Map();

// Игры
const games = [
    { id: 1, name: 'Roblox', category: 'Sandbox', image: 'https://via.placeholder.com/300x180/667eea/white?text=Roblox' },
    { id: 2, name: 'Minecraft', category: 'Sandbox', image: 'https://via.placeholder.com/300x180/764ba2/white?text=Minecraft' },
    { id: 3, name: 'Fortnite', category: 'Shooter', image: 'https://via.placeholder.com/300x180/ff6b6b/white?text=Fortnite' }
];

const categories = [
    { id: 1, name: 'MMORPG', icon: 'fa-gamepad' },
    { id: 2, name: 'Shooter', icon: 'fa-crosshairs' },
    { id: 3, name: 'Strategy', icon: 'fa-chess' }
];

// Функция отправки email
const sendEmail = async (to, subject, html) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            const code = html.match(/<strong>(\w+)<\/strong>/)?.[1];
            console.log(`📧 [EMAIL NOT CONFIGURED] Code for ${to}: ${code}`);
            return { success: false, testMode: true };
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: `"Kirieshka.store" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: html
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${to}`);
        return { success: true };
        
    } catch (error) {
        console.error('❌ Email sending failed:', error);
        const code = html.match(/<strong>(\w+)<\/strong>/)?.[1];
        if (code) console.log(`📧 [FALLBACK] Code for ${to}: ${code}`);
        return { success: false, error: error.message };
    }
};

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'API is working',
        emailConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS)
    });
});

app.get('/api/games', (req, res) => {
    res.json(games);
});

app.get('/api/categories', (req, res) => {
    res.json(categories);
});

app.get('/api/games/search', (req, res) => {
    const query = req.query.q?.toLowerCase() || '';
    const results = games.filter(game => game.name.toLowerCase().includes(query));
    res.json(results);
});

// Регистрация
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields required' });
        }

        if (users.has(email)) {
            return res.status(400).json({ error: 'User exists' });
        }

        const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        verificationCodes.set(email, { code: verificationCode, expires: Date.now() + 1800000 });

        users.set(email, { name, email, password, isVerified: false, createdAt: new Date() });

        console.log(`📧 Code for ${email}: ${verificationCode}`);

        const emailResult = await sendEmail(
            email,
            'Verify Email - Kirieshka.store',
            `<div><h2>Verify Email</h2><p>Code: <strong>${verificationCode}</strong></p></div>`
        );

        res.json({ 
            success: true,
            message: emailResult.success ? 'Code sent to email' : 'Code generated (check logs)'
        });

    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Подтверждение email
app.post('/api/verify-email', (req, res) => {
    try {
        const { email, code } = req.body;
        const user = users.get(email);
        const storedCode = verificationCodes.get(email);

        if (!user || !storedCode || storedCode.code !== code.toUpperCase()) {
            return res.status(400).json({ error: 'Invalid code' });
        }

        user.isVerified = true;
        verificationCodes.delete(email);

        res.json({ success: true, message: 'Email verified!' });

    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Логин
app.post('/api/login', (req, res) => {
    try {
        const { email, password } = req.body;
        const user = users.get(email);

        if (!user || !user.isVerified || user.password !== password) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        res.json({
            success: true,
            user: { name: user.name, email: user.email }
        });

    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Главная страница
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});