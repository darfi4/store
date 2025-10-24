// API base URL
const API_BASE_URL = window.location.origin;

// DOM Elements
const categoriesGrid = document.getElementById('categoriesGrid');
const gamesGrid = document.getElementById('gamesGrid');
const searchInput = document.getElementById('searchInput');
const searchSuggestions = document.getElementById('searchSuggestions');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadCategories();
    loadGames();
    setupEventListeners();
});

async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/categories`);
        const categories = await response.json();
        
        categoriesGrid.innerHTML = categories.map(category => `
            <div class="category-card" data-category="${category.name}">
                <i class="fas ${category.icon}"></i>
                <h3>${category.name}</h3>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading categories:', error);
        // Fallback data
        categoriesGrid.innerHTML = `
            <div class="category-card">
                <i class="fas fa-gamepad"></i>
                <h3>MMORPG</h3>
            </div>
            <div class="category-card">
                <i class="fas fa-crosshairs"></i>
                <h3>Shooter</h3>
            </div>
            <div class="category-card">
                <i class="fas fa-chess"></i>
                <h3>Strategy</h3>
            </div>
            <div class="category-card">
                <i class="fas fa-cube"></i>
                <h3>Sandbox</h3>
            </div>
        `;
    }
}

async function loadGames() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/games`);
        const games = await response.json();
        
        gamesGrid.innerHTML = games.map(game => `
            <div class="game-card" data-game="${game.name}">
                <img src="${game.image}" alt="${game.name}" 
                     onerror="this.src='https://via.placeholder.com/300x150/667eea/white?text=${game.name}'">
                <h3>${game.name}</h3>
                <p>${game.category}</p>
                <p class="game-description">${game.description}</p>
                <button class="btn btn-primary">Смотреть аккаунты</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading games:', error);
    }
}

function setupEventListeners() {
    // Search functionality
    searchInput.addEventListener('input', function(e) {
        const query = e.target.value.toLowerCase();
        if (query.length > 1) {
            showSearchSuggestions(query);
        } else {
            searchSuggestions.style.display = 'none';
        }
    });

    // Close search suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
            searchSuggestions.style.display = 'none';
        }
    });

    // Modal functionality
    loginBtn.addEventListener('click', () => loginModal.style.display = 'block');
    registerBtn.addEventListener('click', () => registerModal.style.display = 'block');

    // Close modals
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    // Form submissions
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
}

async function showSearchSuggestions(query) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/games/search?q=${encodeURIComponent(query)}`);
        const suggestions = await response.json();
        
        if (suggestions.length > 0) {
            searchSuggestions.innerHTML = suggestions.map(game => `
                <div class="search-suggestion-item" data-game="${game.name}">
                    <i class="fas fa-gamepad"></i>
                    <span>${game.name}</span>
                    <small>${game.category}</small>
                </div>
            `).join('');
            searchSuggestions.style.display = 'block';
            
            // Add click event to suggestions
            document.querySelectorAll('.search-suggestion-item').forEach(item => {
                item.addEventListener('click', function() {
                    const gameName = this.querySelector('span').textContent;
                    searchInput.value = gameName;
                    searchSuggestions.style.display = 'none';
                    alert(`Поиск аккаунтов для игры: ${gameName}`);
                });
            });
        } else {
            searchSuggestions.style.display = 'none';
        }
    } catch (error) {
        console.error('Search error:', error);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`Успешный вход! Добро пожаловать, ${result.user.name}`);
            loginModal.style.display = 'none';
            e.target.reset();
        } else {
            alert(result.error);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Ошибка при входе. Попробуйте еще раз.');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const email = formData.get('email');
    const password = formData.get('password');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`${result.message}\nКод подтверждения: ${result.verificationCode}`);
            registerModal.style.display = 'none';
            e.target.reset();
        } else {
            alert(result.error);
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Ошибка при регистрации. Попробуйте еще раз.');
    }
}