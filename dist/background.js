"use strict";
// Module-level variables to maintain state
let delayTime = 10000;
let enabled = false;
let intervalId;
// Update the badge text based on enabled status
function updateBadge(enabled) {
    const badgeText = enabled ? "ON" : "OFF";
    chrome.action.setBadgeText({
        text: badgeText,
    });
}
// Switch to the next tab
function switchTab() {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
        if (tabs.length > 1) {
            const currentTab = tabs.find((tab) => tab.active);
            if (currentTab && currentTab.index !== undefined) {
                const currentTabIndex = currentTab.index;
                const nextTabIndex = (currentTabIndex + 1) % tabs.length;
                const nextTab = tabs[nextTabIndex];
                if (nextTab.id) {
                    chrome.tabs.update(nextTab.id, { active: true });
                }
            }
        }
    });
}
// Start or stop the tab switcher based on enabled state
function toggleTabSwitcher() {
    if (intervalId !== undefined) {
        clearInterval(intervalId);
        intervalId = undefined;
    }
    if (enabled) {
        intervalId = setInterval(switchTab, delayTime);
    }
}
// Initialize the extension with values from storage
chrome.storage.local.get(['delayTime', 'enabled'], (result) => {
    console.log(result);
    delayTime = result.delayTime || 10000;
    enabled = (result.enabled === undefined) ? false : result.enabled;
    updateBadge(enabled);
    toggleTabSwitcher();
});
// Listen for changes to the enabled toggle
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && 'enabled' in changes) {
        enabled = changes.enabled.newValue;
        updateBadge(enabled);
        toggleTabSwitcher();
    }
});
// Listen for changes to the delay time
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && 'delayTime' in changes) {
        delayTime = changes.delayTime.newValue;
        toggleTabSwitcher();
    }
});
// Set default values when extension is installed
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
        'enabled': false,
        'delayTime': 10000
    });
    updateBadge(false);
});
// Handle new window creation
chrome.windows.onCreated.addListener(() => {
    try {
        toggleTabSwitcher();
    }
    catch (error) {
        console.error('Error in window creation handler:', error);
    }
});
