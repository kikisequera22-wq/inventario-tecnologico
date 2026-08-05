// Toggle mostrar/ocultar contraseña
document.getElementById('toggleLoginPassword').addEventListener('click', function () {
    const pwd = document.getElementById('loginPassword');
    const isText = pwd.type === 'text';
    pwd.type = isText ? 'password' : 'text';
    this.classList.toggle('bx-show', isText);
    this.classList.toggle('bx-hide', !isText);
});

// Iniciar sesión
document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    const btn = document.getElementById('btnLogin');
    btn.disabled = true;
    btn.textContent = 'Entrando...';

    try {
        const user = await API.Auth.login(email, password);
        window.location.href = 'Equipos.html';
    } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Iniciar Sesión →';
        showLoginError(err.message || 'Correo o contraseña incorrectos');
    }
});

function showLoginError(msg) {
    let el = document.getElementById('loginError');
    if (!el) {
        el = document.createElement('p');
        el.id = 'loginError';
        el.style.cssText = 'color:#d50909;font-size:13px;text-align:center;margin-top:12px;font-weight:500';
        document.getElementById('loginForm').appendChild(el);
    }
    el.textContent = msg;
}

// Registrar Service Worker (PWA)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
}
