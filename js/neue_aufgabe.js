import { openIndexedDB } from './indexedDB.js';
import { API_URL,APP_RQ } from './app.js';
import { fetchKontaktpersonenData } from './fetch_kontaktpersonen.js';
import { fetchVertrieblerData } from './fetch_vertriebler.js';
import { loadAufgaben } from "./load_aufgaben.js";

window.addEventListener("pageshow", function (event) {
    if (event.persisted) {
        // Browser hat Seite aus Cache restored
        // => Refresh der Felder erwingen:
        const currentKundenNr = localStorage.getItem("currentKundenNr");
        if (currentKundenNr) {
            document.getElementById('kunden-nr').value = currentKundenNr;
            validateKundenNr(currentKundenNr);
        }
    }
});

document.addEventListener('DOMContentLoaded', async () => {

    // Cancel-Button => zurück zur Aufgaben-Übersicht
    document.getElementById('cancel-button').addEventListener('click', () => {
        window.location.href = "../html/aufgaben.html";
    });

    // Falls wir aus einer anderen Seite "currentKundenNr" übergeben bekommen haben:
    const currentKundenNr = localStorage.getItem("currentKundenNr");
    if (currentKundenNr) {
        const input = document.getElementById('kunden-nr');
        input.value = currentKundenNr;
        // KundenNr validieren und Kunde + Anbahnungen + Kontaktpersonen etc. laden
        await validateKundenNr(currentKundenNr);
    }

    // KundenNr-Eingabe => validieren
    $("#kunden-nr").on("input", async function () {
        const kundenNr = $(this).val().trim();
        if (!kundenNr) {
            $("#kunde").val("");
            resetKontaktpersonenCombobox();
            return;
        }
        await validateKundenNr(kundenNr);
    });

    // Button: Kundensuche => leitet zur Kundenliste
    $("#search-kunde-button").on("click", function () {
        localStorage.setItem("sourcePage", "neue_aufgabe");
        window.location.href = "../html/kunden.html";
    });

    // 1) ComboBox-Strukturen initialisieren (noch ohne Daten oder leere DataSource)
    initComboBoxAnbahnung();
    initComboBoxKontaktperson();
    initComboBoxVertriebler();
    initComboBoxWorkflow();
    initComboBoxAktion();
    initComboBoxStatus();
    initComboBoxKlassifizierung();

    // 2) ComboBoxen ggf. direkt mit Daten aus der IndexedDB füllen
    //    (z. B. Vertriebler, Workflow, Aktion, Status, Klassifizierung)
    //    Da diese DB-Stores i. d. R. unabhängig von KundenNr sind,
    //    können wir sie jetzt (beim Start) befüllen.
    await populateVertriebler();        // store "vertriebler"
    await populateWorkflow();           // store "workflows"
    await populateAktion();             // store "aktionsschluessel"
    await populateStatus();             // store "statusschluessel"
    await populateKlassifizierung();    // store "klassifizierungen"
    // (Anbahnung + Kontaktperson werden erst nach validateKundenNr gefüllt)

    // Submit-Handler => Aufgabe anlegen
    $("#aufgabe-form").on("submit", async (event) => {
        event.preventDefault();

        // Felder abgreifen
        const kundenNr        = parseInt($("#kunden-nr").val()) || null;
        const anbahnungNr     = parseInt($("#anbahnung-nr").data("kendoComboBox").value()) || null;
        const kontaktpersonNr = parseInt($("#kontaktperson-nr").data("kendoComboBox").value()) || null;
        const vertrieblerNr   = parseInt($("#vertriebler").data("kendoComboBox").value()) || null;
        const workflowValue   = $("#workflow").data("kendoComboBox").value();   // String / Code
        const aktionValue     = $("#aktion").data("kendoComboBox").value();     // String / Code
        const statusValue     = $("#status").data("kendoComboBox").value();     // String / Code
        const klassifValue    = parseInt($("#klassifizierung").data("kendoComboBox").value()) || null;

        const stichwort    = $("#stichwort").val().trim();
        const beschreibung = $("#beschreibung").val().trim();
        const aufgaben     = $("#aufgaben").val().trim();

        const formData = [{
            KundenNr:          kundenNr,
            AnbahnungNr:       anbahnungNr,
            KontaktpersonNr:   kontaktpersonNr,
            VertrieblerNr:     vertrieblerNr,
            Workflow:          workflowValue,
            AktionsSchluessel: aktionValue,
            StatusSchluessel:  statusValue,
            KlassifizierungNr: klassifValue,  // <== NEU

            Stichwort:         stichwort,
            Beschreibung:      beschreibung,
            Aufgaben:          aufgaben
        }];

        console.log("Absenden an REST:", formData);

        try {
            const aufgabenNr = await createAufgabe(formData);
            if (!aufgabenNr) {
                alert("Fehler: Keine AufgabenNr zurückbekommen.");
                return;
            }

            // currentAufgabenNr merken
            localStorage.setItem("currentAufgabenNr", aufgabenNr);

            // loadAufgaben => in IndexedDB speichern
            await loadAufgaben(aufgabenNr);

            alert("Aufgabe erfolgreich gespeichert.");
            window.location.href = "../html/aufgaben.html";

        } catch (error) {
            console.error("Fehler beim Speichern:", error);
            alert(`Fehler beim Speichern: ${error.message}`);
        }
    });
});

/**
 * Erzeugt Aufgabe über die REST-API
 */
async function createAufgabe(data) {
    const sid = localStorage.getItem('SID');
    const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Acreateaufgabe`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'SID': sid
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        throw new Error(`Fehler beim Erstellen der Aufgabe: ${response.status}`);
    }
    const result = await response.json();
    return result[0]?.AufgabenNr;  // Annahme: Array mit [{AufgabenNr:123,...}]
}

/**
 * Validiert KundenNr (lokal in IndexedDB "kunden") und belegt ggf. Kunde-Feld,
 * sowie Anbahnungen + Kontaktpersonen.
 */
async function validateKundenNr(kundenNr) {
    const db = await openIndexedDB();
    const tx = db.transaction(['kunden'], 'readonly');
    const store = tx.objectStore('kunden');
    const req = store.get(Number(kundenNr));

    req.onsuccess = () => {
        const kunde = req.result;
        if (kunde) {
            $("#kunde").val(kunde.Kunde || "Kein Kunde vorhanden");

            // Anbahnung + Kontaktpersonen (indexedDB) filtern
            populateAnbahnungen(kundenNr);
            populateKontaktpersonen(kundenNr);

        } else {
            $("#kunde").val("Kunde nicht in DB");
            resetKontaktpersonenCombobox();
        }
    };
    req.onerror = () => {
        $("#kunde").val("Fehler beim Laden der Kundendaten");
    };
}

// ---------- ComboBox-Hilfsfunktionen ----------

// 1) Nur Strukturen anlegen
function initComboBoxAnbahnung() {
    $("#anbahnung-nr").kendoComboBox({
        dataTextField: "Beschreibung",
        dataValueField: "AnbahnungNr",
        placeholder: "Anbahnung wählen...",
        filter: "contains",
        clearButton: true
    });
}
function initComboBoxKontaktperson() {
    $("#kontaktperson-nr").kendoComboBox({
        dataTextField: "Name",
        dataValueField: "PersonNr",
        placeholder: "Kontaktperson wählen...",
        filter: "contains",
        clearButton: true
    });
}
function initComboBoxVertriebler() {
    $("#vertriebler").kendoComboBox({
        dataTextField: "Name",
        dataValueField: "MitarbeiterNr",
        placeholder: "Vertriebler wählen...",
        filter: "contains",
        clearButton: true
    });
}
function initComboBoxWorkflow() {
    $("#workflow").kendoComboBox({
        dataTextField: "WorkflowName",
        dataValueField: "Workflow",
        placeholder: "Workflow auswählen...",
        filter: "contains",
        clearButton: true
    });
}
function initComboBoxAktion() {
    $("#aktion").kendoComboBox({
        dataTextField: "Aktion",
        dataValueField: "AktionsSchluessel",
        placeholder: "Aktion wählen...",
        filter: "contains",
        clearButton: true
    });
}
function initComboBoxStatus() {
    $("#status").kendoComboBox({
        dataTextField: "Status",          // oder "StatusText"
        dataValueField: "StatusSchluessel",
        placeholder: "Status wählen...",
        filter: "contains",
        clearButton: true
    });
}
function initComboBoxKlassifizierung() {
    $("#klassifizierung").kendoComboBox({
        dataTextField: "Klassifizierung",
        dataValueField: "KlassifizierungNr",
        placeholder: "Klassifizierung wählen...",
        filter: "contains",
        clearButton: true
    });
}

// 2) Daten in diese ComboBoxen laden
function resetKontaktpersonenCombobox() {
    const combo = $("#kontaktperson-nr").data("kendoComboBox");
    if (combo) {
        combo.setDataSource([]);
        combo.value("");
    }
}

// a) Anbahnungen => indexdb "anbahnungen" filtern auf KundenNr
async function populateAnbahnungen(kundenNr) {
    const db = await openIndexedDB();
    const tx = db.transaction(['anbahnungen'], 'readonly');
    const store = tx.objectStore('anbahnungen');
    const req = store.getAll();

    req.onsuccess = () => {
        let data = req.result || [];

        // 1) Nur Anbahnungen zu diesem Kunden
        data = data.filter(a => a.KundenNr === Number(kundenNr));

        // 2) Nur "aktive" Anbahnungen – je nachdem, wie das Flag heißt:
        //    Beispiel: Falls a.Status === "A" die aktive Markierung ist:
        data = data.filter(a => a.Status === "A");

        const combo = $("#anbahnung-nr").data("kendoComboBox");
        combo.setDataSource(data);
        combo.value("");

        // Falls noch eine "currentAnbahnungNr" existiert -> selecten
        const curr = Number(localStorage.getItem("currentAnbahnungNr"));
        if (curr) {
            const found = data.find(x => x.AnbahnungNr === curr);
            if (found) combo.value(curr);
        }
    };

    req.onerror = () => console.error("Fehler beim Lesen aus 'anbahnungen'");
}


// b) Kontaktpersonen => fetchKontaktpersonenData + in DB => in Combo
async function populateKontaktpersonen(kundenNr) {
    try {
        const data = await fetchKontaktpersonenData(kundenNr);
        // optional: in DB "kontaktpersonen" speichern
        const db = await openIndexedDB();
        const tx = db.transaction(['kontaktpersonen'], 'readwrite');
        const store = tx.objectStore('kontaktpersonen');
        data.forEach(d => store.put(d));

        const combo = $("#kontaktperson-nr").data("kendoComboBox");
        combo.setDataSource(data);
        combo.value("");
    } catch (error) {
        console.error("Fehler beim Laden der Kontaktpersonen:", error);
    }
}

// c) Vertriebler => indexdb "vertriebler" ODER fetchVertrieblerData
async function populateVertriebler() {
    // Beispiel: fetchVertrieblerData() (Rest-API) oder read store "vertriebler"
    const data = await fetchVertrieblerData();
    const combo = $("#vertriebler").data("kendoComboBox");
    combo.setDataSource(data);
    combo.value("");
}

// d) Workflow => store "workflows"
async function populateWorkflow() {
    const db = await openIndexedDB();
    const tx = db.transaction(['workflows'], 'readonly');
    const store = tx.objectStore('workflows');
    const req = store.getAll();
    req.onsuccess = () => {
        const data = req.result || [];
        const combo = $("#workflow").data("kendoComboBox");
        combo.setDataSource(data);
        combo.value("");
    };
    req.onerror = () => console.error("Fehler beim Lesen workflows");
}

// e) Aktion => store "aktionsschluessel"
async function populateAktion() {
    const db = await openIndexedDB();
    const tx = db.transaction(['aktionsschluessel'], 'readonly');
    const store = tx.objectStore('aktionsschluessel');
    const req = store.getAll();
    req.onsuccess = () => {
        const data = req.result || [];
        const combo = $("#aktion").data("kendoComboBox");
        combo.setDataSource(data);
        combo.value("");
    };
    req.onerror = () => console.error("Fehler beim Lesen aktionsschluessel");
}

// f) Status => store "statusschluessel"
async function populateStatus() {
    const db = await openIndexedDB();
    const tx = db.transaction(['statusschluessel'], 'readonly');
    const store = tx.objectStore('statusschluessel');
    const req = store.getAll();
    req.onsuccess = () => {
        const data = req.result || [];
        const combo = $("#status").data("kendoComboBox");
        combo.setDataSource(data);
        combo.value("");
    };
    req.onerror = () => console.error("Fehler beim Lesen statusschluessel");
}

// g) Klassifizierung => store "klassifizierungen"
async function populateKlassifizierung() {
    const db = await openIndexedDB();
    const tx = db.transaction(['klassifizierungen'], 'readonly');
    const store = tx.objectStore('klassifizierungen');
    const req = store.getAll();
    req.onsuccess = () => {
        const data = req.result || [];
        const combo = $("#klassifizierung").data("kendoComboBox");
        combo.setDataSource(data);
        combo.value("");
    };
    req.onerror = () => console.error("Fehler beim Lesen klassifizierungen");
}
