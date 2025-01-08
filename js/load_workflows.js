import { API_URL,APP_RQ } from './app.js';
import { openIndexedDB } from './indexedDB.js';

export async function load_workflows() {
    try {
        const sid = localStorage.getItem('SID');
        const response = await fetch(`${API_URL}${APP_RQ}&ARGUMENTS=-Agetcrmworkflows`, {
            headers: {
                'Content-Type': 'application/json',
                'SID': sid
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP-Fehler! Status: ${response.status}`);
        }

        const workflowsData = await response.json();

        // Überprüfen, ob wir ein Array erhalten und es nicht leer ist
        if (!Array.isArray(workflowsData) || workflowsData.length === 0) {
            throw new Error("Keine Workflows-Daten empfangen oder ungültiges Format.");
        }

        const db = await openIndexedDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['workflows'], 'readwrite');
            const store = transaction.objectStore('workflows');

            // Daten aus der REST-API in die IndexedDB speichern
            workflowsData.forEach(entry => {
                // Optional weiter prüfen, ob Workflow und WorkflowName vorhanden sind
                if (!entry.Workflow || !entry.WorkflowName) {
                    console.warn("Ungültiger Eintrag in workflowsData:", entry);
                    return; // Überspringt nur diesen fehlerhaften Datensatz
                }
                store.put({
                    Workflow: entry.Workflow,
                    WorkflowName: entry.WorkflowName,
                    AktionsSchluessel: entry.AktionsSchluessel,
                    StatusSchluessel: entry.StatusSchluessel,
                    FolgestatusSchluessel: entry.FolgestatusSchluessel
                });
            });

            transaction.oncomplete = () => resolve();
            transaction.onerror = (event) => {
                console.error("Fehler beim Speichern der Workflows in IndexedDB:", event.target.error);
                reject(event.target.error);
            };
        });
    } catch (error) {
        console.error('Fehler beim Laden der Workflows:', error);
        throw error;
    }
}
