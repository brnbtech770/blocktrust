/**
 * BLOCKTRUST™ — Phase 3 : BIS composeur Gmail (auto + sélectif + off)
 * Module séparé de gmail.js (Phase 1+2 inchangées).
 */
(function initBlockTrustGmailCompose(global) {
  const BIS_MODES = Object.freeze({
    AUTO: "auto",
    SELECTIVE: "selective",
    OFF: "off",
  });

  const DEFAULT_BIS_MODE = BIS_MODES.SELECTIVE;
  const AUTO_SIGN_TIMEOUT_MS = 3000;
  const BIS_BLOCK_MARKER = "data-blocktrust-bis-block";
  const AUTO_BYPASS_ATTR = "data-bt-auto-bypass";

  /** @type {{ apiBase: string, getApiKey: () => Promise<string|null>, escapeHtml: (v: unknown) => string } | null} */
  let deps = null;

  /** @type {string} */
  let currentMode = DEFAULT_BIS_MODE;

  /** @type {number | null} */
  let composeDebounceId = null;

  /** @type {Set<Element>} */
  const rootsWithButton = new Set();

  /** @type {Map<Element, { signed: boolean, signing: boolean }>} */
  const composeState = new Map();

  let autoSendHookInstalled = false;
  let composeObserver = null;
  let autoBadgeEl = null;

  const COMPOSE_SEND_SELECTORS = [
    'div[role="button"][aria-label*="Envoyer"]',
    'div[role="button"][aria-label*="Send"]',
    ".T-I.T-I-KE",
  ];

  const COMPOSE_BODY_SELECTORS = [
    'div[role="textbox"][aria-label*="Corps"]',
    'div[role="textbox"][aria-label*="Body"]',
    'div[role="textbox"][aria-label*="Message"]',
    'div[aria-label="Corps du message"]',
    'div[aria-label="Message Body"]',
    'div[g_editable="true"][role="textbox"]',
    ".Am.Al.editable",
    '.editable[contenteditable="true"]',
  ];

  const COMPOSE_TOOLBAR_SELECTORS = ["div.btC", "div.gU.aY", ".aY.at"];

  const TO_RECIPIENT_SELECTORS = [
    'input[aria-label*="À"]',
    'input[aria-label*="To"]',
    'input[name="to"]',
    'textarea[name="to"]',
    'span[email]',
    '[data-hovercard-id*="@"]',
  ];

  const SUBJECT_SELECTORS = ['input[name="subjectbox"]', 'input[name="subject"]'];

  const SHIELD_SVG =
    '<svg class="bt-bis-btn-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>';

  /**
   * @returns {boolean}
   */
  function isGmailMobile() {
    if (/\/m\//.test(global.location.pathname)) return true;
    const ua = navigator.userAgent || "";
    if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua) && global.innerWidth < 900) {
      return true;
    }
    return false;
  }

  /**
   * @returns {Promise<string>}
   */
  function getBisMode() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["bisMode"], (result) => {
        const mode = result.bisMode;
        if (
          mode === BIS_MODES.AUTO ||
          mode === BIS_MODES.SELECTIVE ||
          mode === BIS_MODES.OFF
        ) {
          resolve(mode);
        } else {
          resolve(DEFAULT_BIS_MODE);
        }
      });
    });
  }

  /**
   * @param {string} text
   * @returns {Promise<string>}
   */
  async function sha256Text(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * @param {unknown} value
   * @returns {string}
   */
  function esc(value) {
    return deps ? deps.escapeHtml(value) : String(value ?? "");
  }

  /**
   * @param {string} message
   * @param {"info"|"error"|"success"} [kind]
   * @param {number} [durationMs]
   */
  function showToast(message, kind = "info", durationMs = 2000) {
    const existing = document.getElementById("bt-compose-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "bt-compose-toast";
    toast.className = `bt-compose-toast bt-compose-toast-${kind}`;
    toast.setAttribute("role", "status");
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("bt-compose-toast-visible");
    });

    window.setTimeout(() => {
      toast.classList.remove("bt-compose-toast-visible");
      window.setTimeout(() => toast.remove(), 200);
    }, durationMs);
  }

  /**
   * @param {Record<string, unknown>} entry
   */
  function logAutoSignFailure(entry) {
    chrome.storage.local.get(["bisAutoFailLog"], (result) => {
      const prev = Array.isArray(result.bisAutoFailLog) ? result.bisAutoFailLog : [];
      const next = [{ at: new Date().toISOString(), ...entry }, ...prev].slice(0, 20);
      chrome.storage.local.set({ bisAutoFailLog: next });
    });
  }

  /**
   * @param {Element} start
   * @returns {Element | null}
   */
  function findComposeRoot(start) {
    let node = start;
    for (let i = 0; i < 16 && node; i++) {
      if (!(node instanceof Element)) break;
      const hasBody = COMPOSE_BODY_SELECTORS.some((sel) => node.querySelector(sel));
      const hasSend = COMPOSE_SEND_SELECTORS.some((sel) => node.querySelector(sel));
      if (hasBody && hasSend) return node;
      node = node.parentElement;
    }
    return null;
  }

  /**
   * @param {Element | EventTarget | null} target
   * @returns {HTMLElement | null}
   */
  function findSendButton(target) {
    if (!(target instanceof Element)) return null;
    for (const selector of COMPOSE_SEND_SELECTORS) {
      const btn = target.closest(selector);
      if (btn instanceof HTMLElement) return btn;
    }
    return null;
  }

  /**
   * @returns {Element[]}
   */
  function findComposeRoots() {
    /** @type {Set<Element>} */
    const roots = new Set();

    for (const selector of COMPOSE_SEND_SELECTORS) {
      document.querySelectorAll(selector).forEach((sendBtn) => {
        const root = findComposeRoot(sendBtn);
        if (root) roots.add(root);
      });
    }

    document.querySelectorAll('div[role="dialog"]').forEach((dialog) => {
      const root = findComposeRoot(dialog);
      if (root) roots.add(root);
    });

    document.querySelectorAll("div.nH").forEach((inlineHost) => {
      const root = findComposeRoot(inlineHost);
      if (root) roots.add(root);
    });

    return Array.from(roots);
  }

  /**
   * @param {Element} root
   * @returns {HTMLElement | null}
   */
  function findComposeBody(root) {
    for (const selector of COMPOSE_BODY_SELECTORS) {
      const el = root.querySelector(selector);
      if (el instanceof HTMLElement) return el;
    }
    return null;
  }

  /**
   * @param {Element} root
   * @returns {HTMLElement | null}
   */
  function findComposeToolbar(root) {
    for (const selector of COMPOSE_TOOLBAR_SELECTORS) {
      const el = root.querySelector(selector);
      if (el instanceof HTMLElement) return el;
    }
    const sendBtn = root.querySelector(COMPOSE_SEND_SELECTORS.join(","));
    return sendBtn?.closest("div") instanceof HTMLElement
      ? sendBtn.closest("div")
      : null;
  }

  /**
   * @param {string} raw
   * @returns {string | null}
   */
  function normalizeEmail(raw) {
    if (!raw || typeof raw !== "string") return null;
    const trimmed = raw.trim();
    const match = trimmed.match(/([^\s<>]+@[^\s<>]+)/);
    return match ? match[1].toLowerCase() : null;
  }

  /**
   * @param {Element} root
   * @returns {string | null}
   */
  function extractRecipientEmail(root) {
    for (const selector of TO_RECIPIENT_SELECTORS) {
      const nodes = root.querySelectorAll(selector);
      for (const node of nodes) {
        if (!(node instanceof HTMLElement)) continue;
        const fromAttr =
          node.getAttribute("email") ||
          node.getAttribute("data-hovercard-id") ||
          node.getAttribute("data-email");
        const email = normalizeEmail(fromAttr || node.value || node.textContent || "");
        if (email) return email;
      }
    }

    const ariaTo = root.querySelector('[aria-label="À"], [aria-label="To"]');
    if (ariaTo) {
      const chip = ariaTo.querySelector("span[email], [email]");
      if (chip) {
        const email = normalizeEmail(
          chip.getAttribute("email") || chip.textContent || "",
        );
        if (email) return email;
      }
    }

    return null;
  }

  /**
   * @param {Element} root
   * @returns {string}
   */
  function extractSubject(root) {
    for (const selector of SUBJECT_SELECTORS) {
      const input = root.querySelector(selector);
      if (input instanceof HTMLInputElement && input.value.trim()) {
        return input.value.trim();
      }
    }
    return "";
  }

  /**
   * @param {HTMLElement} bodyEl
   * @returns {string}
   */
  function extractBodyText(bodyEl) {
    const clone = bodyEl.cloneNode(true);
    if (clone instanceof HTMLElement) {
      clone.querySelectorAll(`[${BIS_BLOCK_MARKER}]`).forEach((el) => el.remove());
    }
    const text = clone instanceof HTMLElement ? clone.innerText || "" : bodyEl.innerText || "";
    return text.replace(/\u00a0/g, " ").trim();
  }

  /**
   * @param {Element} root
   * @returns {{ recipientEmail: string | null, subject: string, bodyText: string, bodyEl: HTMLElement | null }}
   */
  function extractComposeData(root) {
    const bodyEl = findComposeBody(root);
    return {
      recipientEmail: extractRecipientEmail(root),
      subject: extractSubject(root),
      bodyText: bodyEl ? extractBodyText(bodyEl) : "",
      bodyEl,
    };
  }

  /**
   * @param {Element} root
   * @returns {boolean}
   */
  function hasAttachments(root) {
    return Boolean(
      root.querySelector('[aria-label*="Pièce jointe"]') ||
        root.querySelector('[aria-label*="Attachment"]') ||
        root.querySelector(".aZo") ||
        root.querySelector('[data-tooltip*="Pièce jointe"]') ||
        root.querySelector('[data-tooltip*="Attachment"]'),
    );
  }

  /**
   * @param {HTMLElement} bodyEl
   * @returns {boolean}
   */
  function hasBisBlock(bodyEl) {
    return Boolean(bodyEl.querySelector(`[${BIS_BLOCK_MARKER}]`));
  }

  /**
   * @param {string} bisId
   * @param {string} verifyUrl
   * @returns {string}
   */
  function buildBisBlockHtml(bisId, verifyUrl) {
    const safeUrl = esc(verifyUrl);
    const safeId = esc(bisId);
    return (
      `<div ${BIS_BLOCK_MARKER}="1" contenteditable="false" ` +
      `style="margin:16px 0;padding:10px 14px;border-left:3px solid #00d4ff;` +
      `background:#f0fbff;border-radius:4px;font-family:Arial,sans-serif;font-size:13px;">` +
      `<div style="font-weight:600;color:#0a1628;margin-bottom:4px;">` +
      `✅ Cet email est signé BLOCKTRUST™ (Niveau 3)` +
      `</div>` +
      `<div style="color:#555;">` +
      `Signature cryptographique infalsifiable · ` +
      `<a href="${safeUrl}" style="color:#00a3cc;text-decoration:underline;" ` +
      `target="_blank" rel="noopener noreferrer">Vérifier cette signature</a>` +
      `</div>` +
      `<!-- bis:${safeId} -->` +
      `</div>`
    );
  }

  /**
   * @param {HTMLElement} bodyEl
   * @param {string} bisId
   * @param {string} verifyUrl
   */
  function insertBisBlock(bodyEl, bisId, verifyUrl) {
    if (hasBisBlock(bodyEl)) return;

    const html = buildBisBlockHtml(bisId, verifyUrl);
    bodyEl.focus();

    try {
      const inserted = document.execCommand("insertHTML", false, html);
      if (!inserted) throw new Error("execCommand failed");
    } catch {
      bodyEl.insertAdjacentHTML("beforeend", html);
    }
  }

  /**
   * @param {Element} root
   * @param {{ silent?: boolean, timeoutMs?: number }} [options]
   * @returns {Promise<{ ok: true, bisId: string } | { ok: false, reason: string }>}
   */
  async function signCompose(root, options = {}) {
    if (!deps) return { ok: false, reason: "not_initialized" };

    const bodyEl = findComposeBody(root);
    if (!bodyEl) return { ok: false, reason: "no_body" };
    if (hasBisBlock(bodyEl)) return { ok: true, bisId: "existing" };

    const apiKey = await deps.getApiKey();
    if (!apiKey) return { ok: false, reason: "no_api_key" };

    const { recipientEmail, subject, bodyText } = extractComposeData(root);
    if (!recipientEmail) return { ok: false, reason: "no_recipient" };
    if (!bodyText) return { ok: false, reason: "empty_body" };

    if (!options.silent && hasAttachments(root)) {
      showToast(
        "Les pièces jointes ne sont pas incluses dans la signature BIS. Seul le corps de l'email est signé.",
        "info",
        3500,
      );
    }

    const contentHash = await sha256Text(bodyText);

    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? 8000;
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${deps.apiBase}/api/bis/sign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          recipientEmail,
          interactionType: "EMAIL",
          contentHash,
          contextLabel: subject || undefined,
          context: subject || undefined,
          notifyRecipient: true,
        }),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) return { ok: false, reason: "unauthorized" };
      if (response.status === 403) return { ok: false, reason: "forbidden" };
      if (!response.ok) {
        return {
          ok: false,
          reason: data.error ? String(data.error) : "api_error",
        };
      }

      const bisId = data.signatureId || data.bisId;
      const verifyUrl =
        data.verifyUrl ||
        (bisId ? `${deps.apiBase}/verify/bis/${bisId}` : null);

      if (!bisId || !verifyUrl) return { ok: false, reason: "incomplete_response" };

      insertBisBlock(bodyEl, bisId, verifyUrl);
      return { ok: true, bisId };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return { ok: false, reason: "timeout" };
      }
      return { ok: false, reason: "network" };
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  /**
   * @param {HTMLElement} button
   * @param {"ready"|"signing"|"signed"|"disabled"} state
   */
  function setButtonState(button, state) {
    button.classList.remove(
      "bt-bis-btn--ready",
      "bt-bis-btn--signed",
      "bt-bis-btn--disabled",
      "bt-bis-btn--signing",
    );
    button.setAttribute("aria-disabled", state === "signed" ? "true" : "false");

    if (state === "ready") {
      button.classList.add("bt-bis-btn--ready");
      button.innerHTML = `${SHIELD_SVG}<span class="bt-bis-btn-label">✓ BIS</span>`;
      button.title = "Signer avec BLOCKTRUST BIS";
    } else if (state === "signed") {
      button.classList.add("bt-bis-btn--signed");
      button.innerHTML = `${SHIELD_SVG}<span class="bt-bis-btn-label">✓ Signé</span>`;
      button.title = "Email signé avec BIS";
    } else if (state === "signing") {
      button.classList.add("bt-bis-btn--signing");
      button.innerHTML = `<span class="bt-bis-btn-label">…</span>`;
      button.title = "Signature en cours…";
    } else {
      button.classList.add("bt-bis-btn--disabled");
      button.innerHTML = `${SHIELD_SVG}<span class="bt-bis-btn-label">✓ BIS</span>`;
      button.title = "Configurez votre clé API dans les options de l'extension";
    }
  }

  /**
   * @param {Element} root
   * @param {HTMLElement} button
   */
  async function handleSelectiveSignClick(root, button) {
    const state = composeState.get(root);
    if (state?.signed || state?.signing) return;

    composeState.set(root, { signed: false, signing: true });
    setButtonState(button, "signing");

    const result = await signCompose(root);

    if (result.ok) {
      composeState.set(root, { signed: true, signing: false });
      setButtonState(button, "signed");
      showToast("Email signé — le destinataire sera notifié", "success", 2000);
      return;
    }

    composeState.set(root, { signed: false, signing: false });

    if (result.reason === "no_api_key" || result.reason === "unauthorized") {
      showToast(
        "Configurez votre clé API dans les options de l'extension.",
        "error",
      );
      setButtonState(button, "disabled");
      return;
    }
    if (result.reason === "no_recipient") {
      showToast("Ajoutez un destinataire avant de signer.", "error");
      setButtonState(button, "ready");
      return;
    }
    if (result.reason === "empty_body") {
      showToast("Écrivez votre message avant de signer.", "error");
      setButtonState(button, "ready");
      return;
    }
    if (result.reason === "forbidden") {
      showToast(
        "La signature BIS nécessite un plan Premium ou supérieur.",
        "error",
      );
      setButtonState(button, "ready");
      return;
    }

    showToast("Impossible de signer — vérifiez votre connexion.", "error");
    setButtonState(button, "ready");
  }

  function removeAllComposeButtons() {
    rootsWithButton.forEach((root) => {
      const btn = root.querySelector(".bt-bis-btn");
      if (btn) btn.remove();
    });
    rootsWithButton.clear();
    composeState.clear();
  }

  /**
   * @param {Element} root
   */
  async function injectSelectiveButton(root) {
    if (!deps || currentMode !== BIS_MODES.SELECTIVE) return;
    if (rootsWithButton.has(root)) return;

    const toolbar = findComposeToolbar(root);
    if (!toolbar || toolbar.querySelector(".bt-bis-btn")) {
      rootsWithButton.add(root);
      return;
    }

    const button = document.createElement("div");
    button.className = "bt-bis-btn";
    button.setAttribute("role", "button");
    button.setAttribute("tabindex", "0");
    button.setAttribute("aria-label", "Signer avec BLOCKTRUST BIS");

    const apiKey = await deps.getApiKey();
    setButtonState(button, apiKey ? "ready" : "disabled");

    const onActivate = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (button.classList.contains("bt-bis-btn--signed")) return;
      void handleSelectiveSignClick(root, button);
    };

    button.addEventListener("click", onActivate);
    button.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") onActivate(e);
    });

    toolbar.appendChild(button);
    rootsWithButton.add(root);
    composeState.set(root, { signed: false, signing: false });

    const bodyEl = findComposeBody(root);
    if (bodyEl && hasBisBlock(bodyEl)) {
      composeState.set(root, { signed: true, signing: false });
      setButtonState(button, "signed");
    }
  }

  function updateAutoBadge() {
    if (currentMode !== BIS_MODES.AUTO) {
      autoBadgeEl?.remove();
      autoBadgeEl = null;
      return;
    }

    if (!autoBadgeEl) {
      autoBadgeEl = document.createElement("div");
      autoBadgeEl.id = "bt-bis-auto-badge";
      autoBadgeEl.className = "bt-bis-auto-badge";
      autoBadgeEl.setAttribute("role", "status");
      autoBadgeEl.textContent = "BIS AUTO ✓";
      document.body.appendChild(autoBadgeEl);
    }
  }

  /**
   * @param {MouseEvent} event
   */
  async function handleAutoSendClick(event) {
    if (currentMode !== BIS_MODES.AUTO || !deps) return;

    const sendBtn = findSendButton(event.target);
    if (!sendBtn) return;

    const root = findComposeRoot(sendBtn);
    if (!root) return;

    if (root.getAttribute(AUTO_BYPASS_ATTR) === "1") {
      root.removeAttribute(AUTO_BYPASS_ATTR);
      return;
    }

    const bodyEl = findComposeBody(root);
    if (bodyEl && hasBisBlock(bodyEl)) return;

    const data = extractComposeData(root);
    if (!data.recipientEmail || !data.bodyText) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const result = await signCompose(root, {
      silent: true,
      timeoutMs: AUTO_SIGN_TIMEOUT_MS,
    });

    if (!result.ok) {
      logAutoSignFailure({ reason: result.reason });
      showToast("Signature BIS échouée", "error", 2500);
    }

    root.setAttribute(AUTO_BYPASS_ATTR, "1");
    window.setTimeout(() => {
      sendBtn.click();
    }, 0);
  }

  function installAutoSendHook() {
    if (autoSendHookInstalled) return;
    document.addEventListener("click", handleAutoSendClick, true);
    autoSendHookInstalled = true;
  }

  function uninstallAutoSendHook() {
    if (!autoSendHookInstalled) return;
    document.removeEventListener("click", handleAutoSendClick, true);
    autoSendHookInstalled = false;
  }

  function scanComposeWindows() {
    if (!deps || isGmailMobile()) return;

    if (currentMode === BIS_MODES.OFF) {
      removeAllComposeButtons();
      autoBadgeEl?.remove();
      autoBadgeEl = null;
      return;
    }

    if (currentMode === BIS_MODES.SELECTIVE) {
      findComposeRoots().forEach((root) => {
        void injectSelectiveButton(root);
      });
    } else {
      removeAllComposeButtons();
    }

    if (currentMode === BIS_MODES.AUTO) {
      installAutoSendHook();
      updateAutoBadge();
    } else {
      uninstallAutoSendHook();
      autoBadgeEl?.remove();
      autoBadgeEl = null;
    }
  }

  function scheduleComposeScan() {
    if (composeDebounceId !== null) window.clearTimeout(composeDebounceId);
    composeDebounceId = window.setTimeout(() => {
      composeDebounceId = null;
      scanComposeWindows();
    }, 350);
  }

  /**
   * @param {string} mode
   */
  function applyMode(mode) {
    currentMode = mode;
    scanComposeWindows();
  }

  /**
   * @param {{ apiBase: string, getApiKey: () => Promise<string|null>, escapeHtml: (v: unknown) => string }} options
   */
  async function init(options) {
    if (global.location.hostname !== "mail.google.com") return;
    if (isGmailMobile()) {
      console.log("[BLOCKTRUST] Compose BIS désactivé sur Gmail mobile");
      return;
    }

    deps = options;
    currentMode = await getBisMode();

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || !changes.bisMode) return;
      const next = changes.bisMode.newValue;
      if (
        next === BIS_MODES.AUTO ||
        next === BIS_MODES.SELECTIVE ||
        next === BIS_MODES.OFF
      ) {
        applyMode(next);
      }
    });

    console.log("[BLOCKTRUST] Compose BIS Phase 3 — mode:", currentMode);

    if (composeObserver) composeObserver.disconnect();
    composeObserver = new MutationObserver(() => {
      scheduleComposeScan();
    });
    composeObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    scheduleComposeScan();
  }

  global.BlockTrustGmailCompose = {
    init,
    BIS_MODES,
    DEFAULT_BIS_MODE,
  };
})(window);
