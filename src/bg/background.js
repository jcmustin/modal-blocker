// We keep settings in chrome.storage.sync and the current state (mode) in chrome.storage.local.
// Settings format:
// { "modes": {"f9LtXFu/c+wMNMBaS7R5": {"name": "Email", "allow": ["https://mail.google.com/mail/.*"]}} }
// State format:
// { "currentMode": "f9LtXFu/c+wMNMBaS7R5" }
// or
// { "currentMode": null }

const blockPage = "https://github.com/jcmustin/modal-blocker";

const bkg = chrome.extension.getBackgroundPage();

chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.sync.get(["modes"], function (sync) {
    const { modes } = sync;
    if (typeof modes !== "object" || modes === null) {
      chrome.storage.sync.set({
        modes: {"email": {"name": "Email", "allow": ["https://mail.google.com/mail/.*"]}}
      });
    }
  });

  chrome.storage.local.get(["currentMode"], function (local) {
    const { currentMode } = local;
    if (!currentMode) {
      chrome.storage.local.set({ currentMode: "email" });
    }
  });
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo) {
  const urlStr = changeInfo.pendingUrl || changeInfo.url;
  if (!urlStr || urlStr === blockPage) {
    return;
  }
  const url = new URL(urlStr);
  if (url.protocol != "http:" && url.protocol != "https:") {
    return;
  }

  chrome.storage.local.get(["currentMode"], function (local) {
    const { currentMode } = local;
    if (!currentMode) {
      return;
    }
    chrome.storage.sync.get(["modes"], function (sync) {
      const { modes } = sync;
      const mode = modes[currentMode];
      if (!mode) {
        // TODO error handling
        bkg.console.log("unknown mode", currentMode);
        return;
      }
      for (const allow of mode.allow) {
        const re = new RegExp(allow);
        bkg.console.log("testing", allow, url, re.test(url));
        if (re.test(url)) {
          // allowed
          return;
        }
      }
      // denied
      chrome.tabs.update(tabId, { url: blockPage });
    });
  });
});
