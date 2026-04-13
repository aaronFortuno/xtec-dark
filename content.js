(() => {
  const STYLE_ID = "xtec-dark-mode-css";
  const SHIELD_ID = "xtec-dark-shield";

  // STEP 1: Immediately inject a shield (synchronous, no async delay).
  // This runs at document_start, before any page content renders.
  // It hides everything behind a dark background until our full CSS is loaded.
  const shield = document.createElement("style");
  shield.id = SHIELD_ID;
  shield.textContent =
    "html:not(.xtec-dark-ready) { background-color: #191208 !important; }" +
    "html:not(.xtec-dark-ready) body { opacity: 0 !important; }";
  document.documentElement.appendChild(shield);

  function revealPage() {
    document.documentElement.classList.add("xtec-dark-ready");
    // Clean up shield after body is visible
    requestAnimationFrame(() => {
      const s = document.getElementById(SHIELD_ID);
      if (s) s.remove();
    });
  }

  function injectCSS() {
    if (document.getElementById(STYLE_ID)) {
      revealPage();
      return;
    }
    const link = document.createElement("link");
    link.id = STYLE_ID;
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL("styles/dark-mode.css");
    link.onload = revealPage;
    document.documentElement.classList.add("xtec-dark");
    (document.head || document.documentElement).appendChild(link);

    // Safety fallback: reveal after 800ms even if onload doesn't fire
    setTimeout(revealPage, 800);
  }

  function removeCSS() {
    const el = document.getElementById(STYLE_ID);
    if (el) el.remove();
    document.documentElement.classList.remove("xtec-dark");
    revealPage();
  }

  // STEP 2: Check saved state and either inject dark CSS or reveal normally.
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
