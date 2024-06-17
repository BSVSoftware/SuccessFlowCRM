document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadData();
        document.getElementById('menu').style.display = 'block';
    } catch (error) {
        console.error('Error loading data:', error);
        redirectToLogin(error.message);
    }

    document.getElementById('logout').addEventListener('click', () => {
        localStorage.removeItem('selectedCompany');
        localStorage.removeItem('SID');
        localStorage.removeItem('UID');
        localStorage.removeItem('email');
        window.location.href = '/CRM/html/login.html';
    });

    document.getElementById('refresh').addEventListener('click', async () => {
        try {
            await loadData();
            alert('Daten wurden erfolgreich aktualisiert.');
        } catch (error) {
            console.error('Error refreshing data:', error);
            alert('Fehler beim Aktualisieren der Daten.');
        }
    });
});

function redirectToLogin(message) {
    alert(message);
    window.location.href = '/CRM/html/login.html';
}
