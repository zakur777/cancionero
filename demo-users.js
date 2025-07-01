// Usuarios de demostración para pruebas
// Este archivo es solo para desarrollo y demostración

// Función para crear usuarios de prueba
function createDemoUsers() {
    const demoUsers = {
        'admin@cancionero.com': {
            name: 'Administrador',
            email: 'admin@cancionero.com',
            password: '123456789', // Hash de "admin123"
            createdAt: new Date().getTime(),
            lastLogin: null,
            isActive: true,
            role: 'admin'
        },
        'usuario@test.com': {
            name: 'Usuario de Prueba',
            email: 'usuario@test.com',
            password: '123456789', // Hash de "test123"
            createdAt: new Date().getTime(),
            lastLogin: null,
            isActive: true,
            role: 'user'
        },
        'musico@ejemplo.com': {
            name: 'Juan Músico',
            email: 'musico@ejemplo.com',
            password: '123456789', // Hash de "musica123"
            createdAt: new Date().getTime(),
            lastLogin: null,
            isActive: true,
            role: 'user'
        }
    };

    // Solo crear usuarios demo si no existen usuarios
    const existingUsers = JSON.parse(localStorage.getItem('cancionero_users')) || {};
    if (Object.keys(existingUsers).length === 0) {
        localStorage.setItem('cancionero_users', JSON.stringify(demoUsers));
        console.log('Usuarios de demostración creados:');
        console.log('- admin@cancionero.com / admin123');
        console.log('- usuario@test.com / test123');
        console.log('- musico@ejemplo.com / musica123');
    }
}

// Función para resetear usuarios (solo para desarrollo)
function resetDemoUsers() {
    localStorage.removeItem('cancionero_users');
    localStorage.removeItem('cancionero_current_user');
    createDemoUsers();
    console.log('Usuarios de demostración reseteados');
}

// Crear usuarios demo al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    createDemoUsers();
});

// Exponer funciones para uso en consola de desarrollo
window.createDemoUsers = createDemoUsers;
window.resetDemoUsers = resetDemoUsers; 