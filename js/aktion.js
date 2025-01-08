import { API_URL,APP_RQ } from './app.js';
import { openIndexedDB, initializeDatabase } from './indexedDB.js';
import { fetchKontaktpersonenData } from './fetch_kontaktpersonen.js';
// Optional: falls wir am Ende loadAktionen machen wollen
import { loadAktionen } from './load_aktionen.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeDatabase();
        kendo.culture("de-DE");

        // Termin-Datum und Zeit
        $("#TerminDatum").kendoDatePicker({
            dateInput: true,
            format: "dd.MM.yyyy"
        });
        $("#TerminZeit").kendoTimePicker({ format: "HH:mm" });
        $("#TerminDauer").kendoTimePicker({ format: "HH:mm" });

        // Kontaktperson, Workflow, Aktion, Status, Folgestatus - Comboboxes
        initComboBoxKontaktperson();
        initComboBoxWorkflow();
        initComboBoxAktion();
        initComboBoxStatus();
        initComboBoxFolgestatus();

        // MultiSelect für Mitarbeiter
        initMultiSelectMitarbeiter();
        await populateMultiMitarbeiter();

        // Kontaktpersonen, Workflow, Aktion, Status, Folgestatus laden
        await populateKontaktpersonIfNeeded();
        await populateWorkflow();
        await populateAktion();
        await populateStatus();
        await populateFolgestatus();

        // Falls wir "currentAufgabenNr" haben
        const currentAufgabenNr = localStorage.getItem("currentAufgabenNr");
        if (currentAufgabenNr) {
            $("#AufgabeNr").val(currentAufgabenNr);
        }

        // Kendo-Button und Popup-Menü
        $("#menu-button").kendoButton({
            click: function () {
                $("#popup-menu").kendoPopup({
                    anchor: "#menu-button",
                    position: "bottom left",
                    collision: "fit flip"
                }).data("kendoPopup").toggle();
            }
        });

        // Back-Icon
        document.getElementById('home-icon')?.addEventListener('click', () => {
            window.history.back();
        });

        // Submit und Cancel
        $("#details-form").on("submit", onSaveAktion);
        $("#cancel-button").on("click", () => {
            window.location.href = "../html/aktionen.html";
        });

    } catch (error) {
        console.error("Fehler beim Initialisieren der Aktion:", error);
    }
});

// --- Initialisierungen ---

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
        dataTextField: "WorkflowName",
        dataValueField: "Workflow",
        placeholder: "Workflow wählen...",
        filter: "contains",
        clearButton: true,
        change: onWorkflowChange
    });
}
function initComboBoxAktion() {
    $("#Aktion").kendoComboBox({
        dataTextField: "Aktion",
        dataValueField: "AktionsSchluessel",
        placeholder: "Aktion wählen...",
        filter: "contains",
        clearButton: true
    });
}
function initComboBoxStatus() {
    $("#Status").kendoComboBox({
        dataTextField: "Status",
        dataValueField: "StatusSchluessel",
        placeholder: "Status wählen...",
        filter: "contains",
        clearButton: true
    });
}
function initComboBoxFolgestatus() {
    $("#Folgestatus").kendoComboBox({
        dataTextField: "Status",
        dataValueField: "StatusSchluessel",
        placeholder: "Folgestatus wählen...",
        filter: "contains",
        clearButton: true
    });
}
// **Nur** MultiSelect für Mitarbeiter, KEINE 3 ComboBoxen
function initMultiSelectMitarbeiter() {
    $("#multiMitarbeiter").kendoMultiSelect({
        dataTextField: "Name",
        dataValueField: "MitarbeiterNr",
        placeholder: "Mitarbeiter auswählen...",
        filter: "contains",
        clearButton: true
    });
}

// --- Laden aus IndexedDB / befüllen der Widgets ---

async function populateKontaktpersonIfNeeded() {
    const currentKundenNr = localStorage.getItem("currentKundenNr");
    if (!currentKundenNr) return;

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
        console.error("Fehler bei populateKontaktpersonIfNeeded:", error);
    }
}
async function populateWorkflow() {
    const db = await openIndexedDB();
    const tx = db.transaction(["workflows"], "readonly");
    const store = tx.objectStore("workflows");
    const req = store.getAll();
    req.onsuccess = () => {
        const data = req.result || [];
        $("#Workflow").data("kendoComboBox").setDataSource(data);
    };
    req.onerror = () => console.error("Fehler beim Lesen 'workflows'");
}
async function populateAktion() {
    const db = await openIndexedDB();
    const tx = db.transaction(["aktionsschluessel"], "readonly");
    const store = tx.objectStore("aktionsschluessel");
    const req = store.getAll();
    req.onsuccess = () => {
        const data = req.result || [];
        $("#Aktion").data("kendoComboBox").setDataSource(data);
    };
    req.onerror = () => console.error("Fehler beim Lesen 'aktionsschluessel'");
}
async function populateStatus() {
    const db = await openIndexedDB();
    const tx = db.transaction(["statusschluessel"], "readonly");
    const store = tx.objectStore("statusschluessel");
    const req = store.getAll();
    req.onsuccess = () => {
        const data = req.result || [];
        $("#Status").data("kendoComboBox").setDataSource(data);
    };
    req.onerror = () => console.error("Fehler beim Lesen 'statusschluessel'");
}
async function populateFolgestatus() {
    const db = await openIndexedDB();
    const tx = db.transaction(["statusschluessel"], "readonly");
    const store = tx.objectStore("statusschluessel");
    const req = store.getAll();
    req.onsuccess = () => {
        const data = req.result || [];
        $("#Folgestatus").data("kendoComboBox").setDataSource(data);
    };
    req.onerror = () => console.error("Fehler beim Lesen (Folgestatus)");
}

// ** Nur MultiSelect für Mitarbeiter
async function populateMultiMitarbeiter() {
    const db = await openIndexedDB();
    const tx = db.transaction(["vertriebler"], "readonly");
    const store = tx.objectStore("vertriebler");
    const req = store.getAll();

    return new Promise((resolve, reject) => {
        req.onsuccess = () => {
            const data = req.result || [];
            // optional sort by name
            data.sort((a, b) => a.Name.localeCompare(b.Name));

            const multi = $("#multiMitarbeiter").data("kendoMultiSelect");
            multi.setDataSource(data);
            multi.value([]); // Start leer
            resolve();
        };
        req.onerror = (e) => {
            console.error("Fehler beim Lesen 'vertriebler':", e.target.error);
            reject(e.target.error);
        };
    });
}

// --- Event: Wenn Workflow gewählt => Standardfelder Aktion, Status, Folgestatus füllen
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
            if (!wfItem) return;
            $("#Aktion").data("kendoComboBox").value(wfItem.AktionsSchluessel || "");
            $("#Status").data("kendoComboBox").value(wfItem.StatusSchluessel  || "");
            $("#Folgestatus").data("kendoComboBox").value(wfItem.FolgestatusSchluessel || "");
        };
    });
}

// --- Formular absenden -> REST
async function onSaveAktion(ev) {
    ev.preventDefault();

    const terminDauerStr = $("#TerminDauer").val() || "";
    const terminDauerInMin = convertToMinutes(terminDauerStr);

    // MultiSelect -> array der Mitarbeiter
    const multi = $("#multiMitarbeiter").data("kendoMultiSelect");
    const mitarbeiterWerte = multi.value(); // z.B. [1,5,27]
    const mitarbeiterArray = mitarbeiterWerte.map(n => ({ MitarbeiterNr: Number(n) }));

    // AufgabeNr
    const aufgabeNrVal = $("#AufgabeNr").val();
    const aufgabeNrNum = aufgabeNrVal ? Number(aufgabeNrVal) : null;

    // restliche Felder
    const aktionKey = $("#Aktion").data("kendoComboBox").value() || "";
    const statusKey = $("#Status").data("kendoComboBox").value() || "";
    const folgeKey  = $("#Folgestatus").data("kendoComboBox").value() || "";
    const kontaktpersonNrVal = parseInt($("#Kontaktperson").data("kendoComboBox").value()) || null;

    // request body
    const data = [{
        AufgabeNr: aufgabeNrNum,
        MitarbeiterListe: mitarbeiterArray,
        Workflow: $("#Workflow").data("kendoComboBox").value(),
        AktionsSchluessel: aktionKey,
        StatusSchluessel: statusKey,
        FolgestatusSchluessel: folgeKey,
        KontaktpersonNr: kontaktpersonNrVal,
        Stichwort: $("#Stichwort").val(),
        externeInfo: $("#externeInfo").val(),
        TerminDatum: $("#TerminDatum").val(),
        TerminZeit:  $("#TerminZeit").val(),
        TerminDauer: terminDauerInMin,
        letzteAktionschliessen: $("#letzteAktionschliessen").is(":checked")
    }];

    console.log("Aktion absenden =>", data);

    try {
        const sid = localStorage.getItem('SID');
        const resp = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Asetcrmaktion`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'SID': sid
            },
            body: JSON.stringify(data)
        });
        if (!resp.ok) {
            throw new Error(`HTTP-Fehler beim Speichern: ${resp.status}`);
        }
        const result = await resp.json();
        const newAktionNr = result[0]?.AktionNr;
        console.log("Neue AktionNr:", newAktionNr);

        // Optional in localStorage
        localStorage.setItem("currentAktionNr", newAktionNr || "");
        if (aufgabeNrNum) {
            localStorage.setItem("currentAufgabenNr", aufgabeNrNum);
        }

        alert("Aktion erfolgreich gespeichert!");
        // Optional: loadAktionen(...) => in IndexedDB
        // Dann zurück
        window.location.href = "../html/aufgaben.html";

    } catch (error) {
        console.error("Fehler beim Speichern der Aktion:", error);
        alert("Fehler beim Speichern der Aktion: " + error.message);
    }
}

// Hilfsfunktion
function convertToMinutes(str) {
    if (!str.includes(":")) return 0;
    const [h,m] = str.split(":").map(Number);
    return h * 60 + (m||0);
}
