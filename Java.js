// Toggle mostrar/ocultar contraseña
document.getElementById('toggleLoginPassword').addEventListener('click', function () {
    const pwd = document.getElementById('loginPassword');
    const isText = pwd.type === 'text';
    pwd.type = isText ? 'password' : 'text';
    this.classList.toggle('bx-show', isText);
    this.classList.toggle('bx-hide', !isText);
});

// Iniciar sesión
document.querySelector('form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    const btn = document.querySelector('.btn');
    btn.disabled = true;
    btn.textContent = 'Entrando...';

    try {
        const user = await API.Auth.login(email, password);
        window.location.href = 'Equipos.html';
    } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Iniciar sesión';
        alert(err.message || 'Correo o contraseña incorrectos');
    }
});
