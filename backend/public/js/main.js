class KirieshkaStore {
    constructor() {
        this.API_BASE = window.location.origin;
        this.currentUser = null;
        this.searchTimeout = null;
        this.isLoading = false;
        this.init();
    }

    init() {
        console.log('🎮 Kirieshka Store initialized');
        this.setupGlobalListeners();
        this.loadCategories();
        this.loadGames();
        this.setupSearch();
        this.setupModals();
    }

    // Глобальные обработчики
    setupGlobalListeners() {
        // Плавная прокрутка
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="#"]');
            if (link) {
                e.preventDefault();
                const target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });

        // Закрытие модалок по ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // Анимация при скролле
        this.setupScrollAnimations();
    }

    setupScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.category-card, .game-card, .feature-card').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'all 0.6s ease';
            observer.observe(el);
        });
    }

    // Загрузка категорий
    async loadCategories() {
        try {
            const response = await fetch(`${this.API_BASE}/api/categories`);
            const categories = await response.json();
            this.renderCategories(categories);
        } catch (error) {
            console.error('Error loading categories:', error);
            this.renderCategories(this.getFallbackCategories());
        }
    }

    renderCategories(categories) {
        const grid = document.getElementById('categoriesGrid');
        if (!grid) return;

        grid.innerHTML = categories.map(cat => `
            <div class="category-card" onclick="store.filterByCategory('${cat.name}')">
                <i class="${cat.icon}"></i>
                <h3>${cat.name}</h3>
            </div>
        `).join('');
    }

    // Загрузка игр
    async loadGames(category = null) {
        if (this.isLoading) return;
        this.isLoading = true;

        try {
            let url = `${this.API_BASE}/api/games`;
            if (category && category !== 'all') {
                url += `?category=${encodeURIComponent(category)}`;
            }
            
            const response = await fetch(url);
            const games = await response.json();
            this.renderGames(games);
        } catch (error) {
            console.error('Error loading games:', error);
            this.showError('Ошибка загрузки игр');
        } finally {
            this.isLoading = false;
        }
    }

    renderGames(games) {
        const grid = document.getElementById('gamesGrid');
        if (!grid) return;

        if (games.length === 0) {
            grid.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>Игры не найдены</h3>
                    <p>Попробуйте изменить поисковый запрос</p>
                </div>
            `;
        } else {
            grid.innerHTML = games.map(game => `
                <div class="game-card">
                    <img src="${game.image}" alt="${game.name}" 
                         loading="lazy"
                         onerror="this.src='https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=250&fit=crop'">
                    <div class="game-card-content">
                        <h3>${game.name}</h3>
                        <p class="game-category">${game.category}</p>
                        <p class="game-description">${game.description}</p>
                        <div class="game-accounts">
                            <span>Доступно аккаунтов: ${game.accounts || Math.floor(Math.random() * 50) + 10}</span>
                        </div>
                        <button class="view-accounts-btn" onclick="store.viewAccounts('${game.name}')">
                            Смотреть аккаунты
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }

    // Фильтрация
    filterByCategory(category) {
        this.loadGames(category);
        
        // Обновляем активную категорию
        document.querySelectorAll('.category-card').forEach(card => {
            card.classList.toggle('active', card.textContent.includes(category));
        });
    }

    // Поиск
    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');

        if (!searchInput || !searchBtn) return;

        // Поиск с дебаунсом
        searchInput.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            const query = e.target.value.trim();

            this.searchTimeout = setTimeout(() => {
                if (query.length > 0) {
                    this.showSearchSuggestions(query);
                } else {
                    this.hideSearchSuggestions();
                    this.loadGames();
                }
            }, 300);
        });

        // Поиск по кнопке и Enter
        searchBtn.addEventListener('click', () => this.performSearch(searchInput.value.trim()));
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch(e.target.value.trim());
        });

        // Закрытие подсказок
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-box')) {
                this.hideSearchSuggestions();
            }
        });
    }

    async showSearchSuggestions(query) {
        try {
            const response = await fetch(`${this.API_BASE}/api/games/search?q=${encodeURIComponent(query)}`);
            const suggestions = await response.json();
            this.renderSearchSuggestions(suggestions, query);
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    renderSearchSuggestions(suggestions, query) {
        const container = document.getElementById('searchSuggestions');
        if (!container) return;

        if (suggestions.length === 0) {
            container.innerHTML = `
                <div class="search-suggestion-item no-results">
                    <i class="fas fa-search"></i>
                    <span>Игра "${query}" не найдена</span>
                </div>
            `;
        } else {
            container.innerHTML = suggestions.map(game => `
                <div class="search-suggestion-item" onclick="store.selectSuggestion('${game.name}')">
                    <i class="fas fa-gamepad"></i>
                    <span>${game.name}</span>
                    <small>${game.category}</small>
                </div>
            `).join('');
        }
        
        container.style.display = 'block';
    }

    selectSuggestion(gameName) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = gameName;
            searchInput.focus();
        }
        this.hideSearchSuggestions();
        this.performSearch(gameName);
    }

    hideSearchSuggestions() {
        const container = document.getElementById('searchSuggestions');
        if (container) container.style.display = 'none';
    }

    async performSearch(query) {
        try {
            const response = await fetch(`${this.API_BASE}/api/games?search=${encodeURIComponent(query)}`);
            const games = await response.json();
            this.renderGames(games);
            
            // Прокрутка к результатам
            const gamesSection = document.getElementById('games');
            if (gamesSection) {
                gamesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    // Модальные окна
    setupModals() {
        // Логин
        this.setupModal('loginBtn', 'loginModal', () => this.showAuthStep('loginStep'));
        this.setupModal('registerBtn', 'registerModal', () => this.showAuthStep('registerStep'));

        // Формы
        this.setupForm('loginForm', this.handleLogin.bind(this));
        this.setupForm('registerForm', this.handleRegister.bind(this));
        this.setupForm('verifyEmailForm', this.handleVerifyEmail.bind(this));
        this.setupForm('forgotPasswordForm', this.handleForgotPassword.bind(this));

        // Навигация между шагами
        this.setupAuthNavigation();
    }

    setupModal(triggerId, modalId, callback) {
        const trigger = document.getElementById(triggerId);
        if (trigger) {
            trigger.addEventListener('click', () => {
                this.showModal(modalId);
                if (callback) callback();
            });
        }
    }

    setupForm(formId, handler) {
        const form = document.getElementById(formId);
        if (form) {
            form.addEventListener('submit', handler);
        }
    }

    setupAuthNavigation() {
        // Навигация между шагами аутентификации
        const navHandlers = {
            'showForgotPassword': () => this.showAuthStep('forgotPasswordStep'),
            'showLogin': () => this.showAuthStep('loginStep'),
            'showRegister': () => this.showRegister(),
            'showLoginFromRegister': () => this.showLogin()
        };

        Object.entries(navHandlers).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', (e) => {
                    e.preventDefault();
                    handler();
                });
            }
        });
    }

    showModal(modalId) {
        this.closeAllModals();
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        document.body.style.overflow = 'auto';
    }

    showAuthStep(step) {
        const modal = document.querySelector('.modal[style*="display: block"]');
        if (!modal) return;

        // Скрываем все шаги
        modal.querySelectorAll('.auth-step').forEach(stepEl => {
            stepEl.style.display = 'none';
        });

        // Показываем нужный шаг
        const targetStep = modal.querySelector(`#${step}`);
        if (targetStep) {
            targetStep.style.display = 'block';
        }
    }

    showLogin() {
        this.closeModal('registerModal');
        this.showModal('loginModal');
        this.showAuthStep('loginStep');
    }

    showRegister() {
        this.closeModal('loginModal');
        this.showModal('registerModal');
        this.showAuthStep('registerStep');
    }

    // Обработчики форм
    async handleLogin(e) {
        e.preventDefault();
        if (this.isLoading) return;

        const formData = new FormData(e.target);
        const data = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        this.setLoadingState(e.target, true);

        try {
            const response = await fetch(`${this.API_BASE}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (result.success) {
                this.showSuccess(`Добро пожаловать, ${result.user.name}!`);
                this.closeModal('loginModal');
                e.target.reset();
                this.updateAuthState(result.user);
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            this.showError('Ошибка при входе');
        } finally {
            this.setLoadingState(e.target, false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        if (this.isLoading) return;

        const formData = new FormData(e.target);
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            password: formData.get('password')
        };

        this.setLoadingState(e.target, true);

        try {
            const response = await fetch(`${this.API_BASE}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (result.success) {
                this.showAuthStep('verifyEmailStep');
                document.getElementById('verifyEmail').value = data.email;
                
                const hintElement = document.getElementById('verificationCodeHint');
                if (hintElement) {
                    hintElement.innerHTML = result.note 
                        ? `<span style="color: #f59e0b;">${result.note}</span><br>Код будет показан в консоли Railway`
                        : `Код отправлен на <strong>${data.email}</strong>. Проверьте почту (включая папку "Спам").`;
                }
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            this.showError('Ошибка при регистрации');
        } finally {
            this.setLoadingState(e.target, false);
        }
    }

    async handleVerifyEmail(e) {
        e.preventDefault();
        if (this.isLoading) return;

        const formData = new FormData(e.target);
        const data = {
            email: formData.get('email'),
            code: formData.get('code')
        };

        this.setLoadingState(e.target, true);

        try {
            const response = await fetch(`${this.API_BASE}/api/verify-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (result.success) {
                this.showSuccess('Email подтвержден! Теперь вы можете войти.');
                this.closeModal('registerModal');
                e.target.reset();
                this.showLogin();
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            this.showError('Ошибка при подтверждении email');
        } finally {
            this.setLoadingState(e.target, false);
        }
    }

    async handleForgotPassword(e) {
        e.preventDefault();
        if (this.isLoading) return;

        const email = document.getElementById('forgotEmail').value;

        this.setLoadingState(e.target, true);

        try {
            const response = await fetch(`${this.API_BASE}/api/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showAuthStep('resetPasswordStep');
                document.getElementById('resetEmail').value = email;
                this.showSuccess('Код отправлен на ваш email');
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            this.showError('Ошибка при восстановлении пароля');
        } finally {
            this.setLoadingState(e.target, false);
        }
    }

    // Утилиты
    setLoadingState(form, isLoading) {
        this.isLoading = isLoading;
        const button = form.querySelector('button[type="submit"]');
        const inputs = form.querySelectorAll('input');
        
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
            inputs.forEach(input => input.disabled = true);
            form.classList.add('loading');
        } else {
            button.disabled = false;
            const originalText = button.getAttribute('data-original-text') || 'Отправить';
            button.innerHTML = originalText;
            inputs.forEach(input => input.disabled = false);
            form.classList.remove('loading');
        }
    }

    updateAuthState(user) {
        this.currentUser = user;
        const authButtons = document.querySelector('.nav-auth');
        if (authButtons) {
            authButtons.innerHTML = `
                <div class="user-info">
                    <span>👋 ${user.name}</span>
                    <button class="auth-btn login-btn" onclick="store.logout()">
                        <i class="fas fa-sign-out-alt"></i>
                        <span>Выйти</span>
                    </button>
                </div>
            `;
        }
    }

    logout() {
        this.currentUser = null;
        const authButtons = document.querySelector('.nav-auth');
        if (authButtons) {
            authButtons.innerHTML = `
                <button class="auth-btn login-btn" id="loginBtn">
                    <i class="fas fa-sign-in-alt"></i>
                    <span>Войти</span>
                </button>
                <button class="auth-btn register-btn" id="registerBtn">
                    <i class="fas fa-user-plus"></i>
                    <span>Регистрация</span>
                </button>
            `;
            // Перепривязываем события
            setTimeout(() => this.setupModals(), 100);
        }
    }

    viewAccounts(gameName) {
        this.showSuccess(`🎮 Аккаунты ${gameName}<br><br>Здесь будет список доступных аккаунтов для покупки<br><small style="opacity: 0.7;">(Функция в разработке)</small>`);
    }

    // Уведомления
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // Удаляем старые уведомления
        const oldNotification = document.querySelector('.notification');
        if (oldNotification) oldNotification.remove();

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Стили для уведомления
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 3000;
            animation: slideInRight 0.3s ease;
            max-width: 400px;
        `;

        notification.querySelector('.notification-content').style.cssText = `
            display: flex;
            align-items: center;
            gap: 0.8rem;
        `;

        notification.querySelector('button').style.cssText = `
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            margin-left: auto;
        `;

        document.body.appendChild(notification);

        // Автоматическое скрытие
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    getFallbackCategories() {
        return [
            { id: 1, name: 'Shooter', icon: 'fas fa-crosshairs' },
            { id: 2, name: 'Sandbox', icon: 'fas fa-cube' },
            { id: 3, name: 'MMORPG', icon: 'fas fa-dragon' },
            { id: 4, name: 'Strategy', icon: 'fas fa-chess' }
        ];
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.store = new KirieshkaStore();
});

// Глобальные функции
window.filterByCategory = (category) => window.store.filterByCategory(category);
window.viewAccounts = (gameName) => window.store.viewAccounts(gameName);
window.selectSuggestion = (gameName) => window.store.selectSuggestion(gameName);

// CSS анимации для уведомлений
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);