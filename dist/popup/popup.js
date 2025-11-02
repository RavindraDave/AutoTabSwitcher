"use strict";
document.addEventListener("DOMContentLoaded", () => {
    const btnSave = document.getElementById("saveButton");
    const delayTimeInput = document.getElementById("delayTimeInput");
    const enabledCheckbox = document.getElementById("enabledCheckbox");
    // Load saved settings
    chrome.storage.local.get(["delayTime", "enabled"], (data) => {
        delayTimeInput.value = String((data.delayTime / 1000) || 10);
        enabledCheckbox.checked = data.enabled === undefined ? false : data.enabled;
    });
    // Save button click handler
    btnSave.addEventListener("click", (event) => {
        event.preventDefault();
        const delayTime = parseInt(delayTimeInput.value, 10) * 1000;
        const enabled = enabledCheckbox.checked;
        chrome.storage.local.set({ delayTime, enabled }, () => {
            window.close();
        });
    });
    // Enabled checkbox change handler
    enabledCheckbox.addEventListener("change", (event) => {
        const target = event.target;
        const enabled = target.checked;
        chrome.storage.local.set({ enabled });
    });
});
// Listen for storage changes to update badge
chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) {
        const enabled = changes.enabled.newValue;
        const badgeText = enabled ? "ON" : "OFF";
        chrome.action.setBadgeText({ text: badgeText });
    }
});
