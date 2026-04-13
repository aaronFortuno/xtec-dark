const toggle = document.getElementById("toggle");
const status = document.getElementById("status");

chrome.storage.sync.get({ enabled: true }, (data) => {
  toggle.checked = data.enabled;
  status.textContent = data.enabled ? "Activat" : "Desactivat";
});

toggle.addEventListener("change", () => {
  const enabled = toggle.checked;
  chrome.storage.sync.set({ enabled });
  status.textContent = enabled ? "Activat" : "Desactivat";

  // Send message to active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "toggle", enabled });
    }
  });
});
