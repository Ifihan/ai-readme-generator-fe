"use strict";
/// <reference types="chrome" />
// This content script runs in the auth tab. It watches localStorage for
// 'access_token' and notifies the extension when it becomes available.
function notify(token) {
    try {
        chrome.runtime.sendMessage({ type: "ACCESS_TOKEN", token });
    }
    catch (e) {
        // ignore
    }
}
function checkNow() {
    try {
        const token = window.localStorage.getItem("access_token");
        if (token && token.trim()) {
            notify(token.trim());
        }
    }
    catch {
        // ignore
    }
}
window.addEventListener("storage", (ev) => {
    if (ev.key === "access_token" && typeof ev.newValue === "string" && ev.newValue.trim()) {
        notify(ev.newValue.trim());
    }
});
// Also check immediately in case token already exists on load.
checkNow();
