class KirieshkaStore {
    constructor() {
        this.API_BASE = window.location.origin;
        this.currentUser = null;
        this.searchTimeout = null;
        this.init();
    }

    init() {
        console.log('🚀 Kirieshka Store initialized');
        this.loadCategories();
        this.loadGames();
        this.setupEventListeners();
        this.setupSearchSuggestions();
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
        grid.innerHTML = categories.map(cat => `
            <div class="category-card" onclick="store.filterByCategory('${cat.name}')">
                <i class="fas ${cat.icon}"></i>
                <h3>${cat.name}</h3>
            </div>
        `).join('');
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
        if (games.length === 0) {
            grid.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>Игры не найдены</h3>
                    <p>Попробуйте изменить поисковый запрос или выбрать другую категорию</p>
                </div>
            `;
        } else {
            grid.innerHTML = games.map(game => `
                <div class="game-card">
                    <img src="${game.image}" alt="${game.name}" 
                         loading="lazy"
                         onerror="this.src='https://via.placeholder.com/300x180/667eea/white?text=${game.name}'">
                    <h3>${game.name}</h3>
                    <p class="game-category">${game.category}</p>
                    <button class="btn btn-primary" onclick="store.viewAccounts('${game.name}')">
                        Смотреть аккаунты (${Math.floor(Math.random() * 50) + 10})
                    </button>
                </div>
            `).join('');
        }
    }

    // Фильтрация по категории
    filterByCategory(category) {
        console.log('Filtering by category:', category);
        this.loadGames(category);
        
        // Обновляем активную категорию
        document.querySelectorAll('.category-card').forEach(card => {
            if (card.textContent.includes(category)) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });
    }

    // Популярные подсказки поиска
    setupSearchSuggestions() {
        const popularSearches = ['Roblox', 'Minecraft', 'Fortnite', 'CS:GO', 'Valorant'];
        const searchSection = document.querySelector('.search-section .container');
        
        // Создаем контейнер для популярных поисков
        const suggestionsHTML = `
            <div class="popular-searches">
                <p>Популярные поиски:</p>
                <div class="search-tags">
                    ${popularSearches.map(game => `
                        <span class="search-tag" onclick="store.selectSuggestion('${game}')">${game}</span>
                    `).join('')}
                </div>
            </div>
        `;
        
        // Добавляем после поисковой строки
        const searchBox = searchSection.querySelector('.search-box');
        searchBox.insertAdjacentHTML('afterend', suggestionsHTML);
    }

    // Поиск
    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        const searchBox = document.querySelector('.search-box');

        // Создаем контейнер для подсказок если его нет
        if (!document.getElementById('searchSuggestions')) {
            const suggestions = document.createElement('div');
            suggestions.id = 'searchSuggestions';
            suggestions.className = 'search-suggestions';
            searchBox.appendChild(suggestions);
        }

        // Поиск с задержкой
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

        // Поиск по кнопке
        searchBtn.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                this.performSearch(query);
            }
            this.hideSearchSuggestions();
        });

        // Поиск по Enter
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = e.target.value.trim();
                if (query) {
                    this.performSearch(query);
                }
                this.hideSearchSuggestions();
            }
        });

        // Закрытие подсказок при клике вне
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-box')) {
                this.hideSearchSuggestions();
            }
        });
    }

    hideSearchSuggestions() {
        const suggestions = document.getElementById('searchSuggestions');
        if (suggestions) {
            suggestions.style.display = 'none';
        }
    }

    async showSearchSuggestions(query) {
        try {
            const response = await fetch(`${this.API_BASE}/api/games/search?q=${encodeURIComponent(query)}`);
            const suggestions = await response.json();
            this.renderSearchSuggestions(suggestions, query);
        } catch (error) {
            console.error('Search suggestions error:', error);
        }
    }

    renderSearchSuggestions(suggestions, query) {
        const container = document.getElementById('searchSuggestions');
        
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
        searchInput.value = gameName;
        searchInput.focus();
        this.hideSearchSuggestions();
        this.performSearch(gameName);
    }

    async performSearch(query) {
        try {
            const response = await fetch(`${this.API_BASE}/api/games?search=${encodeURIComponent(query)}`);
            const games = await response.json();
            this.renderGames(games);
            
            // Прокручиваем к результатам
            document.getElementById('games').scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    // Модальные окна
    setupModals() {
        // Логин
        document.getElementById('loginBtn').addEventListener('click', () => {
            this.showModal('loginModal');
            this.showAuthStep('loginStep');
        });

        // Регистрация
        document.getElementById('registerBtn').addEventListener('click', () => {
            this.showModal('registerModal');
            this.showAuthStep('registerStep');
        });

        // Футер ссылки
        const footerLogin = document.getElementById('footerLogin');
        const footerRegister = document.getElementById('footerRegister');
        
        if (footerLogin) {
            footerLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.showModal('loginModal');
                this.showAuthStep('loginStep');
            });
        }

        if (footerRegister) {
            footerRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.showModal('registerModal');
                this.showAuthStep('registerStep');
            });
        }

        // Закрытие модалок
        document.querySelectorAll('.close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        // Клик вне модалки
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });

        // Формы
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('forgotPasswordForm').addEventListener('submit', (e) => this.handleForgotPassword(e));
        document.getElementById('resetPasswordForm').addEventListener('submit', (e) => this.handleResetPassword(e));
        document.getElementById('verifyEmailForm').addEventListener('submit', (e) => this.handleVerifyEmail(e));

        // Ссылки для навигации между шагами
        document.getElementById('showForgotPassword').addEventListener('click', (e) => {
            e.preventDefault();
            this.showAuthStep('forgotPasswordStep');
        });

        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.showAuthStep('loginStep');
        });

        document.getElementById('showRegister').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loginModal').style.display = 'none';
            this.showModal('registerModal');
            this.showAuthStep('registerStep');
        });

        document.getElementById('showLoginFromRegister').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('registerModal').style.display = 'none';
            this.showModal('loginModal');
            this.showAuthStep('loginStep');
        });
    }

    showModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
    }

    showAuthStep(step) {
        // Скрываем все шаги в текущей модалке
        const modal = document.querySelector('.modal:not([style*="display: none"])');
        if (modal) {
            modal.querySelectorAll('.auth-step').forEach(stepEl => {
                stepEl.style.display = 'none';
            });
            
            const targetStep = modal.querySelector(`#${step}`);
            if (targetStep) {
                targetStep.style.display = 'block';
            }
        }
    }

    // Обработчики форм
    async handleLogin(e) {
        e.preventDefault();
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
                alert(`✅ Добро пожаловать, ${result.user.name}!`);
                document.getElementById('loginModal').style.display = 'none';
                e.target.reset();
                this.updateAuthState(result.user);
            } else {
                alert(`❌ ${result.error}`);
            }
        } catch (error) {
            alert('❌ Ошибка при входе');
        } finally {
            this.setLoadingState(e.target, false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
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
                // Показываем шаг верификации
                this.showAuthStep('verifyEmailStep');
                document.getElementById('verifyEmail').value = data.email;
                document.getElementById('verificationCodeHint').innerHTML = 
                    result.note 
                    ? `<div style="color: #ff6b6b;">${result.note}</div><div>Код будет показан в консоли Railway</div>`
                    : `Код отправлен на <strong>${data.email}</strong>. Проверьте почту (включая папку "Спам").`;
            } else {
                alert(`❌ ${result.error}`);
            }
        } catch (error) {
            alert('❌ Ошибка при регистрации');
        } finally {
            this.setLoadingState(e.target, false);
        }
    }

    async handleVerifyEmail(e) {
        e.preventDefault();
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
                alert('✅ Email подтвержден! Теперь вы можете войти.');
                document.getElementById('registerModal').style.display = 'none';
                e.target.reset();
                this.showAuthStep('registerStep');
                
                // Показываем модалку логина
                this.showModal('loginModal');
                this.showAuthStep('loginStep');
            } else {
                alert(`❌ ${result.error}`);
            }
        } catch (error) {
            alert('❌ Ошибка при подтверждении email');
        } finally {
            this.setLoadingState(e.target, false);
        }
    }

    async handleForgotPassword(e) {
        e.preventDefault();
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
                document.getElementById('resetCodeHint').innerHTML = 
                    result.note 
                    ? `<div style="color: #ff6b6b;">${result.note}</div><div>Код будет показан в консоли Railway</div>`
                    : `Код отправлен на <strong>${email}</strong>. Проверьте почту (включая папку "Спам").`;
            } else {
                alert(`❌ ${result.error}`);
            }
        } catch (error) {
            alert('❌ Ошибка при восстановлении пароля');
        } finally {
            this.setLoadingState(e.target, false);
        }
    }

    async handleResetPassword(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            email: formData.get('email'),
            code: formData.get('code'),
            newPassword: formData.get('newPassword')
        };

        this.setLoadingState(e.target, true);

        try {
            const response = await fetch(`${this.API_BASE}/api/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (result.success) {
                alert('✅ Пароль успешно изменен!');
                document.getElementById('loginModal').style.display = 'none';
                e.target.reset();
                this.showAuthStep('loginStep');
            } else {
                alert(`❌ ${result.error}`);
            }
        } catch (error) {
            alert('❌ Ошибка при сбросе пароля');
        } finally {
            this.setLoadingState(e.target, false);
        }
    }

    setLoadingState(form, isLoading) {
        const button = form.querySelector('button[type="submit"]');
        const inputs = form.querySelectorAll('input');
        
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
            inputs.forEach(input => input.disabled = true);
            form.classList.add('loading');
        } else {
            button.disabled = false;
            button.innerHTML = button.getAttribute('data-original-text') || button.innerHTML;
            inputs.forEach(input => input.disabled = false);
            form.classList.remove('loading');
        }
    }

    updateAuthState(user) {
        this.currentUser = user;
        const authButtons = document.querySelector('.auth-buttons');
        authButtons.innerHTML = `
            <span style="color: white; margin-right: 1rem;">👋 ${user.name}</span>
            <button class="btn btn-outline" onclick="store.logout()">Выйти</button>
        `;
    }

    logout() {
        this.currentUser = null;
        const authButtons = document.querySelector('.auth-buttons');
        authButtons.innerHTML = `
            <button id="loginBtn" class="btn btn-outline">Войти</button>
            <button id="registerBtn" class="btn btn-primary">Регистрация</button>
        `;
        // Перепривязываем события после изменения DOM
        setTimeout(() => this.setupModals(), 100);
    }

    viewAccounts(gameName) {
        alert(`🎮 Аккаунты ${gameName}\n\nЗдесь будет список доступных аккаунтов для покупки\n\n(Функция в разработке)`);
    }

    setupEventListeners() {
        this.setupSearch();
        this.setupModals();
        
        // Сохраняем оригинальные тексты кнопок
        document.querySelectorAll('button[type="submit"]').forEach(btn => {
            btn.setAttribute('data-original-text', btn.innerHTML);
        });

        // Быстрая навигация по странице
        this.setupQuickNavigation();
    }

    setupQuickNavigation() {
        // Плавная прокрутка для якорных ссылок
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                if (targetId !== '#') {
                    const target = document.querySelector(targetId);
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            });
        });
    }

    getFallbackCategories() {
        return [
            { id: 1, name: 'MMORPG', icon: 'fa-gamepad' },
            { id: 2, name: 'Shooter', icon: 'fa-crosshairs' },
            { id: 3, name: 'Strategy', icon: 'fa-chess' },
            { id: 4, name: 'Sandbox', icon: 'fa-cube' }
        ];
    }
}

// Запускаем приложение когда DOM загружен
document.addEventListener('DOMContentLoaded', () => {
    window.store = new KirieshkaStore();
});

// Глобальные функции для onclick атрибутов
window.filterByCategory = (category) => window.store.filterByCategory(category);
window.viewAccounts = (gameName) => window.store.viewAccounts(gameName);
window.selectSuggestion = (gameName) => window.store.selectSuggestion(gameName);