// Sistema de Autenticación y Gestión de Usuarios
class AuthSystem {
    constructor() {
        this.users = JSON.parse(localStorage.getItem('cancionero_users')) || {};
        this.currentUser = JSON.parse(localStorage.getItem('cancionero_current_user')) || null;
        this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 horas
        this.init();
    }

    init() {
        this.checkSession();
        this.createAuthUI();
    }

    // Verificar sesión activa
    checkSession() {
        if (this.currentUser) {
            const now = new Date().getTime();
            if (now - this.currentUser.lastActivity > this.sessionTimeout) {
                this.logout();
                return false;
            }
            // Actualizar última actividad
            this.currentUser.lastActivity = now;
            localStorage.setItem('cancionero_current_user', JSON.stringify(this.currentUser));
            return true;
        }
        return false;
    }

    // Crear interfaz de autenticación
    createAuthUI() {
        if (!this.isAuthenticated()) {
            this.showAuthModal();
        }
    }

    // Verificar si el usuario está autenticado
    isAuthenticated() {
        return this.currentUser !== null && this.checkSession();
    }

    // Mostrar modal de autenticación
    showAuthModal() {
        const authModal = document.createElement('div');
        authModal.id = 'authModal';
        authModal.className = 'auth-modal';
        authModal.innerHTML = `
            <div class="auth-modal-content">
                <div class="auth-header">
                    <img src="logosolo.png" alt="Logo" class="auth-logo">
                    <h2>Cancionero Online</h2>
                    <p>Inicia sesión para acceder a tu cancionero personal</p>
                </div>
                
                <div class="auth-tabs">
                    <button class="auth-tab active" data-tab="login">Iniciar Sesión</button>
                    <button class="auth-tab" data-tab="register">Registrarse</button>
                </div>

                <!-- Formulario de Login -->
                <form class="auth-form active" id="loginForm">
                    <div class="form-group">
                        <label for="loginEmail">Email</label>
                        <input type="email" id="loginEmail" required>
                    </div>
                    <div class="form-group">
                        <label for="loginPassword">Contraseña</label>
                        <input type="password" id="loginPassword" required>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="rememberMe">
                            <span class="checkmark"></span>
                            Recordarme
                        </label>
                    </div>
                    <button type="submit" class="btn-auth">
                        <i class="fas fa-sign-in-alt"></i>
                        Iniciar Sesión
                    </button>
                    <div class="auth-error" id="loginError"></div>
                </form>

                <!-- Formulario de Registro -->
                <form class="auth-form" id="registerForm">
                    <div class="form-group">
                        <label for="registerName">Nombre Completo</label>
                        <input type="text" id="registerName" required>
                    </div>
                    <div class="form-group">
                        <label for="registerEmail">Email</label>
                        <input type="email" id="registerEmail" required>
                    </div>
                    <div class="form-group">
                        <label for="registerPassword">Contraseña</label>
                        <input type="password" id="registerPassword" required minlength="6">
                    </div>
                    <div class="form-group">
                        <label for="confirmPassword">Confirmar Contraseña</label>
                        <input type="password" id="confirmPassword" required>
                    </div>
                    <button type="submit" class="btn-auth">
                        <i class="fas fa-user-plus"></i>
                        Registrarse
                    </button>
                    <div class="auth-error" id="registerError"></div>
                </form>

                <div class="auth-footer">
                    <p>¿Olvidaste tu contraseña? <a href="#" id="forgotPassword">Recuperar</a></p>
                </div>
            </div>
        `;

        document.body.appendChild(authModal);
        this.bindAuthEvents();
    }

    // Vincular eventos de autenticación
    bindAuthEvents() {
        // Cambiar entre tabs
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchAuthTab(tabName);
            });
        });

        // Formulario de login
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Formulario de registro
        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Recuperar contraseña
        document.getElementById('forgotPassword').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleForgotPassword();
        });
    }

    // Cambiar tab de autenticación
    switchAuthTab(tabName) {
        // Actualizar tabs
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Actualizar formularios
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });
        document.getElementById(`${tabName}Form`).classList.add('active');

        // Limpiar errores
        this.clearAuthErrors();
    }

    // Manejar login
    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        this.clearAuthErrors();

        if (!this.validateEmail(email)) {
            this.showAuthError('loginError', 'Email inválido');
            return;
        }

        if (!this.users[email]) {
            this.showAuthError('loginError', 'Usuario no encontrado');
            return;
        }

        if (!this.verifyPassword(password, this.users[email].password)) {
            this.showAuthError('loginError', 'Contraseña incorrecta');
            return;
        }

        // Login exitoso
        this.currentUser = {
            email: email,
            name: this.users[email].name,
            loginTime: new Date().getTime(),
            lastActivity: new Date().getTime(),
            rememberMe: rememberMe
        };

        localStorage.setItem('cancionero_current_user', JSON.stringify(this.currentUser));
        
        // Actualizar última conexión del usuario
        this.users[email].lastLogin = new Date().getTime();
        localStorage.setItem('cancionero_users', JSON.stringify(this.users));

        this.hideAuthModal();
        this.showWelcomeMessage();
        this.updateUserInterface();
    }

    // Manejar registro
    async handleRegister() {
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        this.clearAuthErrors();

        // Validaciones
        if (name.length < 2) {
            this.showAuthError('registerError', 'El nombre debe tener al menos 2 caracteres');
            return;
        }

        if (!this.validateEmail(email)) {
            this.showAuthError('registerError', 'Email inválido');
            return;
        }

        if (this.users[email]) {
            this.showAuthError('registerError', 'Este email ya está registrado');
            return;
        }

        if (password.length < 6) {
            this.showAuthError('registerError', 'La contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (password !== confirmPassword) {
            this.showAuthError('registerError', 'Las contraseñas no coinciden');
            return;
        }

        // Crear usuario
        this.users[email] = {
            name: name,
            email: email,
            password: this.hashPassword(password),
            createdAt: new Date().getTime(),
            lastLogin: null,
            isActive: true
        };

        localStorage.setItem('cancionero_users', JSON.stringify(this.users));

        // Auto-login después del registro
        this.currentUser = {
            email: email,
            name: name,
            loginTime: new Date().getTime(),
            lastActivity: new Date().getTime(),
            rememberMe: false
        };

        localStorage.setItem('cancionero_current_user', JSON.stringify(this.currentUser));

        this.hideAuthModal();
        this.showWelcomeMessage(true);
        this.updateUserInterface();
    }

    // Manejar recuperación de contraseña
    handleForgotPassword() {
        const email = prompt('Ingresa tu email para recuperar la contraseña:');
        if (email && this.validateEmail(email)) {
            if (this.users[email]) {
                // En una aplicación real, aquí se enviaría un email
                alert('Se ha enviado un enlace de recuperación a tu email (simulado)');
                
                // Para demo, mostrar la contraseña (NO hacer esto en producción)
                const tempPassword = this.generateTempPassword();
                this.users[email].password = this.hashPassword(tempPassword);
                localStorage.setItem('cancionero_users', JSON.stringify(this.users));
                
                alert(`Tu nueva contraseña temporal es: ${tempPassword}\nCámbiala después de iniciar sesión.`);
            } else {
                alert('Email no encontrado');
            }
        }
    }

    // Cerrar sesión
    logout() {
        this.currentUser = null;
        localStorage.removeItem('cancionero_current_user');
        this.updateUserInterface();
        this.showAuthModal();
    }

    // Ocultar modal de autenticación
    hideAuthModal() {
        const authModal = document.getElementById('authModal');
        if (authModal) {
            authModal.remove();
        }
    }

    // Mostrar mensaje de bienvenida
    showWelcomeMessage(isNewUser = false) {
        const message = isNewUser 
            ? `¡Bienvenido ${this.currentUser.name}! Tu cuenta ha sido creada exitosamente.`
            : `¡Hola ${this.currentUser.name}! Bienvenido de vuelta.`;

        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'welcome-message';
        welcomeDiv.innerHTML = `
            <div class="welcome-content">
                <i class="fas fa-check-circle"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(welcomeDiv);

        setTimeout(() => {
            welcomeDiv.classList.add('show');
        }, 100);

        setTimeout(() => {
            welcomeDiv.classList.remove('show');
            setTimeout(() => welcomeDiv.remove(), 300);
        }, 3000);
    }

    // Actualizar interfaz de usuario
    updateUserInterface() {
        if (this.isAuthenticated()) {
            // Mostrar información del usuario en el header
            this.addUserMenu();
            // Habilitar funcionalidades de la app
            document.body.classList.add('authenticated');
        } else {
            // Ocultar funcionalidades
            document.body.classList.remove('authenticated');
            this.removeUserMenu();
        }
    }

    // Agregar menú de usuario
    addUserMenu() {
        const headerActions = document.querySelector('.header-actions');
        
        // Remover menú existente si existe
        const existingMenu = document.getElementById('userMenu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const userMenu = document.createElement('div');
        userMenu.id = 'userMenu';
        userMenu.className = 'user-menu';
        userMenu.innerHTML = `
            <button class="user-menu-btn" id="userMenuBtn">
                <i class="fas fa-user-circle"></i>
                <span class="user-name">${this.currentUser.name}</span>
                <i class="fas fa-chevron-down"></i>
            </button>
            <div class="user-dropdown" id="userDropdown">
                <div class="user-info">
                    <strong>${this.currentUser.name}</strong>
                    <small>${this.currentUser.email}</small>
                </div>
                <hr>
                <button class="dropdown-item" id="userProfile">
                    <i class="fas fa-user-edit"></i>
                    Mi Perfil
                </button>
                <button class="dropdown-item" id="userSettings">
                    <i class="fas fa-cog"></i>
                    Configuración
                </button>
                <hr>
                <button class="dropdown-item logout-btn" id="logoutBtn">
                    <i class="fas fa-sign-out-alt"></i>
                    Cerrar Sesión
                </button>
            </div>
        `;

        headerActions.appendChild(userMenu);
        this.bindUserMenuEvents();
    }

    // Remover menú de usuario
    removeUserMenu() {
        const userMenu = document.getElementById('userMenu');
        if (userMenu) {
            userMenu.remove();
        }
    }

    // Vincular eventos del menú de usuario
    bindUserMenuEvents() {
        const userMenuBtn = document.getElementById('userMenuBtn');
        const userDropdown = document.getElementById('userDropdown');
        const logoutBtn = document.getElementById('logoutBtn');

        userMenuBtn.addEventListener('click', () => {
            userDropdown.classList.toggle('show');
        });

        // Cerrar dropdown al hacer click fuera
        document.addEventListener('click', (e) => {
            if (!userMenuBtn.contains(e.target)) {
                userDropdown.classList.remove('show');
            }
        });

        logoutBtn.addEventListener('click', () => {
            this.logout();
        });

        // Eventos de perfil y configuración (para futuras funcionalidades)
        document.getElementById('userProfile').addEventListener('click', () => {
            this.showUserProfile();
        });

        document.getElementById('userSettings').addEventListener('click', () => {
            this.showUserSettings();
        });
    }

    // Mostrar perfil de usuario
    showUserProfile() {
        alert('Funcionalidad de perfil en desarrollo');
    }

    // Mostrar configuración de usuario
    showUserSettings() {
        alert('Funcionalidad de configuración en desarrollo');
    }

    // Utilidades
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    hashPassword(password) {
        // En producción, usar una librería de hashing segura como bcrypt
        // Esto es solo para demo
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    verifyPassword(password, hash) {
        return this.hashPassword(password) === hash;
    }

    generateTempPassword() {
        return Math.random().toString(36).slice(-8);
    }

    showAuthError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    clearAuthErrors() {
        document.querySelectorAll('.auth-error').forEach(error => {
            error.textContent = '';
            error.style.display = 'none';
        });
    }

    // Obtener información del usuario actual
    getCurrentUser() {
        return this.currentUser;
    }

    // Verificar si el usuario tiene permisos específicos
    hasPermission(permission) {
        // Para futuras funcionalidades de roles y permisos
        return this.isAuthenticated();
    }
}

// Inicializar sistema de autenticación
let authSystem;
document.addEventListener('DOMContentLoaded', () => {
    authSystem = new AuthSystem();
}); 