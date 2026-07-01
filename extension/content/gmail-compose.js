/**
 * BLOCKTRUST™ — Phase 3 : signature BIS depuis le composeur Gmail.
 * Module séparé de gmail.js (Phase 1+2 inchangées).
 */
(function initBlockTrustGmailCompose(global) {
  /** @type {WeakSet<Element>} */
  const processedComposers = new WeakSet();

  /** @type {Map<Element, { signed: boolean, signing: boolean }>} */
  const composeState = new Map();

  /** @type {{ apiBase: string, getApiKey: () => Promise<string|null>, escapeHtml: (v: unknown) => string } | null} */
  let deps = null;

  /** @type {number | null} */
  let composeDebounceId = null;

  const BIS_BLOCK_MARKER = "data-blocktrust-bis-block";

  const COMPOSE_SEND_SELECTORS = [
    'div[role="button"][aria-label*="Envoyer"]',
    'div[role="button"][aria-label*="Send"]',
    ".T-I.T-I-KE",
  ];

  const COMPOSE_BODY_SELECTORS = [
    'div[aria-label="Corps du message"]',
    'div[aria-label="Message Body"]',
    'div[g_editable="true"][role="textbox"]',
    ".Am.Al.editable",
    '.editable[contenteditable="true"]',
  ];

  const COMPOSE_TOOLBAR_SELECTORS = ["div.btC", "div.gU.aY", ".aY.at"];

  const TO_RECIPIENT_SELECTORS = [
    'input[name="to"]',
    'textarea[name="to"]',
    'span[email]',
    '[data-hovercard-id*="@"]',
  ];

  const SUBJECT_SELECTORS = ['input[name="subjectbox"]', 'input[name="subject"]'];

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
   */
  function showToast(message, kind = "info") {
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
    }, 4200);
  }

  /**
   * @param {Element} start
   * @returns {Element | null}
   */
  function findComposeRoot(start) {
    let node = start;
    for (let i = 0; i < 14 && node; i++) {
      if (!(node instanceof Element)) break;
      const hasBody = COMPOSE_BODY_SELECTORS.some((sel) => node.querySelector(sel));
      const hasSend = COMPOSE_SEND_SELECTORS.some((sel) => node.querySelector(sel));
      if (hasBody && hasSend) return node;
      node = node.parentElement;
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
      `style="border-left:3px solid #00d4ff;padding:8px 12px;margin:16px 0;` +
      `font-family:Arial,sans-serif;font-size:13px;background:#f8fffe;border-radius:4px;">` +
      `<div style="font-weight:bold;color:#0a1628;">` +
      `✅ Email signé BLOCKTRUST™ (Niveau 3)` +
      `</div>` +
      `<div style="color:#555;margin-top:4px;">` +
      `Signature cryptographique infalsifiable · ` +
      `<a href="${safeUrl}" style="color:#00a3cc;" target="_blank" rel="noopener noreferrer">` +
      `Vérifier cette signature</a>` +
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
   * @param {HTMLButtonElement} button
   * @param {"idle"|"ready"|"signing"|"signed"|"disabled"} state
   * @param {string} [label]
   */
  function setButtonState(button, state, label) {
    button.classList.remove(
      "bt-compose-btn-ready",
      "bt-compose-btn-signed",
      "bt-compose-btn-disabled",
      "bt-compose-btn-signing",
    );
    button.disabled = state === "signing" || state === "signed" || state === "disabled";

    if (state === "ready") {
      button.classList.add("bt-compose-btn-ready");
      button.textContent = label || "✓ BIS";
      button.title = "Signer avec BLOCKTRUST BIS";
    } else if (state === "signed") {
      button.classList.add("bt-compose-btn-signed");
      button.textContent = label || "✓ Signé";
      button.title = "Email signé avec BIS";
    } else if (state === "signing") {
      button.classList.add("bt-compose-btn-signing");
      button.textContent = "…";
      button.title = "Signature en cours…";
    } else {
      button.classList.add("bt-compose-btn-disabled");
      button.textContent = label || "✓ BIS";
      button.title = "Configurez votre clé API dans les options de l'extension";
    }
  }

  /**
   * @param {Element} root
   * @param {HTMLButtonElement} button
   */
  async function handleSignClick(root, button) {
    if (!deps) return;

    const state = composeState.get(root);
    if (state?.signed || state?.signing) return;

    composeState.set(root, { signed: false, signing: true });
    setButtonState(button, "signing");

    try {
      const apiKey = await deps.getApiKey();
      if (!apiKey) {
        showToast(
          "Configurez votre clé API dans les options de l'extension.",
          "error",
        );
        setButtonState(button, "disabled");
        composeState.set(root, { signed: false, signing: false });
        return;
      }

      const bodyEl = findComposeBody(root);
      if (!bodyEl) {
        showToast("Composeur introuvable — réessayez.", "error");
        setButtonState(button, "ready");
        composeState.set(root, { signed: false, signing: false });
        return;
      }

      const recipientEmail = extractRecipientEmail(root);
      if (!recipientEmail) {
        showToast("Ajoutez un destinataire avant de signer.", "error");
        setButtonState(button, "ready");
        composeState.set(root, { signed: false, signing: false });
        return;
      }

      const bodyText = extractBodyText(bodyEl);
      if (!bodyText) {
        showToast("Écrivez votre message avant de signer.", "error");
        setButtonState(button, "ready");
        composeState.set(root, { signed: false, signing: false });
        return;
      }

      if (hasAttachments(root)) {
        showToast(
          "Les pièces jointes ne sont pas incluses dans la signature BIS. Seul le corps de l'email est signé.",
          "info",
        );
      }

      const contentHash = await sha256Text(bodyText);
      const subject = extractSubject(root);

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
          notifyRecipient: true,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        showToast(
          "Configurez votre clé API dans les options de l'extension.",
          "error",
        );
        setButtonState(button, "disabled");
        composeState.set(root, { signed: false, signing: false });
        return;
      }

      if (response.status === 403) {
        showToast(
          "La signature BIS nécessite un plan Premium ou supérieur.",
          "error",
        );
        setButtonState(button, "ready");
        composeState.set(root, { signed: false, signing: false });
        return;
      }

      if (!response.ok) {
        showToast(
          data.error
            ? String(data.error)
            : "Impossible de signer — vérifiez votre connexion.",
          "error",
        );
        setButtonState(button, "ready");
        composeState.set(root, { signed: false, signing: false });
        return;
      }

      const bisId = data.signatureId || data.bisId;
      const verifyUrl =
        data.verifyUrl ||
        (bisId ? `${deps.apiBase}/verify/bis/${bisId}` : null);

      if (!bisId || !verifyUrl) {
        showToast("Réponse API incomplète — réessayez.", "error");
        setButtonState(button, "ready");
        composeState.set(root, { signed: false, signing: false });
        return;
      }

      insertBisBlock(bodyEl, bisId, verifyUrl);
      composeState.set(root, { signed: true, signing: false });
      setButtonState(button, "signed");
      showToast(
        "Email signé avec BIS — le destinataire sera notifié.",
        "success",
      );
    } catch (err) {
      console.warn("[BLOCKTRUST] BIS compose sign error:", err);
      showToast("Impossible de signer — vérifiez votre connexion.", "error");
      setButtonState(button, "ready");
      composeState.set(root, { signed: false, signing: false });
    }
  }

  /**
   * @param {Element} root
   */
  async function injectComposeButton(root) {
    if (!deps || processedComposers.has(root)) return;

    const toolbar = findComposeToolbar(root);
    if (!toolbar) return;

    if (toolbar.querySelector(".bt-compose-bis-btn")) {
      processedComposers.add(root);
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "bt-compose-bis-btn";
    button.setAttribute("aria-label", "Signer avec BLOCKTRUST BIS");

    const apiKey = await deps.getApiKey();
    setButtonState(button, apiKey ? "ready" : "disabled");

    button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      void handleSignClick(root, button);
    });

    toolbar.appendChild(button);
    processedComposers.add(root);
    composeState.set(root, { signed: false, signing: false });

    const bodyEl = findComposeBody(root);
    if (bodyEl && hasBisBlock(bodyEl)) {
      composeState.set(root, { signed: true, signing: false });
      setButtonState(button, "signed");
    }
  }

  function scanComposeWindows() {
    if (!deps) return;
    findComposeRoots().forEach((root) => {
      void injectComposeButton(root);
    });
  }

  function scheduleComposeScan() {
    if (composeDebounceId !== null) window.clearTimeout(composeDebounceId);
    composeDebounceId = window.setTimeout(() => {
      composeDebounceId = null;
      scanComposeWindows();
    }, 350);
  }

  /**
   * @param {{ apiBase: string, getApiKey: () => Promise<string|null>, escapeHtml: (v: unknown) => string }} options
   */
  function init(options) {
    if (global.location.hostname !== "mail.google.com") return;

    deps = options;
    console.log("[BLOCKTRUST] Compose BIS Phase 3 initialisé");

    const observer = new MutationObserver(() => {
      scheduleComposeScan();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    scheduleComposeScan();
  }

  global.BlockTrustGmailCompose = { init };
})(window);
