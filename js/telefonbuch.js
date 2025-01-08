import { API_URL,APP_RQ } from './app.js';

document.getElementById('home-icon').addEventListener('click', () => {
    console.log("click");
    window.location.href = '../html/menue.html';
});

document.getElementById('back-icon').addEventListener('click', function () {
    window.history.back();
});
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search');
    const searchButton = document.getElementById('search-icon');

    // Suche bei Enter-Taste oder Klick auf das Such-Symbol
    searchInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {  // Suche bei Enter-Taste
            const query = searchInput.value;
            if (query.length >= 3) {  // Suche nur starten, wenn mindestens 3 Zeichen eingegeben wurden
                fetchPhonebook(query);
            }
        }
    });

    searchButton.addEventListener('click', function() {  // Suche bei Klick auf das Such-Symbol
        const query = searchInput.value;
        if (query.length >= 3) {
            fetchPhonebook(query);
        }
    });

    async function fetchPhonebook(volltext) {
        try {
            const sid = localStorage.getItem('SID');  // Hole die SID

            const requestBody = {
                Volltext: volltext  // Volltext-Suche im Body übergeben
            };

            const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-AgetTelefonbuch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'SID': sid  // Session ID im Header
                },
                body: JSON.stringify(requestBody)  // Body als JSON
            });

            if (response.status === 401) {
                handleUnauthorized();  // Session abgelaufen
                return;
            }

            if (!response.ok) throw new Error('Failed to fetch phonebook entries');

            const phonebookData = await response.json();  // JSON-Daten empfangen
            renderPhonebookGrid(phonebookData);  // An Kendo Grid binden
        } catch (error) {
            console.error('Error fetching phonebook entries:', error);
            showErrorModal('Error fetching phonebook entries: ' + error.message);
        }
    }

    function renderPhonebookGrid(data) {
        $("#grid").kendoGrid({
            dataSource: {
                data: data,
                pageSize: 20,
                schema: {
                    model: {
                        fields: {
                            Name: { type: "string" },
                            Telefon: { type: "string" },
                            EMail: { type: "string" },
                            Ort: { type: "string" }
                        }
                    }
                }
            },
            height: calculateGridHeight(),
            scrollable: true,
            pageable: true,
            columns: [
                { field: "Name", title: "Name", width: "200px" },
                { field: "Telefon", title: "Telefon", width: "150px", template: '<a href="tel:#=Telefon#">#=Telefon#</a>'},
                { field: "EMail", title: "E-Mail" , template: '<a href="mailto:#=EMail#">#=EMail#</a>'},
                { field: "Ort", title: "Ort" }
            ]
        });
    }

    function handleUnauthorized() {
        alert('Ihre Sitzung ist abgelaufen. Bitte loggen Sie sich erneut ein.');
        window.location.href = '../html/login.html';
    }

    function showErrorModal(message) {
        const existingModal = document.getElementById('error-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'error-modal';
        modal.style.position = 'fixed';
        modal.style.top = '50%';
        modal.style.left = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.padding = '20px';
        modal.style.backgroundColor = 'white';
        modal.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.1)';
        modal.style.zIndex = '1000';

        const messageElement = document.createElement('p');
        messageElement.textContent = message;

        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.addEventListener('click', () => {
            modal.remove();
        });

        modal.appendChild(messageElement);
        modal.appendChild(closeButton);
        document.body.appendChild(modal);
    }
});

function calculateGridHeight() {
    const windowHeight = $(window).height();
    const headerHeight = $('#header').outerHeight(true);
    const searchContainerHeight = $('.search-container').outerHeight(true);
    return windowHeight - headerHeight - searchContainerHeight - 30;
}

