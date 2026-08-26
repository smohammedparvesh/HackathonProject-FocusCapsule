// content.js
const OVERLAY_ID = "fc-overlay";
const STYLE_ID = "fc-styles";
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "FOCUS_CAPSULE_BLOCK") {
    showOverlay(getVariantConfig(message));
  } else if (message.type === "FOCUS_CAPSULE_UNLOCK_ALL") {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) removeOverlay(overlay);
  }
});

function getVariantConfig(message) {
  if (message.variant === "task") {
    const taskTitle = message.taskTitle || "your scheduled task";
    return {
      icon: "⏰",
      headline: `Time to focus: "${taskTitle}"`,
      subtext: "Confirm you're starting this task. All tabs stay paused until you do.",
      checkLabel: "I'm starting this task now",
      continueLabel: "Start Task",
    };
  }
  return {
    icon: "🛑",
    headline: "Hold on — Do Productive Work.",
    subtext: "Confirm before you switch tasks. All tabs stay paused until you do.",
    checkLabel: "I've finished Your conversation",
    continueLabel: "Continue..",
  };
}

function showOverlay(config) {
  if (document.getElementById(OVERLAY_ID)) return;
  injectStyles();
  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.innerHTML = `
    <div class="fc-card" role="alertdialog" aria-live="assertive">
      <div class="fc-icon">${config.icon}</div>
      <p class="fc-eyebrow">FocusCapsule</p>
      <h1 class="fc-headline"></h1>
      <p class="fc-subtext"></p>
      <label class="fc-check-row" for="fc-confirm-check">
        <input type="checkbox" id="fc-confirm-check" class="fc-checkbox" />
        <span class="fc-check-label"></span>
      </label>
      <button class="fc-continue" id="fc-continue-btn" disabled></button>
    </div>
  `;
  overlay.querySelector(".fc-headline").textContent = config.headline;
  overlay.querySelector(".fc-subtext").textContent = config.subtext;
  overlay.querySelector(".fc-check-label").textContent = config.checkLabel;
  overlay.querySelector("#fc-continue-btn").textContent = config.continueLabel;
  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => overlay.classList.add("fc-visible"));
  wireControls(overlay);
}

function wireControls(overlay) {
  const checkbox = overlay.querySelector("#fc-confirm-check");
  const continueBtn = overlay.querySelector("#fc-continue-btn");
  checkbox.addEventListener("change", () => {
    continueBtn.disabled = !checkbox.checked;
  });
  continueBtn.addEventListener("click", () => {
    if (continueBtn.disabled) return;
    removeOverlay(overlay);
    chrome.runtime.sendMessage({ type: "FOCUS_CAPSULE_UNLOCK" });
  });
}

function removeOverlay(overlay) {
  overlay.classList.remove("fc-visible");
  setTimeout(() => {
    overlay.remove();
    document.body.style.overflow = "";
  }, 200);
}

function injectStyles(){
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${OVERLAY_ID} {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      box-sizing: border-box;
      background: radial-gradient(circle at 50% 30%, #262C52 0%, #14172E 70%);
      opacity: 0;
      transition: opacity 0.25s ease;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    #${OVERLAY_ID}.fc-visible {
      opacity: 1;
    }
    #${OVERLAY_ID} .fc-card {
      width: 100%;
      max-width: 420px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 28px;
      padding: 40px 32px 32px;
      text-align: center;
      backdrop-filter: blur(6px);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
      transform: translateY(12px) scale(0.98);
      transition: transform 0.3s ease;
    }
    #${OVERLAY_ID}.fc-visible .fc-card {
      transform: translateY(0) scale(1);
    }
    #${OVERLAY_ID} .fc-icon {
      font-size: 40px;
      margin-bottom: 16px;
    }
    #${OVERLAY_ID} .fc-eyebrow {
      margin: 0 0 10px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #5EEAD4;
    }
    #${OVERLAY_ID} .fc-headline {
      margin: 0 0 10px;
      font-size: 22px;
      line-height: 1.35;
      font-weight: 700;
      color: #F5F3FF;
    }
    #${OVERLAY_ID} .fc-subtext {
      margin: 0 0 26px;
      font-size: 14px;
      color: #94A3B8;
    }
    #${OVERLAY_ID} .fc-check-row {
      display: flex;
      align-items: center;
      gap: 10px;
      justify-content: center;
      margin-bottom: 24px;
      font-size: 14px;
      color: #E2E8F0;
      cursor: pointer;
      user-select: none;
    }
    #${OVERLAY_ID} .fc-checkbox {
      width: 18px;
      height: 18px;
      accent-color: #5EEAD4;
      cursor: pointer;
      flex-shrink: 0;
    }
    #${OVERLAY_ID} .fc-continue {
      padding: 13px 28px;
      font-size: 15px;
      font-weight: 600;
      color: #14172E;
      background: #5EEAD4;
      border: none;
      border-radius: 999px;
      cursor: pointer;
      transition: background 0.15s ease, opacity 0.15s ease;
    }
    #${OVERLAY_ID} .fc-continue:not(:disabled):hover {
      background: #7FF3DE;
    }
    #${OVERLAY_ID} .fc-continue:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    @media (prefers-reduced-motion: reduce) {
      #${OVERLAY_ID}, #${OVERLAY_ID} .fc-card {
        transition: none;
      }
    }`;
  document.head.appendChild(style);
}
