import { openIndexedDB } from './indexedDB.js';
import { API_URL,APP_RQ } from './app.js';
import { loadAufgaben } from "./load_aufgaben.js"; // Falls du nach dem Update neu laden möchtest

document.addEventListener('DOMContentLoaded', async () => {
    // currentAufgabenNr aus dem localStorage holen
    const currentAufgabenNr = Number(localStorage.getItem('currentAufgabenNr'));
    const db = await openIndexedDB();
    await loadAufgaben(currentAufgabenNr);
    // 1) "Anbahnung" als KendoComboBox
    $("#anbahnung").kendoComboBox({
        dataTextField: "text",  // Angezeigt wird 'Beschreibung'
        dataValueField: "value",  // Intern der Schlüssel
        placeholder:    "Anbahnung wählen...",
        filter:         "contains",
        clearButton:    true
    });

    // Referenzen auf andere Felder
    const kundenNrField        = document.getElementById('kundenNr');
    const kundeField           = document.getElementById('kunde');
    const stichwortField       = document.getElementById('stichwort');
    const ansprechpartnerField = document.getElementById('ansprechpartner');
    const emailField           = document.getElementById('email');
    const fehlermeldungField   = document.getElementById('fehlermeldung');
    const behebungField        = document.getElementById('behebung');
    const aktuelleAktionField  = document.getElementById('aktuelleAktion');
    const aktuellerStatusField = document.getElementById('aktuellerStatus');
    const letzteAktionamField  = document.getElementById('letzteAktionam');

    const deleteBtn = document.getElementById('delete-btn');
    const saveBtn   = document.getElementById('save-btn');
    const doneBtn   = document.getElementById('done-btn');

    // Wenn AufgabenNr existiert -> Aufgabe laden
    if (currentAufgabenNr) {
        const transaction = db.transaction(['aufgaben'], 'readonly');
        const store = transaction.objectStore('aufgaben');
        const request = store.get(currentAufgabenNr);

        request.onsuccess = async () => {
            const data = request.result;
            if (data) {
                // Felder füllen
                kundenNrField.value        = data.KundenNr        ?? "";
                kundeField.value           = data.Kunde           ?? "";
                stichwortField.value       = data.Stichwort       ?? "";
                ansprechpartnerField.value = data.Ansprechpartner ?? "";
                emailField.value           = data.EMail           ?? "";
                fehlermeldungField.value   = data.Fehlermeldung   ?? "";
                behebungField.value        = data.Behebung        ?? "";
                aktuelleAktionField.value  = data.aktuelleAktion  ?? "";
                aktuellerStatusField.value = data.aktuellerStatus ?? "";
                letzteAktionamField.value  = data.letzteAktionam  ?? "";

                // **KundenNr** ermitteln, um nur dessen Anbahnungen zu laden:
                const kundeNrNum = Number(data.KundenNr) || 0;

                // Nur Anbahnungen dieses Kunden laden:
                await loadAnbahnungenForCombo(db, kundeNrNum);

                // Falls AnbahnungNr > 0, Combo-Wert setzen:
                if (data.AnbahnungNr && Number(data.AnbahnungNr) > 0) {
                    $("#anbahnung").data("kendoComboBox").value(Number(data.AnbahnungNr));
                } else {
                    $("#anbahnung").data("kendoComboBox").value("");
                }

                // Delete-Button nur anzeigen, wenn Datensatz existiert
                deleteBtn.style.display = "inline-block";
            } else {
                alert('Keine Details zur Aufgabe gefunden.');
            }
        };
        request.onerror = (event) => {
            console.error('Fehler beim Abrufen der Aufgabe:', event.target.error);
        };
    } else {
        // Keine currentAufgabenNr => neue Aufgabe => Löschen ausblenden
        deleteBtn.style.display = "none";
    }

    // Zurück-Button
    document.getElementById('back-icon').addEventListener('click', () => {
        window.history.back();
    });

    // Speichern-Button (erledigt=false)
    saveBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await updateAufgabe(false);
    });

    // Erledigen-Button (erledigt=true)
    doneBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await updateAufgabe(true);
    });

    // Löschen-Button
    deleteBtn.addEventListener('click', async () => {
        if (!currentAufgabenNr) return;
        if (!confirm("Möchten Sie diese Aufgabe wirklich löschen?")) return;

        try {
            const sid = localStorage.getItem('SID');
            const aufgabe = [{ AufgabenNr: currentAufgabenNr }];
            const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-AdelAufgabe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'SID': sid
                },
                body: JSON.stringify(aufgabe)
            });

            if (!response.ok) {
                throw new Error(`Fehler beim Löschen der Aufgabe: ${response.status}`);
            }
            alert('Aufgabe erfolgreich gelöscht!');
            window.history.back();

        } catch (error) {
            console.error('Fehler beim Löschen der Aufgabe:', error);
            alert('Fehler beim Löschen. Bitte versuchen Sie es erneut.');
        }
    });
});

/**
 * Lädt nur die Anbahnungen für eine bestimmte KundenNr.
 */
async function loadAnbahnungenForCombo(db, kundenNr) {
    return new Promise((resolve, reject) => {
        const tx    = db.transaction(['anbahnungen'], 'readonly');
        const store = tx.objectStore('anbahnungen');
        const req   = store.getAll();

        req.onsuccess = (ev) => {
            const allAnbahnungen = ev.target.result ?? [];
            // Nur Anbahnungen, die KundenNr == 'kundenNr' haben
            const filtered = allAnbahnungen.filter(a => a.KundenNr === kundenNr);

            // Umbau in Kendo-Format { text, value }
            const data = filtered.map(a => ({
                text:  a.Beschreibung || `Anbahnung ${a.AnbahnungNr}`,
                value: a.AnbahnungNr
            }));
            console.log(data);
            $("#anbahnung").data("kendoComboBox").setDataSource(data);
            resolve();
        };
        req.onerror = (err) => {
            reject(err.target.error);
        };
    });
}

/**
 * Aufgabe speichern/aktualisieren (mit Feld 'erledigt' je nach Button).
 */
async function updateAufgabe(isDone) {
    const currentAufgabenNr = Number(localStorage.getItem('currentAufgabenNr'));
    const sid = localStorage.getItem('SID');

    // Felder aus dem DOM
    const kundenNr        = document.getElementById('kundenNr').value.trim();
    const kunde           = document.getElementById('kunde').value.trim();
    const stichwort       = document.getElementById('stichwort').value.trim();
    const ansprechpartner = document.getElementById('ansprechpartner').value.trim();
    const email           = document.getElementById('email').value.trim();
    const fehlermeldung   = document.getElementById('fehlermeldung').value.trim();
    const behebung        = document.getElementById('behebung').value.trim();
    const aktuelleAktion  = document.getElementById('aktuelleAktion').value.trim();
    const aktuellerStatus = document.getElementById('aktuellerStatus').value.trim();
    const letzteAktionam  = document.getElementById('letzteAktionam').value.trim();

    // Anbahnung aus dem Combo
    const anbahnungVal = $("#anbahnung").data("kendoComboBox").value();
    const anbahnungNr  = anbahnungVal ? Number(anbahnungVal) : null;

    // Objekt für REST:
    const aufgabeData = [{
        AufgabenNr:      currentAufgabenNr || null,
        KundenNr:        kundenNr ? Number(kundenNr) : null,
        Kunde:           kunde,
        Stichwort:       stichwort,
        Ansprechpartner: ansprechpartner,
        EMail:           email,
        Beschreibung:    fehlermeldung,
        Aufgaben:        behebung,
        aktuelleAktion:  aktuelleAktion,
        aktuellerStatus: aktuellerStatus,
        letzteAktionam:  letzteAktionam,
        erledigt:        isDone,
        AnbahnungNr:     anbahnungNr
    }];

    // Neu oder Update
    const apiAction = currentAufgabenNr ? "AupdAufgabe" : "AcreateAufgabe";

    try {
        const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-${apiAction}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'SID': sid
            },
            body: JSON.stringify(aufgabeData)
        });

        if (!response.ok) {
            throw new Error(`Fehler beim ${currentAufgabenNr ? "Aktualisieren" : "Erstellen"} der Aufgabe: ${response.status}`);
        }
        // Falls du die Aufgabe nochmal in die IndexedDB laden willst:
        await loadAufgaben(currentAufgabenNr);

        alert(`Aufgabe erfolgreich ${currentAufgabenNr ? "aktualisiert" : "erstellt"}!`);
        window.history.back();

    } catch (error) {
        console.error(`Fehler beim ${currentAufgabenNr ? "Aktualisieren" : "Erstellen"} der Aufgabe:`, error);
        alert(`Fehler beim ${currentAufgabenNr ? "Aktualisieren" : "Erstellen"}. Bitte versuchen Sie es erneut.`);
    }
}
