// drawer.js

/**
 * Initialisiert das Kendo Drawer-Menü.
 * Rufe diese Funktion in jeder Seite auf, wo du das Menü brauchst.
 */
export function initDrawerMenu() {
    // Drawer-Items definieren:
    const drawerItems = [
        {
            text: 'Aktionen',
            icon: 'k-i-tick',   // oder passendes Icon
            url: '../html/aktionen.html'
        },
        {
            text: 'Aufgaben',
            icon: 'k-i-check',
            url: '../html/aufgaben.html'
        },
        // ...
        {
            text: 'Termine',
            icon: 'k-i-calendar',
            url: '../html/termine.html'
        },
        {
            text: 'Logout',
            icon: 'k-i-logout',
            // hier kein url, sondern special action
            action: 'logout'
        }
    ];

    // Zeichne den Drawer in #app-drawer
    $("#app-drawer").kendoDrawer({
        mode: "push",           // oder "overlay"
        position: "left",       // Drawer von links
        items: drawerItems.map(item => ({
            text: item.text,
            icon: item.icon,
            cssClass: "drawer-link"
            // extra: man kann "action" oder "url" etc. in "attr" oder "data"
        })),
        // Standard:
        // (Wenn du Klick-Events selbst abfängst, setz `itemClick: onDrawerItemClick`)
    });

    // optional: Klick-Handling
    const drawer = $("#app-drawer").getKendoDrawer();
    drawer.bind("itemClick", function(e) {
        // e.item - enthält <li>...
        // e.sender.items[e.itemIndex] => item config
        const clickedItem = drawerItems[e.itemIndex];

        if (clickedItem.action === 'logout') {
            // handle logout
            localStorage.clear();
            window.location.href = '../html/login.html';
        }
        else if (clickedItem.url) {
            window.location.href = clickedItem.url;
        }
    });
}

/**
 * Zeigt oder versteckt den Drawer je nach Wunsch:
 */
export function toggleDrawer() {
    const drawer = $("#app-drawer").data("kendoDrawer");
    if (drawer) {
        drawer.toggle();
    }
}
