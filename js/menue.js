import { refreshData } from './refreshData.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1) Kendo ResponsivePanel an #sidebar
    $("#sidebar").kendoResponsivePanel({
        breakpoint: 768, // unter 768px => Panel geht in Off-Canvas
        orientation: "left",
        toggleButton: "#rpanel-toggle"
    });

    // 2) Einstellungen laden (z. B. ..//Einstellungen.txt) => JSON
    let einstellungen;
    try {
        const resp = await fetch('../Einstellungen.txt');
        einstellungen = await resp.json();
        console.log('Einstellungen geladen:', einstellungen);
    } catch (err) {
        console.error('Fehler beim Laden der Einstellungen:', err);
        einstellungen = {};
    }

    // 3) Wenn Rechnungen = 'false', Menü-Eintrag verstecken
    if (einstellungen.Rechnungen === 'false') {
        const rechnungLi = document.getElementById('menu-rechnung-li');
        if (rechnungLi) {
            rechnungLi.style.display = 'none';
        }
    }

    // 4) Logout
    const logoutLink = document.getElementById('logout');
    if (logoutLink) {
        logoutLink.addEventListener('click', () => {
            localStorage.removeItem('selectedCompany');
            localStorage.removeItem('SID');
            localStorage.removeItem('UID');
            localStorage.removeItem('email');
            window.location.href = '../html/login.html';
        });
    }

    // 5) Refresh
    const refreshIcon = document.getElementById('refresh-icon');
    if (refreshIcon) {
        refreshIcon.addEventListener('click', async () => {
            try {
                await refreshData();
            } catch (error) {
                console.error('Error refreshing data:', error);
                alert('Fehler beim Aktualisieren der Daten.');
            }
        });
    }
});