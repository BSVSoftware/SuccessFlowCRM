import { API_URL, APP_RQ } from './app.js';
import { openIndexedDB } from './indexedDB.js';
import { fetchKontaktpersonenData } from './fetch_kontaktpersonen.js';

document.getElementById('home-icon').addEventListener('click', () => {
    console.log("click");
    window.location.href = '../html/menue.html';
});

document.getElementById('back-icon').addEventListener('click', function () {
    window.history.back();
});

document.addEventListener('DOMContentLoaded', async () => {
    kendo.culture("de-DE");

    // Kendo Widgets initialisieren
    $("#titel").kendoTextBox();
    $("#vorname").kendoTextBox();
    $("#nachname").kendoTextBox();
    $("#abteilung").kendoTextBox();
    $("#email").kendoTextBox();

    $("#anrede").kendoDropDownList({
        optionLabel: "Anrede auswählen",
        dataSource: ["Herr", "Frau"],
        valuePrimitive: true,
        filter: "startswith"
    });

    $("#telefon").kendoMaskedTextBox({
        mask: "+00 000 0000000"
    });

    $("#handy").kendoMaskedTextBox({
        mask: "+00 000 0000000"
    });

    // **NEU**: Funktion-ComboBox
    $("#funktion").kendoComboBox({
        dataTextField: "Funktion",   // in der IDB: { Funktion: "Teamleiter" }
        dataValueField: "Funktion",  // wir speichern denselben Wert an die REST-API
        placeholder:    "Funktion auswählen...",
        filter:         "contains",
        clearButton:    true
    });

    // OPTIONAL: Sympathie-Feld, falls gewünscht
    $("#sympathie").kendoComboBox({
        dataTextField:  "Sympathie",
        dataValueField: "SympathieCode",
        placeholder:    "Sympathie wählen...",
        filter:         "contains",
        clearButton:    true
    });

    const validator = $("#kontaktpersonen-form").kendoValidator({
        messages: {
            required: "Dieses Feld ist erforderlich",
            email: "Bitte eine gültige E-Mail-Adresse eingeben"
        },
        rules: {
            email: function(input) {
                if (input.is("[type=email]") && input.val() !== "") {
                    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.val());
                }
                return true;
            }
        }
    }).data("kendoValidator");

    const form = document.getElementById('kontaktpersonen-form');
    const personNrInput = document.getElementById("PersonNr");
    const deleteBtn     = document.getElementById("delete-btn");

    // KundenNr + PersonNr
    const kundenNr = Number(localStorage.getItem('currentKundenNr'));
    const personNr = Number(localStorage.getItem('currentKontaktpersonNr'));

    if (!kundenNr) {
        alert('KundenNr fehlt. Bitte wählen Sie zuerst einen Kunden aus.');
        return;
    }

    // 1) Funktion-Daten aus IndexedDB laden
    await populateFunktionCombo();

    // 2) Sympathie-Daten aus IndexedDB laden (falls gewünscht):
    await populateSympathieCombo();

    // Falls eine vorhandene Person -> Daten aus IDB
    if (personNr) {
        personNrInput.value = personNr;

        const kontaktpersonData = await loadKontaktpersonFromIndexedDB(personNr);
        if (kontaktpersonData) {
            $("#titel").data("kendoTextBox").value(kontaktpersonData.Titel       || "");
            $("#anrede").data("kendoDropDownList").value(kontaktpersonData.Anrede || "");
            $("#vorname").data("kendoTextBox").value(kontaktpersonData.Vorname   || "");
            $("#nachname").data("kendoTextBox").value(kontaktpersonData.Nachname || "");
            $("#abteilung").data("kendoTextBox").value(kontaktpersonData.Abteilung || "");
            $("#telefon").data("kendoMaskedTextBox").value(kontaktpersonData.Telefon || "");
            $("#email").data("kendoTextBox").value(kontaktpersonData.EMail || "");
            $("#handy").data("kendoMaskedTextBox").value(kontaktpersonData.Handy || "");

            // NEU: Funktion
            $("#funktion").data("kendoComboBox").value(kontaktpersonData.Funktion || "");

            // OPTIONAL: Sympathie
            $("#sympathie").data("kendoComboBox").value(kontaktpersonData.Sympathie || "");

            deleteBtn.style.display = "inline-block";
        }
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!validator.validate()) {
            return;
        }

        // Werte aus Kendo-Widgets
        const titel     = $("#titel").val().trim();
        const anrede    = $("#anrede").data("kendoDropDownList").value();
        const vorname   = $("#vorname").val().trim();
        const nachname  = $("#nachname").val().trim();
        const abteilung = $("#abteilung").val().trim();
        const telefon   = $("#telefon").val().trim();
        const email     = $("#email").val().trim();
        const handy     = $("#handy").val().trim();

        // NEU: Funktion
        const funktionValue = $("#funktion").data("kendoComboBox").value();
        // OPTIONAL: Sympathie
        const sympathieCode = $("#sympathie").data("kendoComboBox").value();

        const kontaktperson = [{
            PersonNr:   personNr ? personNr : null,
            KundenNr:   kundenNr,
            Titel:      titel,
            Anrede:     anrede,
            Vorname:    vorname,
            Nachname:   nachname,
            Abteilung:  abteilung,
            Telefon:    telefon,
            EMail:      email,
            Handy:      handy,

            // NEU: Funktion => an REST-API
            Funktion:   funktionValue || "",

            // OPTIONAL: Sympathie => Code
            Sympathie:  sympathieCode || ""
        }];

        const apiAction = personNr ? "Aupdkontaktperson" : "Acreatekontaktperson";

        try {
            const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-${apiAction}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'SID': localStorage.getItem('SID')
                },
                body: JSON.stringify(kontaktperson)
            });

            if (!response.ok) {
                throw new Error(`Fehler beim ${personNr ? "Aktualisieren" : "Erstellen"} der Kontaktperson: ${response.status}`);
            }

            alert(`Kontaktperson erfolgreich ${personNr ? "aktualisiert" : "erstellt"}!`);

            // Kontaktpersonen in IndexedDB aktualisieren
            await fetchKontaktpersonenData(kundenNr);

            // Formular zurücksetzen
            form.reset();
            $("#anrede").data("kendoDropDownList").value("");
            $("#telefon").data("kendoMaskedTextBox").value("");
            $("#handy").data("kendoMaskedTextBox").value("");

            // Textfelder leeren
            $("#titel, #vorname, #nachname, #abteilung, #email").each(function() {
                $(this).data("kendoTextBox").value("");
            });
            // Funktion und Sympathie zurücksetzen
            $("#funktion").data("kendoComboBox").value("");
            $("#sympathie").data("kendoComboBox").value("");

            window.history.back();

        } catch (error) {
            console.error(`Fehler beim ${personNr ? "Aktualisieren" : "Erstellen"} der Kontaktperson:`, error);
            alert(`Fehler beim ${personNr ? "Aktualisieren" : "Erstellen"}. Bitte versuchen Sie es erneut.`);
        }
    });

    // Lösch-Button
    deleteBtn.addEventListener('click', async () => {
        if (!personNr) return;

        if (!confirm("Möchten Sie diese Kontaktperson wirklich löschen?")) {
            return;
        }

        try {
            const body = [{ PersonNr: personNr }];
            const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Adelcontact`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'SID': localStorage.getItem('SID')
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error(`Fehler beim Löschen der Kontaktperson: ${response.status}`);
            }

            alert('Kontaktperson erfolgreich gelöscht!');
            await fetchKontaktpersonenData(kundenNr);

            window.history.back();

        } catch (error) {
            console.error('Fehler beim Löschen der Kontaktperson:', error);
            alert('Fehler beim Löschen. Bitte versuchen Sie es erneut.');
        }
    });
});

/** Lädt Kontaktperson aus der IDB */
async function loadKontaktpersonFromIndexedDB(personNr) {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['kontaktpersonen'], 'readonly');
        const store       = transaction.objectStore('kontaktpersonen');
        const request     = store.get(personNr);

        request.onsuccess = () => {
            console.log("IndexedDB Kontaktperson:", request.result);
            resolve(request.result);
        };
        request.onerror = (event) => {
            console.error('Fehler beim Abrufen der Kontaktperson aus IndexedDB:', event.target.error);
            reject(event.target.error);
        };
    });
}

/** Befüllt die Funktion-ComboBox aus IDB-Store "kpfunktionen". */
async function populateFunktionCombo() {
    try {
        const db = await openIndexedDB();
        const tx = db.transaction(["kpfunktionen"], "readonly");
        const store = tx.objectStore("kpfunktionen");
        const req = store.getAll();

        req.onsuccess = () => {
            const data = req.result || [];
            // data => z.B. [{ Funktion: "Teamleiter" }, { Funktion: "Sachbearbeiter" }, ...]
            const combo = $("#funktion").data("kendoComboBox");
            if (combo) {
                combo.setDataSource(data);
            }
        };
        req.onerror = (event) => {
            console.error("Fehler beim Laden 'kpfunktionen':", event.target.error);
        };
    } catch (error) {
        console.error("populateFunktionCombo() error:", error);
    }
}

/** OPTIONAL: Befüllt Sympathie-ComboBox aus IDB 'sympathie' */
async function populateSympathieCombo() {
    try {
        const db = await openIndexedDB();
        const tx = db.transaction(["sympathie"], "readonly");
        const store = tx.objectStore("sympathie");
        const req = store.getAll();

        req.onsuccess = () => {
            const data = req.result || [];
            // => [{ SympathieCode:"1", Sympathie:"Sehr hoch" }, ...]
            const combo = $("#sympathie").data("kendoComboBox");
            if (combo) {
                combo.setDataSource(data);
            }
        };
        req.onerror = (event) => {
            console.error("Fehler beim Laden 'sympathie':", event.target.error);
        };
    } catch (error) {
        console.error("populateSympathieCombo() error:", error);
    }
}
