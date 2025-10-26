class KirieshkaStore {
    constructor() {
        this.API_BASE = window.location.origin;
        this.currentUser = null;
        this.searchTimeout = null;
        this.init();
    }

    init() {
        console.log('🎮 Kirieshka Store initialized');
        this.checkAuthState(); // Проверяем авторизацию при загрузке
        this.loadGames();
        this.setupSearch();
        this.setupModals();
        this.setupGlobalListeners();
    }

    // Проверяем сохраненную сессию
    async checkAuthState() {
        const sessionId = localStorage.getItem('sessionId');
        if (sessionId) {
            try {
                const response = await fetch(`${this.API_BASE}/api/check-session`, {
                    headers: { 'Authorization': sessionId }
                });
                
                if (response.ok) {
                    const user = await response.json();
                    this.updateAuthState(user);
                } else {
                    localStorage.removeItem('sessionId');
                }
            } catch (error) {
                localStorage.removeItem('sessionId');
            }
        }
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
    }

    // Загрузка игр
    async loadGames(category = null) {
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
                        <button class="view-accounts-btn" onclick="store.viewAccounts('${game.name}')">
                            Смотреть аккаунты (${game.accounts})
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }

    filterByCategory(category) {
        this.loadGames(category);
        document.querySelectorAll('.category-card').forEach(card => {
            card.classList.toggle('active', card.textContent.includes(category));
        });
    }

    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');

        if (!searchInput || !searchBtn) return;

        searchInput.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            const query = e.target.value.trim();

            this.searchTimeout = setTimeout(() => {
                if (query.length > 0) {
                    this.performSearch(query);
                } else {
                    this.loadGames();
                }
            }, 300);
        });

        searchBtn.addEventListener('click', () => this.performSearch(searchInput.value.trim()));
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch(e.target.value.trim());
        });
    }

    async performSearch(query) {
        try {
            const response = await fetch(`${this.API_BASE}/api/games?search=${encodeURIComponent(query)}`);
            const games = await response.json();
            this.renderGames(games);
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    setupModals() {
        // Логин
        document.getElementById('loginBtn').addEventListener('click', () => {
            this.showModal('loginModal');
        });

        // Регистрация
        document.getElementById('registerBtn').addEventListener('click', () => {
            this.showModal('registerModal');
        });

        // Закрытие модалок
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) modal.style.display = 'none';
            });
        });

        // Формы
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('verifyEmailForm').addEventListener('submit', (e) => this.handleVerifyEmail(e));
    }

    showModal(modalId) {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    // УСКОРЕННАЯ регистрация
    async handleRegister(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            password: formData.get('password')
        };

        this.setLoadingState(form, true);

        try {
            const response = await fetch(`${this.API_BASE}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification(`Добро пожаловать, ${result.user.name}!`, 'success');
                this.showModal('none');
                form.reset();
                
                // Сохраняем сессию
                if (result.sessionId) {
                    localStorage.setItem('sessionId', result.sessionId);
                }
                
                this.updateAuthState(result.user);
            } else {
                this.showNotification(result.error, 'error');
            }
        } catch (error) {
            this.showNotification('Ошибка при регистрации', 'error');
        } finally {
            this.setLoadingState(form, false);
        }
    }

    async handleVerifyEmail(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const data = {
            email: formData.get('email'),
            code: formData.get('code')
        };

        this.setLoadingState(form, true);

        try {
            const response = await fetch(`${this.API_BASE}/api/verify-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Email подтвержден! Теперь вы можете войти.', 'success');
                this.showModal('loginModal');
                form.reset();
            } else {
                this.showNotification(result.error, 'error');
            }
        } catch (error) {
            this.showNotification('Ошибка при подтверждении email', 'error');
        } finally {
            this.setLoadingState(form, false);
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const data = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        this.setLoadingState(form, true);

        try {
            const response = await fetch(`${this.API_BASE}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification(`Добро пожаловать, ${result.user.name}!`, 'success');
                this.showModal('none');
                form.reset();
                
                // Сохраняем сессию
                if (result.sessionId) {
                    localStorage.setItem('sessionId', result.sessionId);
                }
                
                this.updateAuthState(result.user);
            } else {
                this.showNotification(result.error, 'error');
            }
        } catch (error) {
            this.showNotification('Ошибка при входе', 'error');
        } finally {
            this.setLoadingState(form, false);
        }
    }

    showAuthStep(step) {
        const modal = document.querySelector('.modal[style*="display: flex"]');
        if (!modal) return;

        modal.querySelectorAll('.auth-step').forEach(stepEl => {
            stepEl.style.display = 'none';
        });

        const targetStep = modal.querySelector(`#${step}`);
        if (targetStep) {
            targetStep.style.display = 'block';
        }
    }

    setLoadingState(form, isLoading) {
        const button = form.querySelector('button[type="submit"]');
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
        } else {
            button.disabled = false;
            button.innerHTML = button.getAttribute('data-original-text') || 'Отправить';
        }
    }

    updateAuthState(user) {
        this.currentUser = user;
        const authButtons = document.querySelector('.nav-auth');
        if (authButtons) {
            authButtons.innerHTML = `
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <a href="/profile.html" style="color: white; text-decoration: none;">
                        👋 ${user.name}
                    </a>
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
        localStorage.removeItem('sessionId');
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
            this.setupModals();
        }
    }

    viewAccounts(gameName) {
        this.showNotification(`🎮 Аккаунты ${gameName}<br><small>Функция в разработке</small>`, 'info');
    }

    showNotification(message, type = 'info') {
        // Удаляем старые уведомления
        const oldNotification = document.querySelector('.notification');
        if (oldNotification) oldNotification.remove();

        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation' : 'info'}"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Стили для уведомления
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1',
            color: 'white',
            padding: '1rem 1.5rem',
            borderRadius: '10px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            zIndex: '3000',
            animation: 'slideInRight 0.3s ease',
            maxWidth: '400px'
        });

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    window.store = new KirieshkaStore();
});

// Глобальные функции
window.filterByCategory = (category) => window.store.filterByCategory(category);
window.viewAccounts = (gameName) => window.store.viewAccounts(gameName);

// Добавляем стили для анимаций
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