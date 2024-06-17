import { API_URL, APP_ID } from './app.js';

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const credentials = btoa(`${email}:${password}`);
    const errorMessageElement = document.getElementById('error-message');
    errorMessageElement.textContent = ''; // Clear previous error messages

    const response = await fetch(`${API_URL}salogin`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'APPID': APP_ID
        }
    });

    if (response.status === 401) {
        errorMessageElement.textContent = 'Falsche E-Mail oder Passwort.';
        return;
    }

    if (response.ok) {
        const data = await response.json();
        localStorage.setItem('companies', JSON.stringify(data.companies));
        localStorage.setItem('email', email); // Store email in localStorage
        window.location.href = '/CRM/html/company.html';
    } else {
        errorMessageElement.textContent = 'Login fehlgeschlagen. Bitte versuchen Sie es erneut.';
    }
});
