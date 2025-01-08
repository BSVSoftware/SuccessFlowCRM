import { API_URL,APP_RQ } from './app.js';
import { openIndexedDB } from './indexedDB.js';
import { fetchAndStoreKunden, loadKundeFromIndexedDB } from './fetch_kunden.js';

document.getElementById('home-icon').addEventListener('click', () => {
    console.log("click");
    window.location.href = '../html/menue.html';
});

document.getElementById('back-icon').addEventListener('click', function () {
    window.history.back();
});

document.addEventListener('DOMContentLoaded', async () => {
    kendo.culture("de-DE");

    // Textboxen mit Clear-Button
    $("#kundenNr").kendoTextBox({ enabled: false });
    $("#kunde").kendoTextBox({ clearButton: true });
    $("#name1").kendoTextBox({ clearButton: true });
    $("#name2").kendoTextBox({ clearButton: true });
    $("#name3").kendoTextBox({ clearButton: true });
    $("#strasse").kendoTextBox({ clearButton: true });
    $("#plz").kendoTextBox({ clearButton: true });
    $("#ort").kendoTextBox({ clearButton: true });
    $("#telefon").kendoTextBox({ clearButton: true });
    $("#email").kendoTextBox({ clearButton: true });
    $("#homepage").kendoTextBox({ clearButton: true });
    $("#interne_info").kendoTextArea({ rows: 6 });

    // Land ComboBox
    $("#land").kendoComboBox({
        dataTextField: "text",
        dataValueField: "value",
        clearButton: true,
        placeholder: "Land auswählen",
        dataSource: [
            { text: "Deutschland", value: "DE" },
            { text: "Österreich", value: "AT" },
            { text: "Schweiz", value: "CH" }
        ]
    });

    $("#groesse").kendoDropDownList();

    // Vertriebler -> MitarbeiterNr
    $("#vertriebler").kendoComboBox({
        dataTextField: "text",
        dataValueField: "value",
        clearButton: true,
        placeholder: "Vertriebler auswählen"
    });

    $("#mandant").kendoComboBox({
        dataTextField: "text",
        dataValueField: "value",
        clearButton: true,
        placeholder: "Mandant auswählen"
    });

    $("#branche").kendoComboBox({
        dataTextField: "text",
        dataValueField: "value",
        clearButton: true,
        placeholder: "Branche auswählen"
    });


    const form = document.getElementById('kunden-form');
    const deleteButton = document.getElementById("delete-button");
    const saveButton = document.getElementById("save-button");

    $(saveButton).kendoButton({ icon: "save" });
    $(deleteButton).kendoButton({ icon: "delete" });

    const validator = $("#kunden-form").kendoValidator().data("kendoValidator");

    const kundenNr = Number(localStorage.getItem('currentKundenNr'));

    const db = await openIndexedDB();
    await loadDropdowns(db);

    let existingData = null;
    if (kundenNr) {
        existingData = await loadKundeFromIndexedDB(kundenNr);
        if (existingData) {
            $("#kundenNr").data("kendoTextBox").value(existingData.KundenNr || "");
            $("#kunde").data("kendoTextBox").value(existingData.Kunde || "");
            $("#name1").data("kendoTextBox").value(existingData.Name1 || "");
            $("#name2").data("kendoTextBox").value(existingData.Name2 || "");
            $("#name3").data("kendoTextBox").value(existingData.Name3 || "");
            $("#strasse").data("kendoTextBox").value(existingData.Strasse || "");
            $("#land").data("kendoComboBox").value(existingData.Land || "");
            $("#plz").data("kendoTextBox").value(existingData.Plz || "");
            $("#ort").data("kendoTextBox").value(existingData.Ort || "");
            $("#telefon").data("kendoTextBox").value(existingData.TelefonNr || "");
            $("#email").data("kendoTextBox").value(existingData.EMail || "");
            $("#homepage").data("kendoTextBox").value(existingData.Homepage || "");

            // MitarbeiterNr (Vertriebler) ist numerisch
            $("#vertriebler").data("kendoComboBox").value(
                existingData.MitarbeiterNr != null ? Number(existingData.MitarbeiterNr) : ""
            );

            // Mandant ist numerisch
            $("#mandant").data("kendoComboBox").value(
                existingData.Mandant != null ? Number(existingData.MandantNr) : ""
            );

            // Branche ist ein String oder null
            $("#branche").data("kendoComboBox").value(existingData.Branche || "");

            $("#groesse").data("kendoDropDownList").value(existingData.Groesse || "5");
            $("#interne_info").data("kendoTextArea").value(existingData.InterneInfo || "");

            deleteButton.style.display = "inline-block";
        } else {
            console.warn("Keine Kundendaten in IndexedDB gefunden.");
        }
    } else {
        deleteButton.style.display = "none";
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!validator.validate()) {
            return;
        }
        const kunde = $("#kunde").val().trim();
        const name1 = $("#name1").val().trim();
        const name2 = $("#name2").val().trim();
        const name3 = $("#name3").val().trim();

        if (!name1 && !name2 && !name3) {
            alert('Mindestens eines der Felder Name 1, Name 2 oder Name 3 muss ausgefüllt sein.');
            return;
        }

        const vertrieblerValue = $("#vertriebler").data("kendoComboBox").value();
        const mandantValue = $("#mandant").data("kendoComboBox").value();
        const brancheValue = $("#branche").data("kendoComboBox").value();

        const kundeData = [{
            KundenNr: kundenNr ? kundenNr : null,
            Kunde: kunde,
            Name1: name1,
            Name2: name2,
            Name3: name3,
            Strasse: $("#strasse").val().trim(),
            Land: $("#land").data("kendoComboBox").value(),
            Plz: $("#plz").val().trim(),
            Ort: $("#ort").val().trim(),
            TelefonNr: $("#telefon").val().trim(),
            EMail: $("#email").val().trim(),
            URL: $("#homepage").val().trim(),
            // MitarbeiterNr ist numerisch, falls vorhanden
            MitarbeiterNr: vertrieblerValue ? parseInt(vertrieblerValue, 10) : null,
            // Mandant ist numerisch
            Mandant: mandantValue ? parseInt(mandantValue, 10) : null,
            // Branche ist ein String, einfach übergeben
            Branche: brancheValue ? brancheValue : null,
            Groesse: $("#groesse").data("kendoDropDownList").value(),
            InterneInfo: $("#interne_info").val().trim()
        }];

        const apiAction = kundenNr ? "Aupdkunde" : "Acreatekunde";

        try {
            const sid = localStorage.getItem('SID');
            const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-${apiAction}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'SID': sid
                },
                body: JSON.stringify(kundeData)
            });

            if (!response.ok) {
                throw new Error(`Fehler beim ${kundenNr ? "Aktualisieren" : "Erstellen"} des Kunden: ${response.status}`);
            }

            const result = await response.json();
            alert(`Kunde erfolgreich ${kundenNr ? "aktualisiert" : "erstellt"}!`);

            let neuKundenNr = kundenNr;
            if (!kundenNr) {
                // Neuer Kunde: Neue KundenNr aus dem Ergebnis übernehmen
                if (Array.isArray(result) && result.length > 0 && result[0].KundenNr) {
                    neuKundenNr = result[0].KundenNr;
                    localStorage.setItem("currentKundenNr", neuKundenNr);
                } else {
                    console.warn("Keine neue KundenNr im Ergebnis gefunden.");
                }
            }

            if (neuKundenNr) {
                // Einen einzelnen Kunden nachladen
                await fetchAndStoreKunden(undefined, neuKundenNr);
            }

            window.history.back();

        } catch (error) {
            console.error(`Fehler beim ${kundenNr ? "Aktualisieren" : "Erstellen"} des Kunden:`, error);
            alert(`Fehler beim ${kundenNr ? "Aktualisieren" : "Erstellen"}. Bitte versuchen Sie es erneut.`);
        }
    });

    deleteButton.addEventListener('click', async () => {
        if (!kundenNr) return;

        if (!confirm("Möchten Sie diesen Kunden wirklich löschen?")) {
            return;
        }

        try {
            const sid = localStorage.getItem('SID');
            const kundeToDelete = [{ KundenNr: kundenNr }];
            const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Adelkunde`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'SID': sid
                },
                body: JSON.stringify(kundeToDelete)
            });

            if (!response.ok) {
                throw new Error(`Fehler beim Löschen des Kunden: ${response.status}`);
            }

            alert('Kunde erfolgreich gelöscht!');

            // Kunden aus IndexedDB löschen
            await deleteKundeFromIndexedDB(kundenNr);

            localStorage.removeItem('currentKundenNr');
            window.history.back();

        } catch (error) {
            console.error('Fehler beim Löschen des Kunden:', error);
            alert('Fehler beim Löschen. Bitte versuchen Sie es erneut.');
        }
    });
});

async function loadDropdowns(db) {
    await loadOptionsFromStore(db, 'mandanten', 'MandantenNr', 'Beschreibung', '#mandant');
    await loadOptionsFromStore(db, 'branchen', 'BranchenCode', 'Beschreibung', '#branche');
    await loadOptionsFromStore(db, 'vertriebler', 'MitarbeiterNr', 'Name', '#vertriebler');
}

function loadOptionsFromStore(db, storeName, valueField, textField, selectSelector) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.openCursor();
        const data = [];

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {

                let val = cursor.value[valueField];
                if (storeName === 'mandanten' || storeName === 'vertriebler') {
                    val = Number(val);
                }
                // branchen bleiben als string

                const txt = cursor.value[textField];
                data.push({ text: txt, value: val });
                cursor.continue();
            } else {
                const comboBox = $(selectSelector).data("kendoComboBox");
                if (comboBox) {
                    comboBox.setDataSource(new kendo.data.DataSource({ data: data }));
                }
                resolve();
            }
        };

        request.onerror = (event) => {
            console.error(`Fehler beim Laden von ${storeName}:`, event.target.error);
            reject(event.target.error);
        };
    });
}
