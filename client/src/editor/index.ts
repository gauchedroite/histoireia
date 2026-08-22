import * as App from "../core/app.js"
import * as Editor from "./editor.js"
import * as Lookup from "../lookupdata.js"

// Standalone entry for editor.html. Boots only the admin editor (no router, no
// game screens, no WebGL). Security is handled outside the app (see Caddyfile).
(window as any)[App.NS] = App;
(window as any)[Editor.NS] = Editor;

App.initialize(
    () => Editor.render(),
    () => Editor.postRender(),
    "Éditeur"
);

// Populate LUID_KIND_ADV, then show the editor list.
Lookup.populateLUID().then(() => Editor.fetch());
