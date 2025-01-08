import { API_URL, APP_ID } from './app.js';

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const errorMessageElement = document.getElementById('error-message');
    errorMessageElement.textContent = ''; // Vorherige Fehlermeldungen löschen

    // Eingabe prüfen
    if (!email) {
        errorMessageElement.textContent = 'Bitte geben Sie eine E-Mail-Adresse oder einen Benutzernamen ein.';
        return;
    }

    const credentials = btoa(`${email}:${password}`);

    try {
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
            localStorage.setItem('email', email); // E-Mail im LocalStorage speichern
            window.location.href = '../html/company.html';
        } else {
            errorMessageElement.textContent = 'Login fehlgeschlagen. Bitte versuchen Sie es erneut.';
        }
    } catch (error) {
        console.error('Fehler beim Login:', error);
        errorMessageElement.textContent = 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
    }
});
