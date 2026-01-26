const statusEl = document.getElementById("status");
const topicEl = document.getElementById("topic");
const generateBtn = document.getElementById("generate");

function setStatus(msg) {
  statusEl.textContent = msg;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

generateBtn.addEventListener("click", async () => {
  const topic = (topicEl.value || "").trim();
  if (!topic) {
    setStatus("Please enter a topic/prompt.");
    return;
  }

  const tab = await getActiveTab();
  if (!tab?.id || !tab?.url) {
    setStatus("No active tab found.");
    return;
  }

  // 1) Instead of login: only check current tab is linkedin.com
  const isLinkedIn = (() => {
    try {
      const u = new URL(tab.url);
      return u.hostname.endsWith("linkedin.com");
    } catch {
      return false;
    }
  })();

  if (!isLinkedIn) {
    setStatus("Open a LinkedIn tab first (linkedin.com).");
    return;
  }

  setStatus("Sending request to content script…");

  chrome.tabs.sendMessage(
    tab.id,
    { type: "GENERATE_AND_INSERT", topic },
    (resp) => {
      const err = chrome.runtime.lastError;
      if (err) {
        setStatus("Error: content script not reachable.\n" + err.message);
        return;
      }
      if (!resp?.ok) {
        setStatus("Failed:\n" + (resp?.error || "Unknown error"));
        return;
      }
      setStatus("Done ✅\nPost inserted into LinkedIn editor.");
    }
  );
});
