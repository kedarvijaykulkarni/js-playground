// contentScript.js
// Runs on https://www.linkedin.com/mynetwork/catch-up/*
// Finds "nurture-card" items, opens message overlay, fills message, but DOES NOT SEND.

const DEFAULTS = {
  maxPerRun: 20,
  waitMs: 1500,
  birthdayMessage: "Wishing you a very happy birthday! 🎉",
  workAnnivTemplate: "Congrats on your {years} year work anniversary! 🎉",
  // For job changes, LinkedIn sometimes pre-fills message from the CTA URL.
  // We still provide a default draft to fill.
  jobChangeMessage: "Congrats on the new role! 🎉 Wishing you lots of success.",
};

const STATE = {
  running: false,
  sentOrPrepared: 0,
  lastError: null,
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isOnCatchUpPage() {
  return location.pathname.startsWith("/mynetwork/catch-up/");
}

function getCatchUpTypeFromUrl() {
  const p = location.pathname;
  if (p.includes("/birthday")) return "birthday";
  if (p.includes("/work_anniversaries")) return "work_anniversaries";
  if (p.includes("/job_changes")) return "job_changes";
  return "unknown";
}

function getAllCards() {
  return Array.from(
    document.querySelectorAll('div[data-view-name="nurture-card"]'),
  );
}

function cardText(card) {
  return (card?.innerText || "").trim();
}

function isBirthdayTodayCard(card) {
  // Mirrors your Playwright intent: card contains "today" indicator :contentReference[oaicite:4]{index=4}
  // LinkedIn UI varies; "today" may appear in a <strong> or other element.
  const text = cardText(card).toLowerCase();
  return (
    text.includes("today") &&
    (text.includes("birthday") || text.includes("wishes") || true)
  );
}

function extractWorkAnnivYears(card) {
  // Mirrors your regex: Completed (\d+) year :contentReference[oaicite:5]{index=5}
  const text = cardText(card);
  const m = text.match(/\bCompleted\s+(\d+)\s+year/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function isJobChangeCard(card) {
  // Mirrors patterns in your script :contentReference[oaicite:6]{index=6}
  const text = cardText(card);
  return (
    /\bStarted a new position\b/i.test(text) ||
    /\bStarted a new role\b/i.test(text) ||
    /\bStarting a new position\b/i.test(text)
  );
}

function findMessageCtaInCard(card) {
  // Mirrors: a[data-view-name="nurture-card-primary-button"] :contentReference[oaicite:7]{index=7}
  return (
    card.querySelector('a[data-view-name="nurture-card-primary-button"]') ||
    card.querySelector('button[data-view-name="nurture-card-primary-button"]')
  );
}

function scrollIntoViewCenter(el) {
  el?.scrollIntoView?.({
    behavior: "smooth",
    block: "center",
    inline: "nearest",
  });
}

function getMessageEditor() {
  // LinkedIn messaging editor is a contenteditable div; selectors can vary.
  // We'll try a few known selectors.
  const candidates = [
    'div.msg-form__contenteditable[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"][data-artdeco-is-focused="true"]',
  ];
  for (const sel of candidates) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function setEditorText(editorEl, text) {
  // Safest: focus then use execCommand insertText fallback.
  editorEl.focus();

  // Clear existing content
  // Approach: select all + delete via execCommand where supported
  try {
    document.execCommand("selectAll", false, null);
    document.execCommand("delete", false, null);
  } catch (_) {
    // fallback: set textContent
    editorEl.textContent = "";
  }

  // Insert new
  try {
    document.execCommand("insertText", false, text);
  } catch (_) {
    editorEl.textContent = text;
  }

  // Trigger input event
  editorEl.dispatchEvent(new InputEvent("input", { bubbles: true }));
}

function highlightSendButton() {
  // Try to locate send button in the open overlay
  const candidates = [
    "button.msg-form__send-button",
    'button[aria-label="Send now"]',
    'button[aria-label="Send"]',
  ];
  for (const sel of candidates) {
    const btn = document.querySelector(sel);
    if (btn) {
      btn.style.outline = "3px solid #ff9900";
      btn.style.outlineOffset = "2px";
      return true;
    }
  }
  return false;
}

function closeMessageOverlayIfOpen() {
  // We do NOT force-close aggressively, but provide a helper similar to your close logic :contentReference[oaicite:8]{index=8}
  const closeBtn = document
    .querySelector(
      'button.msg-overlay-bubble-header__control svg[data-test-icon="close-small"]',
    )
    ?.closest("button");

  if (closeBtn) {
    closeBtn.click();
    return true;
  }

  // fallback: Escape
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
  return false;
}

async function openMessageOverlay(card, waitMs) {
  const cta = findMessageCtaInCard(card);
  if (!cta) return false;

  scrollIntoViewCenter(cta);
  await sleep(300);

  cta.click();
  await sleep(waitMs);

  return true;
}

async function prepareOneCard(card, cfg, category) {
  await openMessageOverlay(card, cfg.waitMs);

  const editor = getMessageEditor();
  if (!editor) {
    throw new Error("Message editor not found (LinkedIn UI may have changed).");
  }

  let message = cfg.birthdayMessage;

  if (category === "work_anniversaries") {
    const years = extractWorkAnnivYears(card);
    if (years == null) return { skipped: true, reason: "No years found." };
    message = cfg.workAnnivTemplate.replace("{years}", String(years));
  } else if (category === "job_changes") {
    message = cfg.jobChangeMessage;
  } else if (category === "birthday") {
    message = cfg.birthdayMessage;
  }

  setEditorText(editor, message);

  // Highlight send button so user can click it
  highlightSendButton();

  return { skipped: false, prepared: true };
}

function filterCardsByCategory(cards, category) {
  if (category === "birthday") return cards.filter(isBirthdayTodayCard);
  if (category === "work_anniversaries")
    return cards.filter((c) => extractWorkAnnivYears(c) != null);
  if (category === "job_changes") return cards.filter(isJobChangeCard);
  return [];
}

async function loadConfig() {
  const stored = await chrome.storage.sync.get(Object.keys(DEFAULTS));
  return { ...DEFAULTS, ...stored };
}

async function runPrepare(category) {
  if (!isOnCatchUpPage()) throw new Error("Not on a LinkedIn Catch-up page.");

  const cfg = await loadConfig();
  const cards = getAllCards();
  const relevant = filterCardsByCategory(cards, category);

  const cap = Math.max(1, Number(cfg.maxPerRun || DEFAULTS.maxPerRun));
  STATE.running = true;
  STATE.sentOrPrepared = 0;
  STATE.lastError = null;

  for (let i = 0; i < relevant.length; i++) {
    if (!STATE.running) break;
    if (STATE.sentOrPrepared >= cap) break;

    const card = relevant[i];

    try {
      scrollIntoViewCenter(card);
      await sleep(350);

      const res = await prepareOneCard(card, cfg, category);
      if (res?.skipped) continue;

      STATE.sentOrPrepared += 1;

      // NOTE: we do NOT auto-send. User must click Send.
      // Give them time to review & click.
      await sleep(Math.max(700, cfg.waitMs));
    } catch (e) {
      STATE.lastError = String(e?.message || e);
      // If overlay got stuck, try to close and continue
      closeMessageOverlayIfOpen();
      await sleep(600);
    }
  }

  STATE.running = false;

  return {
    ok: true,
    category,
    found: relevant.length,
    prepared: STATE.sentOrPrepared,
    cap,
    lastError: STATE.lastError,
  };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (!msg?.type)
        return sendResponse({ ok: false, error: "Missing message type." });

      if (msg.type === "PING") {
        return sendResponse({
          ok: true,
          page: location.href,
          catchUpType: getCatchUpTypeFromUrl(),
          running: STATE.running,
        });
      }

      if (msg.type === "STOP") {
        STATE.running = false;
        return sendResponse({ ok: true, stopped: true });
      }

      if (msg.type === "PREPARE") {
        const category = msg.category || getCatchUpTypeFromUrl();
        const result = await runPrepare(category);
        return sendResponse(result);
      }

      if (msg.type === "CLOSE_OVERLAY") {
        const closed = closeMessageOverlayIfOpen();
        return sendResponse({ ok: true, closed });
      }

      sendResponse({ ok: false, error: "Unknown command." });
    } catch (e) {
      sendResponse({ ok: false, error: String(e?.message || e) });
    }
  })();

  return true;
});
