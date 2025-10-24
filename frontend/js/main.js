// Mock data for demonstration
const gamesData = {
    categories: [
        { id: 1, name: 'MMORPG', icon: 'fa-gamepad' },
        { id: 2, name: 'Shooter', icon: 'fa-crosshairs' },
        { id: 3, name: 'Strategy', icon: 'fa-chess' },
        { id: 4, name: 'Sandbox', icon: 'fa-cube' }
    ],
    games: [
        { id: 1, name: 'Roblox', category: 'Sandbox', image: 'https://via.placeholder.com/300x150?text=Roblox' },
        { id: 2, name: 'Minecraft', category: 'Sandbox', image: 'https://via.placeholder.com/300x150?text=Minecraft' },
        { id: 3, name: 'Fortnite', category: 'Shooter', image: 'https://via.placeholder.com/300x150?text=Fortnite' },
        { id: 4, name: 'World of Warcraft', category: 'MMORPG', image: 'https://via.placeholder.com/300x150?text=WoW' }
    ]
};

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

function loadCategories() {
    categoriesGrid.innerHTML = gamesData.categories.map(category => `
        <div class="category-card" data-category="${category.name}">
            <i class="fas ${category.icon}"></i>
            <h3>${category.name}</h3>
        </div>
    `).join('');
}

function loadGames() {
    gamesGrid.innerHTML = gamesData.games.map(game => `
        <div class="game-card" data-game="${game.name}">
            <img src="${game.image}" alt="${game.name}">
            <h3>${game.name}</h3>
            <p>${game.category}</p>
        </div>
    `).join('');
}

function setupEventListeners() {
    // Search functionality
    searchInput.addEventListener('input', function(e) {
        const query = e.target.value.toLowerCase();
        if (query.length > 2) {
            showSearchSuggestions(query);
        } else {
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

function showSearchSuggestions(query) {
    const suggestions = gamesData.games.filter(game => 
        game.name.toLowerCase().includes(query)
    );
    
    if (suggestions.length > 0) {
        searchSuggestions.innerHTML = suggestions.map(game => `
            <div class="search-suggestion-item" data-game="${game.name}">
                ${game.name} - ${game.category}
            </div>
        `).join('');
        searchSuggestions.style.display = 'block';
        
        // Add click event to suggestions
        document.querySelectorAll('.search-suggestion-item').forEach(item => {
            item.addEventListener('click', function() {
                searchInput.value = this.getAttribute('data-game');
                searchSuggestions.style.display = 'none';
                // Here you would typically navigate to the game page
                alert(`Переход к игре: ${this.getAttribute('data-game')}`);
            });
        });
    } else {
        searchSuggestions.style.display = 'none';
    }
}

function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    
    // Here you would make an API call to your backend
    console.log('Login attempt:', { email, password });
    alert('Функция входа в разработке');
    loginModal.style.display = 'none';
}

function handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const email = formData.get('email');
    const password = formData.get('password');
    
    // Here you would make an API call to your backend
    console.log('Registration attempt:', { name, email, password });
    alert('Функция регистрации в разработке. Код подтверждения будет отправлен на email.');
    registerModal.style.display = 'none';
}