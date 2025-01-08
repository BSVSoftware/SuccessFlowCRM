import { openIndexedDB } from './indexedDB.js';
import { API_URL,APP_RQ } from './app.js';
import { loadAnbahnungen } from './load_anbahnungen.js';

$(document).ready(function () {
    kendo.culture("de-DE");

    // Abschlussdatum initialisieren
    $("#abschlussdatum").kendoDatePicker({
        format: "dd.MM.yyyy", // Format für DatePicker
        dateInput: true, // Aktiviert das Kendo DateInput
    });

    // Prüfen, ob currentKundenNr vorhanden ist
    const currentKundenNr = localStorage.getItem("currentKundenNr");
    if (currentKundenNr) {
        $("#kunden-nr").val(currentKundenNr);
        loadKundenDetails(currentKundenNr);
        console.log(`currentKundenNr geladen und validiert: ${currentKundenNr}`);
    }

    // Back-Button
    $("#back-button").on("click", function () {
        window.history.back();
    });

    // Kundennummer validieren
    $("#kunden-nr").on("input", function () {
        const kundenNr = $(this).val().trim();
        if (!kundenNr) {
            $("#kunde").val("");
            return;
        }
        loadKundenDetails(kundenNr);
    });

    // Suchen-Button
    $("#search-kunde-button").on("click", function () {
        const currentKundenNr = $("#kunden-nr").val().trim();
        if (currentKundenNr) {
            localStorage.setItem("currentKundenNr", currentKundenNr);
            console.log(`currentKundenNr aktualisiert: ${currentKundenNr}`);
        }
        localStorage.setItem("sourcePage", "neue_anbahnung");
        window.location.href = "../html/kunden.html";
    });

    // Formular absenden
    $("#anbahnung-form").on("submit", async function (event) {
        event.preventDefault();

        const kundenNr = Number($("#kunden-nr").val());
        const ratingNr = Number($("#rating").val());
        const gruppenNr = Number($("#gruppe").val());
        const wahrscheinlichkeit = Number($("#wahrscheinlichkeit").val());
        const umsatz = Number($("#umsatz").val()) * 100; // Umsatz *100
        const bruttonutzen = Number($("#bruttonutzen").val()) * 100; // Bruttonutzen *100
        const abschlussdatum = $("#abschlussdatum").val();
        const mitarbeiterNr = Number(localStorage.getItem("MitarbeiterNr"));
        const beschreibung = $("#beschreibung").val();

        const formData = [{
            KundenNr: kundenNr,
            RatingNr: ratingNr,
            GruppenNr: gruppenNr,
            Wahrscheinlichkeit: wahrscheinlichkeit,
            Umsatz: umsatz,
            Bruttonutzen: bruttonutzen,
            Abschlussdatum: abschlussdatum,
            MitarbeiterNr: mitarbeiterNr,
            Beschreibung: beschreibung,
        }];

        console.log("Gesendete Daten:", formData);

        try {
            const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Acreateanbahnung`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "SID": localStorage.getItem("SID"),
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) throw new Error("Fehler beim Speichern der Anbahnung.");

            const result = await response.json();
            const anbahnungNr = result[0]?.AnbahnungNr;

            alert(`Anbahnung erfolgreich gespeichert. AnbahnungNr: ${anbahnungNr}`);

            localStorage.setItem("currentAnbahnungNr", anbahnungNr);
            console.log(`AnbahnungNr im localStorage gespeichert: ${anbahnungNr}`);

            await loadAnbahnungen(anbahnungNr);
            window.location.href = "../html/anbahnungen.html";
        } catch (error) {
            console.error("Fehler beim Speichern der Anbahnung:", error);
            alert("Fehler beim Speichern der Anbahnung: " + error.message);
        }
    });

    // Abbrechen-Button
    $("#cancel-button").on("click", function () {
        window.location.href = "../html/anbahnungen.html";
    });

    populateDropdowns();
});

async function loadKundenDetails(kundenNr) {
    try {
        const db = await openIndexedDB();
        const transaction = db.transaction(['kunden'], 'readonly');
        const store = transaction.objectStore('kunden');
        const request = store.get(Number(kundenNr));

        request.onsuccess = () => {
            const kunde = request.result;
            if (kunde) {
                $("#kunden-nr").val(kundenNr);
                $("#kunde").val(kunde.Kunde || "Kein Kunde vorhanden");
                console.log(`Kundendetails geladen: ${kunde.Kunde}`);
            } else {
                $("#kunden-nr").val("");
                $("#kunde").val("Kundennummer nicht gefunden");
                console.warn(`Kundennummer ${kundenNr} nicht gefunden.`);
            }
        };

        request.onerror = () => {
            $("#kunden-nr").val("");
            $("#kunde").val("Fehler beim Laden der Kundendaten");
            console.error("Fehler beim Abrufen der Kundendaten.");
        };
    } catch (error) {
        console.error("Fehler beim Laden der Kundendetails:", error);
        alert("Fehler beim Laden der Kundendetails: " + error.message);
    }
}

async function populateDropdowns() {
    try {
        const db = await openIndexedDB();

        // Ratings laden
        const ratingsTransaction = db.transaction(['ratings'], 'readonly');
        const ratingsStore = ratingsTransaction.objectStore('ratings');
        const ratingsRequest = ratingsStore.getAll();

        ratingsRequest.onsuccess = () => {
            const ratingsData = ratingsRequest.result;
            if (ratingsData.length > 0) {
                $("#rating").kendoDropDownList({
                    dataSource: ratingsData,
                    dataTextField: "Rating",
                    dataValueField: "RatingNr",
                    optionLabel: "Bitte auswählen..."
                });
                console.log("Ratings erfolgreich geladen:", ratingsData);
            } else {
                console.warn("Keine Ratings in der IndexedDB gefunden.");
            }
        };

        ratingsRequest.onerror = () => {
            console.error("Fehler beim Laden der Ratings.");
        };

        // Gruppen laden
        const gruppenTransaction = db.transaction(['gruppen'], 'readonly');
        const gruppenStore = gruppenTransaction.objectStore('gruppen');
        const gruppenRequest = gruppenStore.getAll();

        gruppenRequest.onsuccess = () => {
            const gruppenData = gruppenRequest.result;
            if (gruppenData.length > 0) {
                $("#gruppe").kendoDropDownList({
                    dataSource: gruppenData,
                    dataTextField: "Gruppe",
                    dataValueField: "GruppenNr",
                    optionLabel: "Bitte auswählen..."
                });
                console.log("Gruppen erfolgreich geladen:", gruppenData);
            } else {
                console.warn("Keine Gruppen in der IndexedDB gefunden.");
            }
        };

        gruppenRequest.onerror = () => {
            console.error("Fehler beim Laden der Gruppen.");
        };

    } catch (error) {
        console.error("Fehler beim Laden der Dropdown-Daten:", error);
    }
}
