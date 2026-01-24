// background.js (MV3 service worker)

const CATCHUP_URLS = {
  birthday: "https://www.linkedin.com/mynetwork/catch-up/birthday/",
  work_anniversaries: "https://www.linkedin.com/mynetwork/catch-up/work_anniversaries/",
  job_changes: "https://www.linkedin.com/mynetwork/catch-up/job_changes/"
};

function waitForTabComplete(tabId, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("Timed out waiting for page load."));
    }, timeoutMs);

    function listener(updatedTabId, info) {
      if (updatedTabId === tabId && info.status === "complete") {
        clearTimeout(t);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(true);
      }
    }

    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function ensureContentScript(tabId) {
  // Inject (or re-inject) contentScript.js into the active tab
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["contentScript.js"]
  });
}

async function sendToTab(tabId, payload) {
  return chrome.tabs.sendMessage(tabId, payload);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg?.type !== "OPEN_AND_PREPARE") {
        sendResponse({ ok: false, error: "Unknown message type." });
        return;
      }

      const category = msg.category;
      const url = CATCHUP_URLS[category];
      if (!url) throw new Error("Invalid category.");

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error("No active tab found.");

      // Navigate to the correct Catch-up page
      await chrome.tabs.update(tab.id, { url });

      // Wait for page load
      await waitForTabComplete(tab.id);

      // Inject content script (since we removed static content_scripts)
      await ensureContentScript(tab.id);

      // Ping to verify script is alive
      const ping = await sendToTab(tab.id, { type: "PING" });
      if (!ping?.ok) throw new Error("Content script did not start on Catch-up page.");

      // Run the prepare
      const res = await sendToTab(tab.id, { type: "PREPARE", category });

      sendResponse({ ok: true, res });
    } catch (e) {
      sendResponse({ ok: false, error: String(e?.message || e) });
    }
  })();

  return true;
});
