(() => {
  const STYLE_ID = "xtec-dark-mode-css";
  const SHIELD_ID = "xtec-dark-shield";
  const IFRAME_STYLE_ID = "xtec-dark-iframe-css";

  // Dark styles to inject inside TinyMCE iframes
  const IFRAME_CSS = `
    html, body {
      background-color: #140e04 !important;
      color: #b6ad90 !important;
    }
    body {
      caret-color: #c8a878 !important;
    }
    a { color: #c8a878 !important; }
    a:hover { color: #dcc098 !important; }
    ::selection {
      background: rgba(166, 138, 100, 0.4) !important;
      color: #f0ead6 !important;
    }
    table, th, td {
      border-color: #3d3020 !important;
    }
    pre, code {
      background-color: #191208 !important;
      color: #b6ad90 !important;
    }
  `;

  let darkEnabled = false;
  let iframeObserver = null;

  // STEP 1: Immediately inject a shield (synchronous, no async delay).
  const shield = document.createElement("style");
  shield.id = SHIELD_ID;
  shield.textContent =
    "html:not(.xtec-dark-ready) { background-color: #191208 !important; }" +
    "html:not(.xtec-dark-ready) body { opacity: 0 !important; }";
  document.documentElement.appendChild(shield);

  function revealPage() {
    document.documentElement.classList.add("xtec-dark-ready");
    requestAnimationFrame(() => {
      const s = document.getElementById(SHIELD_ID);
      if (s) s.remove();
    });
  }

  // Inject dark styles into a single iframe
  function styleIframe(iframe) {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc || doc.getElementById(IFRAME_STYLE_ID)) return;
      const style = doc.createElement("style");
      style.id = IFRAME_STYLE_ID;
      style.textContent = IFRAME_CSS;
      (doc.head || doc.documentElement).appendChild(style);
    } catch (e) {
      // Cross-origin iframe, can't style — ignore
    }
  }

  // Remove dark styles from a single iframe
  function unstyleIframe(iframe) {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;
      const el = doc.getElementById(IFRAME_STYLE_ID);
      if (el) el.remove();
    } catch (e) {}
  }

  // Style all existing iframes on the page
  function styleAllIframes() {
    document.querySelectorAll("iframe").forEach((iframe) => {
      // Try immediately (if already loaded)
      styleIframe(iframe);
      // Also listen for load (if not yet loaded or reloaded)
      iframe.addEventListener("load", () => styleIframe(iframe), { once: true });
    });
  }

  function unstyleAllIframes() {
    document.querySelectorAll("iframe").forEach(unstyleIframe);
  }

  // Watch for new iframes being added to the DOM
  function startIframeObserver() {
    if (iframeObserver) return;
    iframeObserver = new MutationObserver((mutations) => {
      if (!darkEnabled) return;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.tagName === "IFRAME") {
            styleIframe(node);
            node.addEventListener("load", () => styleIframe(node), { once: true });
          }
          // Also check children (e.g., a div containing an iframe was added)
          node.querySelectorAll?.("iframe").forEach((iframe) => {
            styleIframe(iframe);
            iframe.addEventListener("load", () => styleIframe(iframe), { once: true });
          });
        }
      }
    });
    iframeObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  function injectCSS() {
    darkEnabled = true;
    if (document.getElementById(STYLE_ID)) {
      styleAllIframes();
      revealPage();
      return;
    }
    const link = document.createElement("link");
    link.id = STYLE_ID;
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL("styles/dark-mode.css");
    link.onload = () => {
      revealPage();
      styleAllIframes();
    };
    document.documentElement.classList.add("xtec-dark");
    (document.head || document.documentElement).appendChild(link);
    startIframeObserver();

    // Safety fallback
    setTimeout(revealPage, 800);
  }

  function removeCSS() {
    darkEnabled = false;
    const el = document.getElementById(STYLE_ID);
    if (el) el.remove();
    document.documentElement.classList.remove("xtec-dark");
    unstyleAllIframes();
    revealPage();
  }

  // STEP 2: Check saved state
  chrome.storage.sync.get({ enabled: true }, (data) => {
    if (data.enabled) {
      injectCSS();
    } else {
      revealPage();
    }
  });

  // Listen for toggle messages from popup
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "toggle") {
      if (msg.enabled) {
        injectCSS();
      } else {
        removeCSS();
      }
    }
  });
})();
