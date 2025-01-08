document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('email-form');
    const templateSelect = document.getElementById('template');
    const messageTextarea = document.getElementById('message');

    const vorlagen = {
        anfrage: "Sehr geehrte/r {name},\n\nwir würden uns freuen, mit Ihrer Firma {firma} zusammenzuarbeiten. Haben Sie Zeit für ein Gespräch?\n\nMit freundlichen Grüßen,\nIhr Team",
        danke: "Sehr geehrte/r {name},\n\nwir danken Ihnen für Ihr Vertrauen und freuen uns, mit Ihrer Firma {firma} zusammenzuarbeiten.\n\nMit freundlichen Grüßen,\nIhr Team",
        meeting: "Sehr geehrte/r {name},\n\nkönnten wir ein Meeting am {datum} vereinbaren? Wir möchten gerne die nächsten Schritte mit Ihrer Firma {firma} besprechen.\n\nMit freundlichen Grüßen,\nIhr Team"
    };

    templateSelect.addEventListener('change', () => {
        const selectedTemplate = templateSelect.value;
        const vorlageText = vorlagen[selectedTemplate] || "";
        messageTextarea.value = vorlageText;
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();  // Verhindere das Standard-Submit-Verhalten

        const email = document.getElementById('email').value.trim();
        const subject = document.getElementById('subject').value.trim();
        let message = document.getElementById('message').value.trim();

        // Echte Werte für die Platzhalter
        const ansprechpartner = { name: "Max Mustermann", firma: "Mustermann GmbH", kundenNr: "12345", datum: "20.12.2024" };

        // Platzhalter ersetzen
        message = message.replace(/{name}/g, ansprechpartner.name)
            .replace(/{firma}/g, ansprechpartner.firma)
            .replace(/{kundenNr}/g, ansprechpartner.kundenNr)
            .replace(/{datum}/g, ansprechpartner.datum);

        const emailData = {
            to: email,
            subject: subject,
            text: message
        };

        try {
            const response = await fetch('/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(emailData)
            });

            if (!response.ok) {
                throw new Error('Fehler beim Senden der E-Mail');
            }

            const result = await response.text();
            alert('E-Mail erfolgreich gesendet: ' + result);
        } catch (error) {
            console.error('Fehler beim Senden der E-Mail:', error);
            alert('E-Mail konnte nicht gesendet werden.');
        }
    });
});
