const DEFAULTS = {
  maxPerRun: 20,
  waitMs: 1500,
  birthdayMessage: "Wishing you a very happy birthday! 🎉",
  workAnnivTemplate: "Congrats on your {years} year work anniversary! 🎉",
  jobChangeMessage: "Congrats on the new role! 🎉 Wishing you lots of success."
};

const els = {
  maxPerRun: document.getElementById("maxPerRun"),
  waitMs: document.getElementById("waitMs"),
  birthdayMessage: document.getElementById("birthdayMessage"),
  workAnnivTemplate: document.getElementById("workAnnivTemplate"),
  jobChangeMessage: document.getElementById("jobChangeMessage"),
  save: document.getElementById("save"),
  reset: document.getElementById("reset"),
  saved: document.getElementById("saved")
};

function showSaved(text) {
  els.saved.textContent = text;
  setTimeout(() => (els.saved.textContent = ""), 1800);
}

async function load() {
  const stored = await chrome.storage.sync.get(Object.keys(DEFAULTS));
  const cfg = { ...DEFAULTS, ...stored };

  els.maxPerRun.value = cfg.maxPerRun;
  els.waitMs.value = cfg.waitMs;
  els.birthdayMessage.value = cfg.birthdayMessage;
  els.workAnnivTemplate.value = cfg.workAnnivTemplate;
  els.jobChangeMessage.value = cfg.jobChangeMessage;
}

async function save() {
  const cfg = {
    maxPerRun: Number(els.maxPerRun.value || DEFAULTS.maxPerRun),
    waitMs: Number(els.waitMs.value || DEFAULTS.waitMs),
    birthdayMessage: String(els.birthdayMessage.value || DEFAULTS.birthdayMessage),
    workAnnivTemplate: String(els.workAnnivTemplate.value || DEFAULTS.workAnnivTemplate),
    jobChangeMessage: String(els.jobChangeMessage.value || DEFAULTS.jobChangeMessage)
  };

  await chrome.storage.sync.set(cfg);
  showSaved("Saved ✅");
}

async function reset() {
  await chrome.storage.sync.set(DEFAULTS);
  await load();
  showSaved("Reset to defaults ✅");
}

els.save.addEventListener("click", save);
els.reset.addEventListener("click", reset);

load();
