const toggleLoginPassword = document.getElementById('toggleLoginPassword');
const loginPassword       = document.getElementById('loginPassword');

if (toggleLoginPassword) {
    toggleLoginPassword.addEventListener('click', () => {
        if (loginPassword.type === 'password') {
            loginPassword.type = 'text';
            toggleLoginPassword.classList.replace('bx-show', 'bx-hide');
        } else {
            loginPassword.type = 'password';
            toggleLoginPassword.classList.replace('bx-hide', 'bx-show');
        }
    });
}

document.querySelector('.form-box.login form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn      = this.querySelector('.btn');
    const email    = this.querySelector('input[type="email"]').value.trim();
    const password = this.querySelector('input[type="password"]').value;

    btn.textContent = 'Iniciando...';
    btn.disabled    = true;

    try {
        const res  = await fetch('/api/auth/login', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('inv_token',   data.token);
            localStorage.setItem('inv_session', JSON.stringify({ logged: true, user: data.user }));
            const redirect = sessionStorage.getItem('loginRedirect');
            if (redirect) {
                sessionStorage.removeItem('loginRedirect');
                window.location.href = redirect;
            } else {
                window.location.href = 'Dashboard.html';
            }
        } else {
            btn.textContent      = data.error || 'Credenciales incorrectas';
            btn.style.background = '#333';
            setTimeout(() => {
                btn.textContent      = 'Iniciar sesión';
                btn.style.background = '';
                btn.disabled         = false;
            }, 2000);
        }
    } catch {
        btn.textContent      = 'Sin conexión al servidor';
        btn.style.background = '#333';
        setTimeout(() => {
            btn.textContent      = 'Iniciar sesión';
            btn.style.background = '';
            btn.disabled         = false;
        }, 2000);
    }
});
