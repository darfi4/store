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
const resetCodes = new Map();

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
    },
    { 
        id: 4, 
        name: 'Valorant', 
        category: 'Shooter', 
        image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=250&fit=crop',
        description: 'Тактический шутер с уникальными агентами',
        accounts: 156
    },
    { 
        id: 5, 
        name: 'CS:GO', 
        category: 'Shooter', 
        image: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?w=400&h=250&fit=crop',
        description: 'Классический тактический шутер',
        accounts: 312
    },
    { 
        id: 6, 
        name: 'GTA V', 
        category: 'Action', 
        image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=250&fit=crop',
        description: 'Открытый мир с безграничными возможностями',
        accounts: 178
    }
];

const categories = [
    { id: 1, name: 'Shooter', icon: 'fas fa-crosshairs', color: '#ff6b6b' },
    { id: 2, name: 'Sandbox', icon: 'fas fa-cube', color: '#4ecdc4' },
    { id: 3, name: 'MMORPG', icon: 'fas fa-dragon', color: '#45b7d1' },
    { id: 4, name: 'Strategy', icon: 'fas fa-chess', color: '#96ceb4' },
    { id: 5, name: 'Action', icon: 'fas fa-running', color: '#feca57' },
    { id: 6, name: 'Sports', icon: 'fas fa-football-ball', color: '#ff9ff3' }
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

// Регистрация - ФИКС БЕСКОНЕЧНОЙ ЗАГРУЗКИ
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

        // Проверка email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Неверный формат email'
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
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background: #fafafa;">
                <h2 style="color: #2c3e50; text-align: center; margin-bottom: 20px;">Добро пожаловать в Kirieshka.store! 🎮</h2>
                <p>Здравствуйте, <strong>${name}</strong>!</p>
                <p>Ваш код подтверждения:</p>
                <div style="text-align: center; margin: 30px 0; padding: 20px; background: white; border-radius: 8px; border: 2px dashed #3498db;">
                    <span style="font-size: 32px; font-weight: bold; color: #e74c3c; letter-spacing: 3px;">${verificationCode}</span>
                </div>
                <p style="color: #7f8c8d;">Код действителен <strong>30 минут</strong>.</p>
                <p style="color: #7f8c8d;">Если вы не регистрировались, проигнорируйте это письмо.</p>
            </div>
            `
        );

        // ВАЖНО: Всегда возвращаем success: true даже если email не отправился
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

// Запрос сброса пароля
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        const user = users.get(email);
        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'Пользователь не найден'
            });
        }

        const resetCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        resetCodes.set(email, {
            code: resetCode,
            expires: Date.now() + 30 * 60 * 1000
        });

        console.log(`🔐 Reset code for ${email}: ${resetCode}`);

        const emailResult = await sendEmail(
            email,
            'Сброс пароля - Kirieshka.store',
            `<div><h2>Сброс пароля</h2><p>Код: <strong>${resetCode}</strong></p></div>`
        );

        res.json({
            success: true,
            message: emailResult.success 
                ? 'Код сброса отправлен на email' 
                : 'Код сгенерирован (проверьте логи)'
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
    console.log(`✅ Health: http://localhost:${PORT}/api/health`);
});