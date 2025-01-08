import { API_URL,APP_RQ } from './app.js';
import { openIndexedDB, initializeDatabase } from './indexedDB.js';
import { fetchKontaktpersonenData } from './fetch_kontaktpersonen.js';
// Falls Sie Workflow- / Aktion- / Status- Laden brauchen:
import { loadAktionen } from './load_aktionen.js'; // optional, falls Sie nach dem Speichern neu laden wollen

document.addEventListener('DOMContentLoaded', async () => {

    // Zurück-Button
    document.getElementById('home-icon').addEventListener('click', () => {
        window.history.back();
    });

    try {
        await initializeDatabase();
        kendo.culture("de-DE");

        // ... Ihre bisherigen Init-Funktionen ...
        initComboBoxKontaktperson();
        initComboBoxWorkflow();
        initComboBoxAktion();
        initComboBoxStatus();
        initComboBoxFolgestatus();
        await populateKontaktpersonIfNeeded();
        await populateWorkflow();
        await populateAktion();
        await populateStatus();
        await populateFolgestatus();

        const currentAktionNr = Number(localStorage.getItem("currentAktionNr"));
        if (currentAktionNr) {
            await loadExistingAktion(currentAktionNr);
        }

        // Statt on("submit", ...) machen wir je Button e. listener
        document.getElementById('save-button').addEventListener('click', onSaveAction);
        document.getElementById('done-button').addEventListener('click', onDoneAction);

        // Cancel-Button => ...
        document.getElementById('cancel-button').addEventListener('click', () => {
            window.location.href = "../html/aktionen.html";
        });

    } catch (error) {
        console.error("Fehler beim Initialisieren aktion_erledigen.js:", error);
    }
});


/**
 * Handler für "Speichern" (erledigt = false).
 */
async function onSaveAction(ev) {
    ev.preventDefault();

    const currentAktionNr = Number(localStorage.getItem("currentAktionNr"));
    if (!currentAktionNr) {
        alert("Keine AktionNr im localStorage gefunden!");
        return;
    }
    // Abfrage Felder, z.B.:
    const kontaktpersonNrVal = parseInt($("#Kontaktperson").data("kendoComboBox").value()) || null;
    const workflowVal        = $("#Workflow").data("kendoComboBox").value() || "";
    const aktionVal          = $("#Aktion").data("kendoComboBox").value() || "";
    const statusVal          = $("#Status").data("kendoComboBox").value() || "";
    const folgestatusVal     = $("#Folgestatus").data("kendoComboBox").value() || "";
    const stichwortVal       = $("#stichwort").val() || "";
    const externeInfoVal     = $("#externeInfo").val() || "";
    const aufgabenNrVal      = parseInt($("#AufgabeNr").val())  || null;

    // Hier modus="M", erledigt=false
    const payload = [{
        AufgabeNr: aufgabenNrVal,
        AktionNr:   currentAktionNr,
        modus:      "M",
        erledigt:   false,

        KontaktpersonNr: kontaktpersonNrVal,
        Workflow:   workflowVal,
        AktionsSchluessel: aktionVal,
        StatusSchluessel:  statusVal,
        FolgestatusSchluessel: folgestatusVal,

        Stichwort:   stichwortVal,
        externeInfo: externeInfoVal
    }];

    await sendAktionUpdate(payload);
}

/**
 * Handler für "Erledigen" (erledigt = true).
 */
async function onDoneAction(ev) {
    ev.preventDefault();

    const currentAktionNr = Number(localStorage.getItem("currentAktionNr"));
    if (!currentAktionNr) {
        alert("Keine AktionNr im localStorage gefunden!");
        return;
    }
    // Abfrage Felder, z.B.:
    const kontaktpersonNrVal = parseInt($("#Kontaktperson").data("kendoComboBox").value()) || null;
    const workflowVal        = $("#Workflow").data("kendoComboBox").value() || "";
    const aktionVal          = $("#Aktion").data("kendoComboBox").value() || "";
    const statusVal          = $("#Status").data("kendoComboBox").value() || "";
    const folgestatusVal     = $("#Folgestatus").data("kendoComboBox").value() || "";
    const stichwortVal       = $("#stichwort").val() || "";
    const externeInfoVal     = $("#externeInfo").val() || "";
    const aufgabenNrVal      = parseInt($("#AufgabeNr").val())  || null;

    // Hier modus="M", erledigt=true
    const payload = [{
        AufgabeNr: aufgabenNrVal,
        AktionNr:   currentAktionNr,
        modus:      "M",
        erledigt:   true,

        KontaktpersonNr: kontaktpersonNrVal,
        Workflow:   workflowVal,
        AktionsSchluessel: aktionVal,
        StatusSchluessel:  statusVal,
        FolgestatusSchluessel: folgestatusVal,

        Stichwort:   stichwortVal,
        externeInfo: externeInfoVal
    }];

    await sendAktionUpdate(payload);
}

/**
 * Gemeinsame Funktion zum Senden an die REST-API (Asetcrmaktion).
 */
async function sendAktionUpdate(payload) {
    console.log("Sende an REST:", payload);

    const sid = localStorage.getItem('SID');
    try {
    const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Asetcrmaktion`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'SID': sid
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            if (response.status === 401) {
                alert("Session abgelaufen, bitte neu einloggen!");
                window.location.href = "../html/login.html";
                return;
            }
            throw new Error(`Fehler beim Aktualisieren der Aktion: HTTP ${response.status}`);
        }

        const result = await response.json();
        const updatedAktionNr = result[0]?.AktionNr;
        console.log("Update erfolgreich, AktionNr:", updatedAktionNr);

        alert("Aktion wurde erfolgreich gespeichert.");
        await loadAktionen(0,0,updatedAktionNr);
        window.location.href = "../html/aktionen.html";

    } catch (error) {
        console.error("Fehler beim Update der Aktion:", error);
        alert("Fehler beim Speichern: " + error.message);
    }
}

/** -------------------- ComboBox-Init-Funktionen -------------------- */
function initComboBoxKontaktperson() {
    $("#Kontaktperson").kendoComboBox({
        dataTextField: "Name",
        dataValueField: "PersonNr",
        placeholder: "Kontaktperson wählen...",
        filter: "contains",
        clearButton: true
    });
}
function initComboBoxWorkflow() {
    $("#Workflow").kendoComboBox({
        dataTextField:  "WorkflowName",
        dataValueField: "Workflow",
        placeholder:    "Workflow wählen...",
        filter:         "contains",
        clearButton:    true,
        change:         onWorkflowChange
    });
}
function initComboBoxAktion() {
    $("#Aktion").kendoComboBox({
        dataTextField:  "Aktion",
        dataValueField: "AktionsSchluessel",
        placeholder:    "Aktion wählen...",
        filter:         "contains",
        clearButton:    true
    });
}
function initComboBoxStatus() {
    $("#Status").kendoComboBox({
        dataTextField:  "Status",
        dataValueField: "StatusSchluessel",
        placeholder:    "Status wählen...",
        filter:         "contains",
        clearButton:    true
    });
}
function initComboBoxFolgestatus() {
    $("#Folgestatus").kendoComboBox({
        dataTextField:  "Status",
        dataValueField: "StatusSchluessel",
        placeholder:    "Folgestatus wählen...",
        filter:         "contains",
        clearButton:    true
    });
}

/** -------------------- IndexedDB-Daten befüllen -------------------- */

// Kontaktpersonen, falls currentKundenNr gesetzt
async function populateKontaktpersonIfNeeded() {
    const currentKundenNr = localStorage.getItem("currentKundenNr");
    if (!currentKundenNr) {
        console.log("Keine currentKundenNr -> Kontaktperson leer.");
        return;
    }
    try {
        const kontaktpersonenData = await fetchKontaktpersonenData(Number(currentKundenNr));
        const db = await openIndexedDB();
        const tx = db.transaction(["kontaktpersonen"], "readwrite");
        const store = tx.objectStore("kontaktpersonen");
        kontaktpersonenData.forEach(kp => store.put(kp));
        const combo = $("#Kontaktperson").data("kendoComboBox");
        combo.setDataSource(kontaktpersonenData);
        combo.value("");
    } catch (error) {
        console.error("Fehler beim Laden der Kontaktpersonen:", error);
    }
}

// Workflow
async function populateWorkflow() {
    const db = await openIndexedDB();
    const tx = db.transaction(["workflows"], "readonly");
    const store = tx.objectStore("workflows");
    const req = store.getAll();
    req.onsuccess = () => {
        const data = req.result || [];
        $("#Workflow").data("kendoComboBox").setDataSource(data);
    };
    req.onerror = () => console.error("Fehler beim Lesen aus workflows");
}

// Aktion
async function populateAktion() {
    const db = await openIndexedDB();
    const tx = db.transaction(["aktionsschluessel"], "readonly");
    const store = tx.objectStore("aktionsschluessel");
    const req = store.getAll();
    req.onsuccess = () => {
        const data = req.result || [];
        $("#Aktion").data("kendoComboBox").setDataSource(data);
    };
    req.onerror = () => console.error("Fehler beim Lesen aus aktionsschluessel");
}

// Status
async function populateStatus() {
    const db = await openIndexedDB();
    const tx = db.transaction(["statusschluessel"], "readonly");
    const store = tx.objectStore("statusschluessel");
    const req = store.getAll();
    req.onsuccess = () => {
        const data = req.result || [];
        $("#Status").data("kendoComboBox").setDataSource(data);
    };
    req.onerror = () => console.error("Fehler beim Lesen aus statusschluessel");
}

// Folgestatus
async function populateFolgestatus() {
    const db = await openIndexedDB();
    const tx = db.transaction(["statusschluessel"], "readonly");
    const store = tx.objectStore("statusschluessel");
    const req = store.getAll();
    req.onsuccess = () => {
        const data = req.result || [];
        $("#Folgestatus").data("kendoComboBox").setDataSource(data);
    };
    req.onerror = () => console.error("Fehler beim Lesen (Folgestatus) aus statusschluessel");
}

/**
 * Lädt die vorhandene Aktion aus IndexedDB (Store "aktionen")
 * anhand currentAktionNr. Füllt dann die Felder vor,
 * z.B. "AufgabeNr", "Kontaktperson", "Workflow" etc.
 */
async function loadExistingAktion(currentAktionNr) {
    try {
        const db = await openIndexedDB();
        const tx = db.transaction(["aktionen"], "readonly");
        const store = tx.objectStore("aktionen");
        const req = store.get(currentAktionNr); // keyPath: "AktionNr"

        req.onsuccess = () => {
            const aktion = req.result;
            if (!aktion) {
                console.warn("Aktion nicht in IndexedDB gefunden:", currentAktionNr);
                return;
            }
            // Felder füllen
            $("#AufgabeNr").val(aktion.AufgabenNr || "");
            $("#Kontaktperson").data("kendoComboBox").value(aktion.KontaktpersonNr || null);
            $("#Workflow").data("kendoComboBox").value(aktion.Workflow || "");
            $("#Aktion").data("kendoComboBox").value(aktion.AktionsSchluessel  || "");
            $("#Status").data("kendoComboBox").value(aktion.StatusSchluessel  || "");
            $("#Folgestatus").data("kendoComboBox").value(aktion.FolgestatusSchluessel || "");

            $("#stichwort").val(aktion.Beschreibung || "");
            $("#externeInfo").val(aktion.externeInfo || "");
        };
        req.onerror = e => {
            console.error("Fehler beim Laden der Aktion:", e.target.error);
        };
    } catch (error) {
        console.error("Fehler loadExistingAktion:", error);
    }
}

/**
 * Reagiert auf Änderung des Workflow-ComboBox => belegt Aktion/Status/Folgestatus.
 */
function onWorkflowChange(e) {
    const comboWorkflow = e.sender;
    const selectedWorkflowKey = comboWorkflow.value();
    if (!selectedWorkflowKey) {
        $("#Aktion").data("kendoComboBox").value("");
        $("#Status").data("kendoComboBox").value("");
        $("#Folgestatus").data("kendoComboBox").value("");
        return;
    }
    openIndexedDB().then(db => {
        const tx = db.transaction(["workflows"], "readonly");
        const store = tx.objectStore("workflows");
        const req = store.get(selectedWorkflowKey);

        req.onsuccess = () => {
            const wfItem = req.result;
            if (!wfItem) {
                console.warn("Workflow nicht gefunden:", selectedWorkflowKey);
                return;
            }
            $("#Aktion").data("kendoComboBox").value(wfItem.AktionsSchluessel || "");
            $("#Status").data("kendoComboBox").value(wfItem.StatusSchluessel  || "");
            $("#Folgestatus").data("kendoComboBox").value(wfItem.FolgestatusSchluessel || "");
        };
        req.onerror = () => {
            console.error("Fehler beim Lesen Workflow aus DB:", selectedWorkflowKey);
        };
    });
}

