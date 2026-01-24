const statusEl = document.getElementById("status");
const logEl = document.getElementById("log");

function log(obj) {
  const s = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
  logEl.textContent = `${s}\n\n${logEl.textContent}`.trim();
}

async function openAndPrepare(category) {
  statusEl.textContent = `Opening & preparing: ${category}…`;

  const wrapper = await chrome.runtime.sendMessage({
    type: "OPEN_AND_PREPARE",
    category
  });

  log(wrapper);

  if (!wrapper?.ok) {
    statusEl.textContent = `Error: ${wrapper?.error || "unknown"}`;
    return;
  }

  const resp = wrapper.res;
  if (resp?.ok) {
    statusEl.textContent = `Done: prepared ${resp.prepared}/${resp.found} (cap ${resp.cap})`;
  } else {
    statusEl.textContent = `Error: ${resp?.error || "unknown"}`;
  }
}

document.getElementById("btnBirthdays").addEventListener("click", () => openAndPrepare("birthday"));
document.getElementById("btnWork").addEventListener("click", () => openAndPrepare("work_anniversaries"));
document.getElementById("btnJobs").addEventListener("click", () => openAndPrepare("job_changes"));

// These buttons only work once content script exists on the page.
// Optional: you can remove them or keep them.
document.getElementById("btnStop").addEventListener("click", () => {
  statusEl.textContent = "Tip: open a Catch-up page first, then Stop works.";
});

document.getElementById("btnClose").addEventListener("click", () => {
  statusEl.textContent = "Tip: open a Catch-up page first, then Close works.";
});
