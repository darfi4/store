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
    { id: 1, name: 'Roblox', category: 'Sandbox', image: 'https://via.placeholder.com/300x180/667eea/white?text=Roblox' },
    { id: 2, name: 'Minecraft', category: 'Sandbox', image: 'https://via.placeholder.com/300x180/764ba2/white?text=Minecraft' },
    { id: 3, name: 'Fortnite', category: 'Shooter', image: 'https://via.placeholder.com/300x180/ff6b6b/white?text=Fortnite' },
    { id: 4, name: 'World of Warcraft', category: 'MMORPG', image: 'https://via.placeholder.com/300x180/4ecdc4/white?text=WoW' },
    { id: 5, name: 'CS:GO', category: 'Shooter', image: 'https://via.placeholder.com/300x180/45b7d1/white?text=CS:GO' },
    { id: 6, name: 'Dota 2', category: 'Strategy', image: 'https://via.placeholder.com/300x180/96ceb4/white?text=Dota+2' }
];

const categories = [
    { id: 1, name: 'MMORPG', icon: 'fa-gamepad' },
    { id: 2, name: 'Shooter', icon: 'fa-crosshairs' },
    { id: 3, name: 'Strategy', icon: 'fa-chess' },
    { id: 4, name: 'Sandbox', icon: 'fa-cube' }
];

// Настройка email транспорта - ИСПРАВЛЕНО: createTransport вместо createTransporter
const createTransporter = () => {
    // Проверяем наличие переменных окружения
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('❌ EMAIL_USER или EMAIL_PASS не настроены в Railway Variables');
        return null;
    }

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

// Отправка email
const sendEmail = async (to, subject, html) => {
    try {
        const transporter = createTransporter();
        
        if (!transporter) {
            console.log(`📧 [ТЕСТ] Email не настроен. Код для ${to}: ${html.match(/<strong>(\w+)<\/strong>/)?.[1]}`);
            return { success: false, testMode: true };
        }

        const mailOptions = {
            from: `"Kirieshka.store" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: html
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Email отправлен на ${to}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Ошибка отправки email:', error);
        
        // Показываем код в логах для тестирования
        const code = html.match(/<strong>(\w+)<\/strong>/)?.[1];
        if (code) {
            console.log(`📧 [ОШИБКА] Код для ${to}: ${code}`);
        }
        
        return { success: false, error: error.message };
    }
};

// API Routes
app.get('/api/health', (req, res) => {
    const emailConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
    res.json({ 
        status: 'OK', 
        message: 'API работает',
        emailConfigured: emailConfigured,
        emailUser: emailConfigured ? process.env.EMAIL_USER.replace(/(?<=.).(?=.*@)/g, '*') : 'Не настроен'
    });
});

// Получение игр с фильтрацией
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

// Категории
app.get('/api/categories', (req, res) => {
    res.json(categories);
});

// Поиск с подсказками
app.get('/api/games/search', (req, res) => {
    const query = req.query.q?.toLowerCase() || '';
    
    if (!query) {
        return res.json([]);
    }

    const results = games.filter(game =>
        game.name.toLowerCase().includes(query)
    ).slice(0, 8);

    res.json(results);
});

// Регистрация
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({ 
            success: false,
            error: 'Все поля обязательны' 
        });
    }

    // Простая валидация email
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
            error: 'Пользователь уже существует'
        });
    }

    // Генерация кода верификации
    const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    verificationCodes.set(email, {
        code: verificationCode,
        expires: Date.now() + 30 * 60 * 1000 // 30 минут
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

    console.log(`📧 Код верификации для ${email}: ${verificationCode}`);

    // Отправка email
    const emailResult = await sendEmail(
        email,
        'Подтверждение регистрации - Kirieshka.store',
        `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #667eea; text-align: center;">Добро пожаловать в Kirieshka.store! 🎮</h2>
            <p>Здравствуйте, <strong>${name}</strong>!</p>
            <p>Ваш код подтверждения:</p>
            <div style="text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; color: #ff6b6b; letter-spacing: 5px;">${verificationCode}</span>
            </div>
            <p>Код действителен <strong>30 минут</strong>.</p>
            <p>Если вы не регистрировались на Kirieshka.store, проигнорируйте это письмо.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px; text-align: center;">
                Kirieshka.store - безопасная продажа игровых аккаунтов<br>
                ${new Date().getFullYear()}
            </p>
        </div>
        `
    );

    res.json({ 
        success: true,
        message: emailResult.success 
            ? 'Код подтверждения отправлен на ваш email' 
            : 'Код сгенерирован (проверьте консоль Railway)',
        note: !emailResult.success ? 'Email не настроен. Код показан в логах Railway.' : undefined,
        verificationCode: verificationCode // Для отладки
    });
});

// Подтверждение email
app.post('/api/verify-email', (req, res) => {
    const { email, code } = req.body;
    
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

    res.json({
        success: true,
        message: 'Email успешно подтверждён! Теперь вы можете войти в систему.'
    });
});

// Логин
app.post('/api/login', (req, res) => {
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
});

// Запрос сброса пароля
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    
    const user = users.get(email);
    if (!user) {
        return res.status(400).json({
            success: false,
            error: 'Пользователь не найден'
        });
    }

    // Генерация кода сброса
    const resetCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    resetCodes.set(email, {
        code: resetCode,
        expires: Date.now() + 30 * 60 * 1000
    });

    console.log(`🔐 Код сброса пароля для ${email}: ${resetCode}`);

    // Отправка email
    const emailResult = await sendEmail(
        email,
        'Сброс пароля - Kirieshka.store',
        `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #667eea; text-align: center;">Сброс пароля 🔐</h2>
            <p>Здравствуйте, <strong>${user.name}</strong>!</p>
            <p>Ваш код для сброса пароля:</p>
            <div style="text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; color: #ff6b6b; letter-spacing: 5px;">${resetCode}</span>
            </div>
            <p>Код действителен <strong>30 минут</strong>.</p>
            <p>Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px; text-align: center;">
                Kirieshka.store - безопасная продажа игровых аккаунтов<br>
                ${new Date().getFullYear()}
            </p>
        </div>
        `
    );

    res.json({
        success: true,
        message: emailResult.success 
            ? 'Код сброса пароля отправлен на ваш email' 
            : 'Код сгенерирован (проверьте консоль Railway)',
        note: !emailResult.success ? 'Email не настроен. Код показан в логах Railway.' : undefined,
        resetCode: resetCode // Для отладки
    });
});

// Сброс пароля
app.post('/api/reset-password', (req, res) => {
    const { email, code, newPassword } = req.body;
    
    const user = users.get(email);
    const storedCode = resetCodes.get(email);

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
            error: 'Неверный код'
        });
    }

    if (storedCode.expires < Date.now()) {
        resetCodes.delete(email);
        return res.status(400).json({
            success: false,
            error: 'Код истёк. Запросите новый код.'
        });
    }

    // Обновление пароля
    user.password = newPassword;
    resetCodes.delete(email);

    res.json({
        success: true,
        message: 'Пароль успешно изменён! Теперь вы можете войти с новым паролем.'
    });
});

// Главная страница
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
    
    // Проверка конфигурации email
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        console.log(`✅ Email настроен: ${process.env.EMAIL_USER}`);
    } else {
        console.log('❌ Email не настроен. Добавь EMAIL_USER и EMAIL_PASS в Railway Variables');
    }
});