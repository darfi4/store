const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();

// Middleware - ВАЖНО: правильные пути
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory хранилище
const users = new Map();
const verificationCodes = new Map();

// Игры
const games = [
    { 
        id: 1, 
        name: 'Roblox', 
        category: 'Sandbox', 
        image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=250&fit=crop',
        description: 'Многопользовательская платформа с тысячами игр',
        accounts: 127
    },
    { 
        id: 2, 
        name: 'Minecraft', 
        category: 'Sandbox', 
        image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=250&fit=crop',
        description: 'Кубковый мир с безграничными возможностями',
        accounts: 89
    },
    { 
        id: 3, 
        name: 'Fortnite', 
        category: 'Shooter', 
        image: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?w=400&h=250&fit=crop',
        description: 'Королевская битва с строительством',
        accounts: 203
    }
];

const categories = [
    { id: 1, name: 'Shooter', icon: 'fas fa-crosshairs' },
    { id: 2, name: 'Sandbox', icon: 'fas fa-cube' },
    { id: 3, name: 'MMORPG', icon: 'fas fa-dragon' },
    { id: 4, name: 'Strategy', icon: 'fas fa-chess' }
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
    const { category, search } = req.query;
    let filteredGames = games;

    if (category && category !== 'all') {
        filteredGames = filteredGames.filter(game => 
            game.category.toLowerCase() === category.toLowerCase()
        );
    }

    if (search) {
        const searchLower = search.toLowerCase();
        filteredGames = filteredGames.filter(game =>
            game.name.toLowerCase().includes(searchLower)
        );
    }

    res.json(filteredGames);
});

app.get('/api/categories', (req, res) => {
    res.json(categories);
});

app.get('/api/games/search', (req, res) => {
    const query = req.query.q?.toLowerCase() || '';
    const results = games.filter(game => 
        game.name.toLowerCase().includes(query)
    ).slice(0, 6);
    res.json(results);
});

// Регистрация
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        console.log('📝 Registration attempt:', { name, email });
        
        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'Все поля обязательны для заполнения' 
            });
        }

        if (users.has(email)) {
            return res.status(400).json({
                success: false,
                error: 'Пользователь с таким email уже существует'
            });
        }

        // Генерация кода
        const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        verificationCodes.set(email, { 
            code: verificationCode, 
            expires: Date.now() + 30 * 60 * 1000 
        });

        // Сохранение пользователя
        users.set(email, { 
            id: Date.now(),
            name, 
            email, 
            password, 
            isVerified: false, 
            createdAt: new Date() 
        });

        console.log(`📧 Verification code for ${email}: ${verificationCode}`);

        // Отправка email
        const emailResult = await sendEmail(
            email,
            'Подтверждение регистрации - Kirieshka.store',
            `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #6366f1;">Добро пожаловать в Kirieshka.store! 🎮</h2>
                <p>Здравствуйте, <strong>${name}</strong>!</p>
                <p>Ваш код подтверждения:</p>
                <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f8fafc; border-radius: 8px; border: 2px dashed #6366f1;">
                    <span style="font-size: 32px; font-weight: bold; color: #e74c3c; letter-spacing: 3px;">${verificationCode}</span>
                </div>
                <p style="color: #6b7280;">Код действителен <strong>30 минут</strong>.</p>
            </div>
            `
        );

        res.json({ 
            success: true,
            message: emailResult.success 
                ? 'Код подтверждения отправлен на ваш email' 
                : 'Код сгенерирован (проверьте консоль Railway)',
            note: !emailResult.success ? 'Email не настроен. Код показан в логах Railway.' : undefined
        });

    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка сервера. Попробуйте позже.' 
        });
    }
});

// Подтверждение email
app.post('/api/verify-email', (req, res) => {
    try {
        const { email, code } = req.body;
        
        console.log('🔐 Verification attempt:', { email, code });
        
        const user = users.get(email);
        const storedCode = verificationCodes.get(email);

        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'Пользователь не найден'
            });
        }

        if (!storedCode) {
            return res.status(400).json({
                success: false,
                error: 'Код не найден. Запросите новый код.'
            });
        }

        if (storedCode.code !== code.toUpperCase()) {
            return res.status(400).json({
                success: false,
                error: 'Неверный код подтверждения'
            });
        }

        if (storedCode.expires < Date.now()) {
            verificationCodes.delete(email);
            return res.status(400).json({
                success: false,
                error: 'Код истёк. Запросите новый код.'
            });
        }

        // Активация аккаунта
        user.isVerified = true;
        verificationCodes.delete(email);

        console.log('✅ Email verified for:', email);

        res.json({
            success: true,
            message: 'Email успешно подтверждён! Теперь вы можете войти в систему.'
        });

    } catch (error) {
        console.error('❌ Verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка сервера'
        });
    }
});

// Логин
app.post('/api/login', (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = users.get(email);
        if (!user) {
            return res.status(400).json({ 
                success: false,
                error: 'Пользователь не найден' 
            });
        }

        if (!user.isVerified) {
            return res.status(400).json({
                success: false,
                error: 'Подтвердите email перед входом'
            });
        }

        if (user.password !== password) {
            return res.status(400).json({
                success: false,
                error: 'Неверный пароль'
            });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Ошибка сервера'
        });
    }
});

// Главная страница - ВАЖНО: правильный путь
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`✅ Health: http://localhost:${PORT}/api/health`);
    
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        console.log(`✅ Email configured for: ${process.env.EMAIL_USER}`);
    } else {
        console.log('❌ Email not configured. Set EMAIL_USER and EMAIL_PASS in Railway Variables');
    }
});