// Get the delay time from local storage
chrome.storage.local.get(['delayTime', 'enabled'], function(result) {

  console.log(result);
  
  var delayTime = result.delayTime || 10000;
  var enabled = (result.enabled === undefined) ? true : result.enabled;
  var intervalId;

  // Define a function to switch tabs
  function switchTab() {
    chrome.tabs.query({ currentWindow: true }, function(tabs) {
      if(tabs.length > 1)
      { 
        var currentTab = tabs.find(function(tab) { return tab.active; });
        var currentTabIndex = currentTab.index;
        var nextTabIndex = (currentTabIndex + 1) % tabs.length;
        chrome.tabs.update(tabs[nextTabIndex].id, { active: true });
      }
    });
  }

  // Define a function to start or stop the tab switcher
  function toggleTabSwitcher() {
    if (enabled) {
      clearInterval(intervalId);
      intervalId = setInterval(switchTab, delayTime);
    } else {
      clearInterval(intervalId);
    }
  }

  // Call the function to start the tab switcher
  toggleTabSwitcher();

  // Listen for changes to the toggle switch
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'local' && 'enabled' in changes) {
      enabled = changes.enabled.newValue;
      updateBadge(enabled);
      toggleTabSwitcher();
    }
  });

  // Listen for changes to the delay time
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'local' && 'delayTime' in changes) {
      delayTime = changes.delayTime.newValue;
      toggleTabSwitcher();
    }
  });
});

chrome.runtime.onInstalled.addListener(function(details) {
  chrome.storage.local.set({ 'enabled': false, 'delayTime': 10000, 'reload': false });
  updateBadge(false);
});

function updateBadge(enabled)
{
  let badgeText = enabled ? "ON" : "OFF";
  chrome.action.setBadgeText({
    text: badgeText,
  });
}

chrome.windows.onCreated.addListener(function(window){
  try{
    toggleTabSwitcher();
  }
  catch{};
  
  }
);
