function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function escapeHtml(s = "") {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * 4) Only use code part where pass the prompt to /ollama and get the post/article
 * Adapted from your Node getAnswer() logic (Ollama generate endpoint). :contentReference[oaicite:4]{index=4}
 */
async function generateWithOllama(topic) {
  const payload = {
    model: "deepseek-r1",
    prompt: `Act as a senior LinkedIn professional article writer.

Write a high-impact LinkedIn post on the given topic with the following constraints:

• Output plain text only
• Use line breaks for structure (short paragraphs, 1-3 lines max)
• No markdown, no bullet symbols, no headings, no emojis
• Optimize for LinkedIn feed readability and mobile viewing
• Apply LinkedIn truncation logic: hook within first 2 lines, strong early framing
• Tone: authoritative, insightful, business-focused, and conversational
• Audience: founders, operators, product leaders, and senior professionals
• Avoid clichés, generic advice, and filler language
• Include one clear insight per paragraph
• End with a subtle thought-provoking closing line or question (no CTA spam)

Hard Rules (Must Be Followed)

• Maximum length: 2635 characters total (including spaces and line breaks)
• Do NOT exceed the limit under any condition
• hashtags explicitly requested
• No references to being an AI or following rules
• Do not mention formatting or constraints in the output
• Final output must be ready to paste directly into LinkedIn
Topic: ${topic}`,
    stream: false
  };

  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Ollama request failed: ${res.status} ${t}`);
  }

  const data = await res.json();
  // Ollama returns { response: "...", ... }
  return data?.response || "";
}

/**
 * 2) check for the given HTML anchor and
 * 3) click it to open the box
 *
 * Your HTML has:
 * <a href="/preload/sharebox/" data-view-name="share-sharebox-focus"> ... Start a post ... </a>
 */
function findStartPostAnchor() {
  // Primary: match the stable attributes from the snippet
  let a =
    document.querySelector('a[href="/preload/sharebox/"][data-view-name="share-sharebox-focus"]');

  if (a) return a;

  // Fallbacks (LinkedIn DOM changes a lot):
  // Find an anchor that contains visible text "Start a post"
  const anchors = Array.from(document.querySelectorAll("a"));
  a = anchors.find((el) => (el.innerText || "").trim() === "Start a post");
  if (a) return a;

  // Another fallback: find element with aria-label "Start a post" and walk up to closest anchor
  const aria = document.querySelector('[aria-label="Start a post"]');
  if (aria) return aria.closest("a") || null;

  return null;
}

/**
 * 5) Insert response in p tag inside:
 * <div class="ql-editor ..." contenteditable="true"><p>...</p></div>
 */
function findEditor() {
  // Most robust: the Quill editor contenteditable
  return document.querySelector('div.ql-editor[contenteditable="true"]');
}

function setEditorText(editor, text) {
  // LinkedIn expects paragraphs. Convert blank lines into new <p> blocks.
  const safe = escapeHtml(text);

  const paragraphs = safe
    .split(/\n{2,}/g) // double-newline = new paragraph
    .map((p) => p.replace(/\n/g, "<br>")) // single newline = line break
    .map((p) => `<p>${p || "<br>"}</p>`)
    .join("");

  editor.innerHTML = paragraphs || "<p><br></p>";

  // Trigger input events so LinkedIn notices the change
  editor.dispatchEvent(new InputEvent("input", { bubbles: true }));
  editor.dispatchEvent(new Event("change", { bubbles: true }));
  editor.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
}

async function openComposerIfNeeded() {
  // If editor exists, composer is already open.
  if (findEditor()) return;

  const anchor = findStartPostAnchor();
  if (!anchor) {
    throw new Error(
      'Could not find "Start a post" anchor. LinkedIn may have changed the UI.'
    );
  }

  anchor.click();

  // Wait for editor to appear
  for (let i = 0; i < 30; i++) {
    await sleep(250);
    if (findEditor()) return;
  }

  throw new Error("Clicked start post but editor did not appear (timeout).");
}

// Message handler from popup
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "GENERATE_AND_INSERT") return;

  (async () => {
    // 1) Check current tab is linkedin.com is done in popup,
    // but we can double-check here too.
    if (!location.hostname.endsWith("linkedin.com")) {
      throw new Error("Not on linkedin.com");
    }

    // 2 + 3) Open composer by clicking anchor
    await openComposerIfNeeded();

    // 4) Get generated post from Ollama
    const generated = await generateWithOllama(msg.topic);

    if (!generated.trim()) {
      throw new Error("Ollama returned empty response.");
    }

    // 5) Insert into editor
    const editor = findEditor();
    if (!editor) throw new Error("Editor not found after opening composer.");

    setEditorText(editor, generated);
  })()
    .then(() => sendResponse({ ok: true }))
    .catch((e) => sendResponse({ ok: false, error: String(e?.message || e) }));

  return true; // keep channel open for async
});
