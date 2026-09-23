/**
 * BLOCKTRUST™ — Phase 3 : BIS composeur Gmail (auto + sélectif + off)
 * Principe : le BIS est un bonus — l'envoi ne doit jamais être bloqué.
 */
(function initBlockTrustGmailCompose(global) {
  const BIS_MODES = Object.freeze({
    AUTO: "auto",
    SELECTIVE: "selective",
    OFF: "off",
  });

  const DEFAULT_BIS_MODE = BIS_MODES.SELECTIVE;
  const AUTO_RACE_TIMEOUT_MS = 2500;
  const WATCHDOG_MS = 1500;
  const SELECTIVE_SIGN_TIMEOUT_MS = 8000;
  const COMPOSE_SCAN_DEBOUNCE_MS = 300;
  const BIS_WARM_DEBOUNCE_MS = 1200;
  const TOAST_DURATION_MS = 2000;
  // Cache local 5 min. Le serveur est invalidé à la révocation.
  // Ce cache navigateur peut conserver l'ancien verdict jusqu'à 5 minutes.
  const SENDER_VERIFY_CACHE_TTL = 5 * 60 * 1000;

  const BIS_BLOCK_MARKER = "data-bt-bis-block";
  const ATTR_BIS_BTN = "data-bt-bis-btn";
  const ATTR_BIS_READY = "data-bt-bis-ready";
  const ATTR_BIS_DONE = "data-bt-bis-done";
  const ATTR_BIS_PENDING = "data-bt-bis-pending";
  const ATTR_BIS_RELEASED = "data-bt-bis-released";
  const ATTR_WATCHDOG_RETRY = "data-bt-watchdog-retry";
  const ATTR_BIS_UNAVAILABLE = "data-bt-bis-unavailable";
  const ATTR_BIS_UNAVAIL_MSG = "data-bt-bis-unavail-msg";
  const ATTR_SENDER_CERT = "data-bt-sender-cert";
  const BT_UI_MARKER = "data-bt-ui";
  const CIRCUIT_BREAKER_KEY = "bt_bis_auto_failures";
  const CIRCUIT_BREAKER_THRESHOLD = 2;

  /** @type {{ apiBase: string, getApiKey: () => Promise<string|null>, escapeHtml: (v: unknown) => string } | null} */
  let deps = null;

  /** @type {string} */
  let currentMode = DEFAULT_BIS_MODE;

  /** Interception AUTO désactivée pour la session (circuit breaker). */
  let sessionAutoPaused = false;

  /** @type {number | null} */
  let composeDebounceId = null;

  /** @type {WeakSet<Element>} */
  const initializedComposers = new WeakSet();

  /** @type {Map<Element, { signed: boolean, signing: boolean }>} */
  const composeState = new Map();

  /**
   * Signature BIS en cache par composeur (warm-up ou sign manuel).
   * @type {Map<Element, { contentHash: string, bisId: string, verifyUrl: string }>}
   */
  const bisSignatureByRoot = new Map();

  /** @type {Map<Element, number>} */
  const bisWarmDebounceByRoot = new Map();

  /** @type {WeakSet<Element>} */
  const bodyInvalidationBound = new WeakSet();

  /** Disponibilité BIS du compte authentifié (pas de l'adresse Gmail). */
  let bisAccountCache = null;
  /** @type {Promise<boolean | null> | null} */
  let bisAccountInflight = null;

  let autoSendHookInstalled = false;
  let sendMenuHookInstalled = false;
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

  const SEND_OPTIONS_MENU_RE =
    /schedule send|planifier l['’]envoi|programmer l['’]envoi/i;

  /** Bandeaux legacy (ne plus injecter). */
  function removeAllUnavailableBanners() {
    document.querySelectorAll(".bt-bis-unavailable-msg").forEach((el) => el.remove());
  }

  /**
   * Retire les boutons BIS mal placés (barre d'icônes), pas la cellule Envoyer.
   * @param {Element} root
   */
  function removeMisplacedBisControls(root) {
    root.querySelectorAll(`[${ATTR_BIS_BTN}], .bt-bis-btn`).forEach((el) => {
      if (!el.closest(".bt-bis-cell")) el.remove();
    });
    root.querySelectorAll(".bt-bis-cell").forEach((cell) => {
      if (!cell.querySelector(`[${ATTR_BIS_BTN}]`)) cell.remove();
    });
  }

  /**
   * @param {Element} root
   * @returns {HTMLElement | null}
   */
  function findSendAnchor(root) {
    const buttons = [...root.querySelectorAll('div[role="button"]')].filter(
      (el) => el instanceof HTMLElement && !el.classList.contains("bt-bis-btn"),
    );
    const optionsBtn = buttons.find((el) => {
      const label = `${el.getAttribute("aria-label") || ""} ${el.getAttribute("data-tooltip") || ""}`;
      return /more send options|plus d'options d'envoi|options d'envoi/i.test(label);
    });
    const sendBtn = buttons.find((el) => {
      const text = (el.textContent || "").replace(/\s+/g, " ").trim();
      const label = `${el.getAttribute("aria-label") || ""} ${el.getAttribute("data-tooltip") || ""}`;
      if (/schedule|planifier|programmer|option/i.test(label)) return false;
      return /^(send|envoyer)$/i.test(text) || /\b(send|envoyer)\b/i.test(label);
    });
    const anchorBtn = optionsBtn || sendBtn;
    if (!(anchorBtn instanceof HTMLElement)) return null;
    const cell = anchorBtn.closest("td");
    if (cell instanceof HTMLElement) return cell;
    return anchorBtn.parentElement instanceof HTMLElement
      ? anchorBtn.parentElement
      : anchorBtn;
  }

  /**
   * @param {Element} root
   * @param {HTMLElement} button
   * @returns {boolean}
   */
  function placeBisButton(root, button) {
    removeMisplacedBisControls(root);
    const anchor = findSendAnchor(root);
    if (!anchor) return false;
    root.querySelectorAll(".bt-bis-cell").forEach((cell) => cell.remove());
    if (anchor.tagName === "TD") {
      const td = document.createElement("td");
      td.className = "bt-bis-cell";
      td.setAttribute(BT_UI_MARKER, "1");
      td.appendChild(button);
      anchor.insertAdjacentElement("afterend", td);
      return true;
    }
    anchor.insertAdjacentElement("afterend", button);
    return true;
  }

  /**
   * @param {Element} root
   * @returns {boolean}
   */
  function hasSendRowBisButton(root) {
    return Boolean(root.querySelector(".bt-bis-cell [data-bt-bis-btn]"));
  }

  /**
   * Composeur dont le menu d'options d'envoi est ouvert.
   * @returns {Element | null}
   */
  function activeComposeRoot() {
    const roots = findComposeRoots();
    const opened = roots.find((root) =>
      root.querySelector('[aria-expanded="true"]'),
    );
    if (opened) return opened;
    return roots.find((root) => isPopupCompose(root)) || roots[0] || null;
  }

  /**
   * Une ligne dans le menu de la flèche à côté d'Envoyer.
   * @returns {Promise<void>}
   */
  async function ensureBisSendMenuItem() {
    if (!deps || currentMode !== BIS_MODES.SELECTIVE) return;

    const menu = [...document.querySelectorAll('[role="menu"]')].find(
      (node) =>
        node instanceof HTMLElement &&
        node.getClientRects().length > 0 &&
        SEND_OPTIONS_MENU_RE.test(node.innerText || ""),
    );
    if (!(menu instanceof HTMLElement) || menu.querySelector(".bt-bis-menu-item")) {
      return;
    }

    const available = await accountHasActiveBisCertificate();
    if (!menu.isConnected || menu.querySelector(".bt-bis-menu-item")) return;

    const sample = menu.querySelector('[role="menuitem"]');
    const item = document.createElement("div");
    item.className = `${sample?.className || ""} bt-bis-menu-item`.trim();
    item.setAttribute("role", "menuitem");
    item.setAttribute(BT_UI_MARKER, "1");
    item.setAttribute(ATTR_BIS_BTN, "1");
    item.setAttribute("tabindex", "-1");

    const inner = document.createElement("div");
    if (sample?.firstElementChild?.className) {
      inner.className = sample.firstElementChild.className;
    }
    const label = document.createElement("span");
    label.className = "bt-bis-menu-label";
    const enabled = available === true;
    label.textContent = enabled ? "Signer avec BIS" : "BIS indisponible";
    item.setAttribute("aria-disabled", enabled ? "false" : "true");
    if (!enabled) item.classList.add("bt-bis-menu-item--off");
    item.title = enabled
      ? "Ajoute la signature BLOCKTRUST à cet email"
      : BIS_UNAVAILABLE_MESSAGE;
    inner.appendChild(label);
    item.appendChild(inner);

    const host = sample?.parentElement || menu;
    host.insertBefore(item, sample || null);

    if (!enabled) return;

    const activate = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const root = activeComposeRoot();
      if (!root) return;
      const popup = item.closest('[role="menu"]');
      if (popup instanceof HTMLElement) popup.style.display = "none";
      void handleSelectiveSignClick(root, item);
    };
    item.addEventListener("mousedown", activate);
    item.addEventListener("click", activate);
  }

  /**
   * @param {number} ms
   * @returns {Promise<{ ok: false, reason: "race_timeout" }>}
   */
  function sleep(ms) {
    return new Promise((resolve) => {
      window.setTimeout(() => resolve({ ok: false, reason: "race_timeout" }), ms);
    });
  }

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
   * @param {Node} node
   * @returns {boolean}
   */
  function nodeIsBtUi(node) {
    if (!(node instanceof Element)) return false;
    if (node.hasAttribute(BT_UI_MARKER)) return true;
    if (node.hasAttribute(BIS_BLOCK_MARKER)) return true;
    if (node.id === "bt-compose-toast" || node.id === "bt-bis-auto-badge") return true;
    if (node.classList?.contains("bt-bis-btn")) return true;
    if (node.classList?.contains("bt-bis-cell")) return true;
    if (node.classList?.contains("bt-bis-menu-item")) return true;
    if (node.classList?.contains("bt-bis-unavailable-msg")) return true;
    if (node.closest(`[${BT_UI_MARKER}]`)) return true;
    if (node.closest(`[${BIS_BLOCK_MARKER}]`)) return true;
    return false;
  }

  /**
   * @param {MutationRecord} mutation
   * @returns {boolean}
   */
  function isIgnorableMutation(mutation) {
    if ([...mutation.removedNodes].some((node) => nodeIsBtUi(node))) return false;
    const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
    if (nodes.length === 0) return nodeIsBtUi(mutation.target);
    return nodes.every((node) => nodeIsBtUi(node));
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
  function showToast(message, kind = "info", durationMs = TOAST_DURATION_MS) {
    const existing = document.getElementById("bt-compose-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "bt-compose-toast";
    toast.className = `bt-compose-toast bt-compose-toast-${kind}`;
    toast.setAttribute("role", "status");
    toast.setAttribute(BT_UI_MARKER, "1");
    toast.textContent = message;

    try {
      document.body.appendChild(toast);
      requestAnimationFrame(() => {
        toast.classList.add("bt-compose-toast-visible");
      });

      window.setTimeout(() => {
        try {
          toast.classList.remove("bt-compose-toast-visible");
          window.setTimeout(() => toast.remove(), 200);
        } finally {
          if (toast.isConnected) toast.remove();
        }
      }, durationMs);
    } catch {
      toast.remove();
    }
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

  function recordInterceptionSuccess() {
    chrome.storage.local.set({ [CIRCUIT_BREAKER_KEY]: 0 });
  }

  function recordInterceptionFailure() {
    chrome.storage.local.get([CIRCUIT_BREAKER_KEY], (result) => {
      const count = Number(result[CIRCUIT_BREAKER_KEY] || 0) + 1;
      chrome.storage.local.set({ [CIRCUIT_BREAKER_KEY]: count });
      if (count >= CIRCUIT_BREAKER_THRESHOLD) {
        sessionAutoPaused = true;
        uninstallAutoSendHook();
        updateAutoBadge();
        logAutoSignFailure({ reason: "circuit_breaker", count });
      }
    });
  }

  /**
   * @param {Element} root
   */
  function clearComposeFlags(root) {
    root.removeAttribute(ATTR_BIS_DONE);
    root.removeAttribute(ATTR_BIS_PENDING);
    root.removeAttribute(ATTR_WATCHDOG_RETRY);
  }

  /**
   * @param {Element} root
   */
  function releaseComposeControl(root) {
    root.setAttribute(ATTR_BIS_RELEASED, "1");
    clearComposeFlags(root);
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

  const BIS_UNAVAILABLE_MESSAGE = "BIS indisponible — aucun badge actif sur votre compte";

  /**
   * Le composeur ne compare pas l'adresse Gmail.
   * GET /api/extension/me : le compte de la clé API a-t-il un certificat valide ?
   * true = badge, false = refus explicite, null = inconnu (réseau, 5xx) — ne pas verrouiller.
   * @returns {Promise<boolean | null>}
   */
  async function accountHasActiveBisCertificate() {
    const now = Date.now();
    if (bisAccountCache) {
      const ttl = bisAccountCache.available
        ? SENDER_VERIFY_CACHE_TTL
        : 20 * 1000;
      if (now - bisAccountCache.timestamp < ttl) return bisAccountCache.available;
    }

    if (bisAccountInflight) return bisAccountInflight;
    if (!deps) return null;

    bisAccountInflight = (async () => {
      const apiKey = await deps.getApiKey();
      if (!apiKey) return false;

      try {
        const response = await fetch(`${deps.apiBase}/api/extension/me`, {
          headers: {
            Authorization: `Bearer ${apiKey.trim()}`,
            "X-BT-Client": "extension",
          },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return null;
        const available = data?.hasBisCertificate === true;
        bisAccountCache = { available, timestamp: Date.now() };
        return available;
      } catch {
        return null;
      } finally {
        bisAccountInflight = null;
      }
    })();

    return bisAccountInflight;
  }

  /**
   * Mémorise si le compte peut signer. Le choix BIS est dans le menu d'Envoyer.
   * @param {Element} root
   */
  async function refreshComposeSenderCert(root) {
    removeAllUnavailableBanners();
    removeMisplacedBisControls(root);

    const available = await accountHasActiveBisCertificate();
    if (available === null) return;

    if (available === true) {
      hideBisUnavailable(root);
      root.setAttribute(ATTR_SENDER_CERT, "1");
      if (currentMode === BIS_MODES.SELECTIVE) {
        await ensureSendRowBisButton(root);
      }
      return;
    }

    root.querySelectorAll(".bt-bis-cell, .bt-bis-btn").forEach((el) => el.remove());
    hideBisUnavailable(root);
    root.setAttribute(ATTR_SENDER_CERT, "0");
  }

  /**
   * @param {Element} root
   * @returns {boolean}
   */
  function isPopupCompose(root) {
    return Boolean(root.closest('div[role="dialog"]'));
  }

  /**
   * @param {Element} root
   */
  function showBisUnavailable(root) {
    removeAllUnavailableBanners();
    root.setAttribute(ATTR_SENDER_CERT, "0");
    root.removeAttribute(ATTR_BIS_UNAVAILABLE);
  }

  /**
   * @param {Element} root
   */
  function hideBisUnavailable(root) {
    root.removeAttribute(ATTR_BIS_UNAVAILABLE);
    root.removeAttribute(ATTR_SENDER_CERT);
    root.querySelectorAll(`[${ATTR_BIS_UNAVAIL_MSG}]`).forEach((el) => el.remove());
  }

  /**
   * @param {Element} root
   */
  function clearComposeBisUi(root) {
    root.querySelector(`[${ATTR_BIS_BTN}]`)?.remove();
    hideBisUnavailable(root);
    root.removeAttribute(ATTR_BIS_READY);
    initializedComposers.delete(root);
    composeState.delete(root);
    bisSignatureByRoot.delete(root);
  }

  /**
   * @param {Element} root
   * @returns {boolean}
   */
  function hasAttachments(root) {
    return Boolean(
      root.querySelector(".aZo") ||
        root.querySelector('[aria-label*="Remove attachment"]') ||
        root.querySelector('[aria-label*="Supprimer la pièce jointe"]') ||
        root.querySelector('[data-tooltip*="Remove attachment"]') ||
        root.querySelector('[data-tooltip*="Supprimer la pièce jointe"]'),
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
   * @param {HTMLElement} bodyEl
   */
  function removeExistingBisBlocks(bodyEl) {
    bodyEl.querySelectorAll(`[${BIS_BLOCK_MARKER}]`).forEach((el) => el.remove());
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
      `<div ${BIS_BLOCK_MARKER}="1" ${BT_UI_MARKER}="1" contenteditable="false" ` +
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
   * @param {Element | null} [root]
   */
  function insertBisBlock(bodyEl, bisId, verifyUrl, root = null) {
    if (root?.getAttribute(ATTR_BIS_DONE) === "1") return;

    removeExistingBisBlocks(bodyEl);

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
   */
  function invalidateBisForRoot(root) {
    bisSignatureByRoot.delete(root);
    const bodyEl = findComposeBody(root);
    if (bodyEl) removeExistingBisBlocks(bodyEl);

    const state = composeState.get(root);
    if (state) {
      composeState.set(root, { signed: false, signing: false });
    }

    const btn = root.querySelector(`[${ATTR_BIS_BTN}]`);
    if (btn instanceof HTMLElement) {
      setButtonState(btn, deps ? "ready" : "disabled");
    }
  }

  /**
   * @param {Element} root
   */
  function bindBodyInvalidation(root) {
    if (bodyInvalidationBound.has(root)) return;
    const bodyEl = findComposeBody(root);
    if (!bodyEl) return;

    bodyInvalidationBound.add(root);
    bodyEl.addEventListener("input", () => {
      const cached = bisSignatureByRoot.get(root);
      const currentText = extractBodyText(bodyEl);
      if (!cached && !hasBisBlock(bodyEl)) return;

      void sha256Text(currentText).then((hash) => {
        if (cached && cached.contentHash === hash && hasBisBlock(bodyEl)) return;
        invalidateBisForRoot(root);
      });
    });
  }

  /**
   * @param {Element} root
   * @param {string} contentHash
   * @param {{ silent?: boolean, timeoutMs?: number }} [options]
   * @returns {Promise<{ ok: true, bisId: string, verifyUrl: string, contentHash: string } | { ok: false, reason: string }>}
   */
  async function requestBisSignature(root, contentHash, options = {}) {
    if (!deps) return { ok: false, reason: "not_initialized" };

    const apiKey = await deps.getApiKey();
    if (!apiKey) return { ok: false, reason: "no_api_key" };

    const { recipientEmail, subject } = extractComposeData(root);
    if (!recipientEmail) return { ok: false, reason: "no_recipient" };

    if (!options.silent && hasAttachments(root)) {
      showToast(
        "Les pièces jointes ne sont pas incluses dans la signature BIS. Seul le corps de l'email est signé.",
        "info",
        3500,
      );
    }

    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? SELECTIVE_SIGN_TIMEOUT_MS;
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${deps.apiBase}/api/bis/sign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`,
          "X-BT-Client": "extension",
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

      return { ok: true, bisId, verifyUrl, contentHash };
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
   * Warm-up AUTO : pré-signature sans insertion de bloc (Neon cold start).
   * @param {Element} root
   */
  function scheduleBisWarmUp(root) {
    if (currentMode !== BIS_MODES.AUTO || !deps) return;

    const prev = bisWarmDebounceByRoot.get(root);
    if (prev !== undefined) window.clearTimeout(prev);

    const timerId = window.setTimeout(() => {
      bisWarmDebounceByRoot.delete(root);
      if (!root.isConnected) return;

      void (async () => {
        const available = await accountHasActiveBisCertificate();
        if (available !== true) {
          if (available === false) showBisUnavailable(root);
          return;
        }
        hideBisUnavailable(root);

        const bodyEl = findComposeBody(root);
        if (!bodyEl) return;

        const { recipientEmail, bodyText } = extractComposeData(root);
        if (!recipientEmail || !bodyText) return;

        const contentHash = await sha256Text(bodyText);
        const cached = bisSignatureByRoot.get(root);
        if (cached?.contentHash === contentHash) return;

        const result = await requestBisSignature(root, contentHash, {
          silent: true,
          timeoutMs: SELECTIVE_SIGN_TIMEOUT_MS,
        });
        if (result.ok) {
          bisSignatureByRoot.set(root, {
            contentHash: result.contentHash,
            bisId: result.bisId,
            verifyUrl: result.verifyUrl,
          });
        }
      })();
    }, BIS_WARM_DEBOUNCE_MS);

    bisWarmDebounceByRoot.set(root, timerId);
  }

  /**
   * Signe pour envoi AUTO : hash FINAL obligatoire avant insertion.
   * @param {Element} root
   * @param {{ timeoutMs?: number }} [options]
   */
  async function signBisForSend(root, options = {}) {
    if (!deps) return { ok: false, reason: "not_initialized" };
    const availableForSend = await accountHasActiveBisCertificate();
    if (availableForSend !== true) {
      if (availableForSend === false) showBisUnavailable(root);
      return { ok: false, reason: "sender_not_certified" };
    }
    if (root.getAttribute(ATTR_BIS_DONE) === "1") {
      return { ok: false, reason: "send_already_triggered" };
    }

    const bodyEl = findComposeBody(root);
    if (!bodyEl) return { ok: false, reason: "no_body" };

    const { recipientEmail, bodyText } = extractComposeData(root);
    if (!recipientEmail) return { ok: false, reason: "no_recipient" };
    if (!bodyText) return { ok: false, reason: "empty_body" };

    removeExistingBisBlocks(bodyEl);

    const finalHash = await sha256Text(bodyText);
    const cached = bisSignatureByRoot.get(root);

    let signature = null;

    if (cached && cached.contentHash === finalHash) {
      signature = cached;
    } else {
      const apiResult = await requestBisSignature(root, finalHash, {
        silent: true,
        timeoutMs: options.timeoutMs ?? AUTO_RACE_TIMEOUT_MS,
      });
      if (!apiResult.ok) return apiResult;

      const bodyTextAfter = extractComposeData(root).bodyText;
      const hashAfter = await sha256Text(bodyTextAfter);
      if (hashAfter !== finalHash) {
        return { ok: false, reason: "content_changed" };
      }

      signature = {
        contentHash: apiResult.contentHash,
        bisId: apiResult.bisId,
        verifyUrl: apiResult.verifyUrl,
      };
      bisSignatureByRoot.set(root, signature);
    }

    if (!root.isConnected || root.getAttribute(ATTR_BIS_DONE) === "1") {
      return { ok: false, reason: "compose_closed" };
    }

    const verifyHash = await sha256Text(extractBodyText(bodyEl));
    if (verifyHash !== finalHash) {
      return { ok: false, reason: "content_changed" };
    }

    insertBisBlock(bodyEl, signature.bisId, signature.verifyUrl, root);
    return { ok: true, bisId: signature.bisId, reused: cached?.contentHash === finalHash };
  }

  /**
   * Signe en mode sélectif (clic ✓ BIS).
   * @param {Element} root
   */
  async function signBisSelective(root) {
    if (!deps) return { ok: false, reason: "not_initialized" };
    const availableSelective = await accountHasActiveBisCertificate();
    if (availableSelective !== true) {
      if (availableSelective === false) showBisUnavailable(root);
      return { ok: false, reason: "sender_not_certified" };
    }

    const bodyEl = findComposeBody(root);
    if (!bodyEl) return { ok: false, reason: "no_body" };

    const { recipientEmail, bodyText } = extractComposeData(root);
    if (!recipientEmail) return { ok: false, reason: "no_recipient" };
    if (!bodyText) return { ok: false, reason: "empty_body" };

    removeExistingBisBlocks(bodyEl);

    const finalHash = await sha256Text(bodyText);
    const apiResult = await requestBisSignature(root, finalHash, {
      silent: false,
      timeoutMs: SELECTIVE_SIGN_TIMEOUT_MS,
    });
    if (!apiResult.ok) return apiResult;

    const hashAfter = await sha256Text(extractComposeData(root).bodyText);
    if (hashAfter !== finalHash) {
      return { ok: false, reason: "content_changed" };
    }

    bisSignatureByRoot.set(root, {
      contentHash: finalHash,
      bisId: apiResult.bisId,
      verifyUrl: apiResult.verifyUrl,
    });
    insertBisBlock(bodyEl, apiResult.bisId, apiResult.verifyUrl, root);
    return { ok: true, bisId: apiResult.bisId };
  }

  /**
   * @param {HTMLElement} button
   * @param {"ready"|"signing"|"signed"|"disabled"} state
   */
  function setButtonState(button, state) {
    if (button.classList.contains("bt-bis-menu-item")) {
      const label = button.querySelector(".bt-bis-menu-label");
      if (label) {
        if (state === "signing") label.textContent = "Signature…";
        else if (state === "signed") label.textContent = "Signé avec BIS";
        else if (state === "disabled") label.textContent = "BIS indisponible";
        else label.textContent = "Signer avec BIS";
      }
      return;
    }

    button.classList.remove(
      "bt-bis-btn--ready",
      "bt-bis-btn--signed",
      "bt-bis-btn--disabled",
      "bt-bis-btn--signing",
    );
    button.setAttribute("aria-disabled", state === "signed" ? "true" : "false");

    const label = '<span class="bt-bis-btn-label">BIS</span>';
    if (state === "ready") {
      button.classList.add("bt-bis-btn--ready");
      button.innerHTML = label;
      button.title = "Signer avec BLOCKTRUST BIS";
    } else if (state === "signed") {
      button.classList.add("bt-bis-btn--signed");
      button.innerHTML = label;
      button.title = "Email signé avec BIS";
    } else if (state === "signing") {
      button.classList.add("bt-bis-btn--signing");
      button.innerHTML = label;
      button.title = "Signature en cours…";
    } else {
      button.classList.add("bt-bis-btn--disabled");
      button.innerHTML = label;
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

    const availableClick = await accountHasActiveBisCertificate();
    if (availableClick !== true) {
      if (availableClick === false) {
        showBisUnavailable(root);
        showToast(BIS_UNAVAILABLE_MESSAGE, "error");
      }
      return;
    }

    composeState.set(root, { signed: false, signing: true });
    setButtonState(button, "signing");

    const result = await signBisSelective(root);

    if (result.ok) {
      composeState.set(root, { signed: true, signing: false });
      setButtonState(button, "signed");
      showToast("Email signé — le destinataire sera notifié", "success");
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

  /**
   * Bouton or à côté d'Envoyer (réinjecté si Gmail reconstruit la barre, ex. PJ).
   * @param {Element} root
   */
  async function ensureSendRowBisButton(root) {
    if (!deps || currentMode !== BIS_MODES.SELECTIVE) return;

    const available = await accountHasActiveBisCertificate();
    if (available !== true) return;

    if (hasSendRowBisButton(root)) {
      const btn = root.querySelector(`.bt-bis-cell [${ATTR_BIS_BTN}]`);
      const bodyEl = findComposeBody(root);
      if (btn instanceof HTMLElement && bodyEl && hasBisBlock(bodyEl)) {
        composeState.set(root, { signed: true, signing: false });
        setButtonState(btn, "signed");
      }
      bindBodyInvalidation(root);
      return;
    }

    const button = document.createElement("div");
    button.className = "bt-bis-btn bt-bis-btn--ready";
    button.setAttribute("role", "button");
    button.setAttribute("tabindex", "0");
    button.setAttribute("aria-label", "Signer avec BLOCKTRUST BIS");
    button.setAttribute(BT_UI_MARKER, "1");
    button.setAttribute(ATTR_BIS_BTN, "1");

    const apiKey = await deps.getApiKey();
    setButtonState(button, apiKey ? "ready" : "disabled");

    const onActivate = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (button.classList.contains("bt-bis-btn--signed")) return;
      if (button.classList.contains("bt-bis-btn--signing")) return;
      void handleSelectiveSignClick(root, button);
    };
    button.addEventListener("click", onActivate);
    button.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") onActivate(e);
    });

    if (!placeBisButton(root, button)) return;

    root.setAttribute(ATTR_BIS_READY, "1");
    composeState.set(root, { signed: false, signing: false });
    bindBodyInvalidation(root);

    const bodyEl = findComposeBody(root);
    if (bodyEl && hasBisBlock(bodyEl)) {
      composeState.set(root, { signed: true, signing: false });
      setButtonState(button, "signed");
    }
  }

  function removeAllComposeButtons() {
    document.querySelectorAll(".bt-bis-cell").forEach((el) => el.remove());
    document.querySelectorAll(`[${ATTR_BIS_BTN}]`).forEach((btn) => btn.remove());
    removeAllUnavailableBanners();
    document.querySelectorAll(`[${ATTR_BIS_UNAVAIL_MSG}]`).forEach((el) => el.remove());
    document.querySelectorAll(`[${ATTR_BIS_UNAVAILABLE}]`).forEach((root) => {
      root.removeAttribute(ATTR_BIS_UNAVAILABLE);
      root.removeAttribute(ATTR_SENDER_CERT);
    });
    document.querySelectorAll(`[${ATTR_BIS_READY}]`).forEach((root) => {
      root.removeAttribute(ATTR_BIS_READY);
    });
    composeState.clear();
    bisSignatureByRoot.clear();
    bisWarmDebounceByRoot.forEach((id) => window.clearTimeout(id));
    bisWarmDebounceByRoot.clear();
  }

  function updateAutoBadge() {
    if (currentMode !== BIS_MODES.AUTO) {
      autoBadgeEl?.remove();
      autoBadgeEl = null;
      return;
    }

    const popupRoots = findComposeRoots().filter(isPopupCompose);
    if (popupRoots.length === 0) {
      autoBadgeEl?.remove();
      autoBadgeEl = null;
      return;
    }

    if (!autoBadgeEl) {
      autoBadgeEl = document.createElement("div");
      autoBadgeEl.id = "bt-bis-auto-badge";
      autoBadgeEl.className = "bt-bis-auto-badge";
      autoBadgeEl.setAttribute("role", "status");
      autoBadgeEl.setAttribute(BT_UI_MARKER, "1");
      document.body.appendChild(autoBadgeEl);
    }

    if (sessionAutoPaused) {
      autoBadgeEl.classList.add("bt-bis-auto-badge--paused");
      autoBadgeEl.textContent = "BIS AUTO ⚠︎ pause";
    } else {
      autoBadgeEl.classList.remove("bt-bis-auto-badge--paused");
      autoBadgeEl.textContent = "BIS AUTO ✓";
    }
  }

  /**
   * @param {Element} root
   * @param {HTMLElement} sendBtn
   */
  function triggerSendWithWatchdog(root, sendBtn) {
    root.setAttribute(ATTR_BIS_DONE, "1");
    root.removeAttribute(ATTR_BIS_PENDING);

    sendBtn.click();

    window.setTimeout(() => {
      if (!root.isConnected) {
        recordInterceptionSuccess();
        clearComposeFlags(root);
        return;
      }

      if (root.getAttribute(ATTR_WATCHDOG_RETRY) !== "1") {
        root.setAttribute(ATTR_WATCHDOG_RETRY, "1");
        sendBtn.click();

        window.setTimeout(() => {
          if (!root.isConnected) {
            recordInterceptionSuccess();
            clearComposeFlags(root);
            return;
          }

          releaseComposeControl(root);
          recordInterceptionFailure();
          showToast("BIS désactivé pour cet email — cliquez Envoyer", "info");
        }, WATCHDOG_MS);
      }
    }, WATCHDOG_MS);
  }

  /**
   * @param {MouseEvent} event
   */
  async function handleAutoSendClick(event) {
    if (currentMode !== BIS_MODES.AUTO || !deps || sessionAutoPaused) return;

    const sendBtn = findSendButton(event.target);
    if (!sendBtn) return;

    const root = findComposeRoot(sendBtn);
    if (!root) return;

    if (root.getAttribute(ATTR_BIS_RELEASED) === "1") return;

    if (root.getAttribute(ATTR_BIS_DONE) === "1") return;

    if (root.getAttribute(ATTR_BIS_PENDING) === "1") return;

    const available = await accountHasActiveBisCertificate();
    if (available !== true) {
      if (available === false) showBisUnavailable(root);
      return;
    }

    hideBisUnavailable(root);

    const bodyEl = findComposeBody(root);
    const data = extractComposeData(root);
    if (!data.recipientEmail || !data.bodyText) return;

    if (bodyEl && hasBisBlock(bodyEl)) {
      const finalHash = await sha256Text(data.bodyText);
      const cached = bisSignatureByRoot.get(root);
      if (cached && cached.contentHash === finalHash) return;
      removeExistingBisBlocks(bodyEl);
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    root.setAttribute(ATTR_BIS_PENDING, "1");

    try {
      const result = await Promise.race([
        signBisForSend(root, { timeoutMs: AUTO_RACE_TIMEOUT_MS }),
        sleep(AUTO_RACE_TIMEOUT_MS),
      ]);

      if (!result.ok && result.reason !== "race_timeout") {
        logAutoSignFailure({ reason: result.reason, phase: "auto_race" });
      }
    } catch (err) {
      logAutoSignFailure({
        reason: err instanceof Error ? err.message : "exception",
        phase: "auto_race",
      });
    } finally {
      triggerSendWithWatchdog(root, sendBtn);
    }
  }

  function installAutoSendHook() {
    if (autoSendHookInstalled || sessionAutoPaused) return;
    document.addEventListener("click", handleAutoSendClick, true);
    autoSendHookInstalled = true;
  }

  function uninstallAutoSendHook() {
    if (!autoSendHookInstalled) return;
    document.removeEventListener("click", handleAutoSendClick, true);
    autoSendHookInstalled = false;
  }

  function installSendMenuHook() {
    if (sendMenuHookInstalled) return;
    document.addEventListener(
      "click",
      () => {
        if (currentMode !== BIS_MODES.SELECTIVE) return;
        window.setTimeout(() => {
          void ensureBisSendMenuItem();
        }, 60);
      },
      true,
    );
    sendMenuHookInstalled = true;
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
      installSendMenuHook();
      findComposeRoots().forEach((root) => {
        void refreshComposeSenderCert(root);
      });
    } else {
      removeAllComposeButtons();
    }

    if (currentMode === BIS_MODES.AUTO) {
      findComposeRoots().forEach((root) => {
        void refreshComposeSenderCert(root).then(() => {
          if (root.getAttribute(ATTR_SENDER_CERT) !== "1") return;
          bindBodyInvalidation(root);
          scheduleBisWarmUp(root);
        });
      });
      installAutoSendHook();
      updateAutoBadge();
    } else {
      bisWarmDebounceByRoot.forEach((id) => window.clearTimeout(id));
      bisWarmDebounceByRoot.clear();
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
    }, COMPOSE_SCAN_DEBOUNCE_MS);
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

    chrome.storage.local.get([CIRCUIT_BREAKER_KEY], (result) => {
      const failures = Number(result[CIRCUIT_BREAKER_KEY] || 0);
      if (failures >= CIRCUIT_BREAKER_THRESHOLD) {
        sessionAutoPaused = true;
      }
      if (currentMode === BIS_MODES.AUTO) {
        updateAutoBadge();
      }
    });

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

    removeAllUnavailableBanners();
    console.log("[BLOCKTRUST] Compose BIS v1.1.4 — mode:", currentMode);

    if (composeObserver) composeObserver.disconnect();
    composeObserver = new MutationObserver((mutations) => {
      if (mutations.every(isIgnorableMutation)) return;
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
