document.addEventListener("DOMContentLoaded", function () {
  const btnSave = document.getElementById("saveButton");
  const delayTimeInput = document.getElementById("delayTimeInput");
  const enabledCheckbox = document.getElementById("enabledCheckbox");

  chrome.storage.local.get(["delayTime", "enabled"], function (data) {
    delayTimeInput.value = (data.delayTime / 1000) || 10;
    enabledCheckbox.checked = data.enabled === undefined ? true : data.enabled;
  });

  btnSave.addEventListener("click", function (event) {
    event.preventDefault();
    const delayTime = parseInt(delayTimeInput.value, 10) * 1000;
    const enabled = enabledCheckbox.checked;
    chrome.storage.local.set({ delayTime, enabled });
    window.close();
  });

  enabledCheckbox.addEventListener("change", function (event) {
    const enabled = event.target.checked;
    chrome.storage.local.set({ enabled });
  });
});

chrome.storage.onChanged.addListener(function (changes) {
  if (changes.enabled) {
    const enabled = changes.enabled.newValue;
    const badgeText = enabled ? "ON" : "OFF";
    //chrome.browserAction.setBadgeText({ text: badgeText });
  }
});
