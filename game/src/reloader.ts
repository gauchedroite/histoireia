import * as App from "./core/app.js"

export const NS = "RELOADER";


// This makes the :active CSS pseudo selector work to style taps on elements.
//document.addEventListener("touchstart", () => {});


// Detect dragged down and springs up to reload the css and js.
let startY = 0;
let isDraggingDown = false;

// (Note: this also makes the :active CSS pseudo selector work to style taps on elements)
window.addEventListener("touchstart", function(event) {
    startY = event.touches[0].clientY
    isDraggingDown = false
});

window.addEventListener("touchmove", function(event) {
    let currentY = event.touches[0].clientY;
    if (currentY > (startY + 250)) {
        isDraggingDown = true
    }
})

window.addEventListener("touchend", function(event) {
    if (isDraggingDown) {
        isDraggingDown = false
        reload()
    }
})

export const reload = () => {
    reloadCss()
    reloadJs()
}

function reloadCss() {
    const linkElement = document.querySelector('link[data-role="index-css"]') as HTMLAnchorElement
    if (linkElement) {
        const href = linkElement.getAttribute("href")!.split("?")[0]
        linkElement.href = `${href}?v=${new Date().getTime()}`
    }
}

function reloadJs() {
    const scriptElement = document.querySelector('script[data-role="index-js"]') as HTMLScriptElement
    if (scriptElement) {
        const src = scriptElement.src
        scriptElement.parentNode?.removeChild(scriptElement)

        const newScript = document.createElement("script")
        newScript.dataset.role = "index-js"
        newScript.src = `${src}?v=${new Date().getTime()}`

        document.body.appendChild(newScript);

        setTimeout(function() { window.location.reload() } , 0)
        //App.renderOnNextTick()
    }
}
