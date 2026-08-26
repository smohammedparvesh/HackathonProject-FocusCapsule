// background.js
const GMAIL_HOSTNAME = "mail.google.com";
const TASK_ALARM_PREFIX = "focusTask-";

let locked = false;
let activeBlockInfo = null; 

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError || !tab || !tab.url) return;
    if (isGmailTab(tab.url)) startFocusLock({ variant: "gmail" });
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;

  if (tab.active && isGmailTab(tab.url)) {
    startFocusLock({ variant: "gmail" });
    return;
  }

  if (locked && isBlockableUrl(tab.url)) {
    notifyContentScript(tabId, "FOCUS_CAPSULE_BLOCK", activeBlockInfo);
  }
});


chrome.runtime.onInstalled.addListener(rescheduleAllTaskAlarms);
chrome.runtime.onStartup.addListener(rescheduleAllTaskAlarms);

chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm.name.startsWith(TASK_ALARM_PREFIX)) return;

  const taskId = alarm.name.slice(TASK_ALARM_PREFIX.length);

  chrome.storage.local.get({ focusTasks: [] }, ({ focusTasks }) => {
    const task = focusTasks.find((t) => t.id === taskId);
    if (!task) return;

    startFocusLock({ variant: "task", taskTitle: task.title });

    chrome.alarms.create(alarm.name, { when: nextOccurrence(task.time) });
  });
});


function rescheduleAllTaskAlarms() {
  chrome.alarms.getAll((alarms) => {
    alarms
      .filter((a) => a.name.startsWith(TASK_ALARM_PREFIX))
      .forEach((a) => chrome.alarms.clear(a.name));

    chrome.storage.local.get({ focusTasks: [] }, ({ focusTasks }) => {
      focusTasks.forEach((task) => {
        chrome.alarms.create(TASK_ALARM_PREFIX + task.id, {
          when: nextOccurrence(task.time),
        });
      });
    });
  });
}

function nextOccurrence(time24) {
  const [hours, minutes] = time24.split(":").map(Number);
  const next = new Date();
  next.setHours(hours, minutes, 0, 0);
  if (next.getTime() <= Date.now()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime();
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "FOCUS_CAPSULE_TASKS_UPDATED") {
    rescheduleAllTaskAlarms();
  } else if (message.type === "FOCUS_CAPSULE_UNLOCK") {
    endFocusLock();
  }
});

function startFocusLock(info) {
  if (locked) return; 
  locked = true;
  activeBlockInfo = info;

  chrome.tabs.query({}, (tabs) => {
    if (chrome.runtime.lastError || !tabs) return;
    tabs.forEach((tab) => {
      if (isBlockableUrl(tab.url)) {
        notifyContentScript(tab.id, "FOCUS_CAPSULE_BLOCK", activeBlockInfo);
      }
    });
  });
}

function endFocusLock() {
  if (!locked) return;
  locked = false;
  activeBlockInfo = null;

  chrome.tabs.query({}, (tabs) => {
    if (chrome.runtime.lastError || !tabs) return;
    tabs.forEach((tab) => {
      if (isBlockableUrl(tab.url)) {
        notifyContentScript(tab.id, "FOCUS_CAPSULE_UNLOCK_ALL", {});
      }
    });
  });
}

function isGmailTab(url) {
  try {
    return new URL(url).hostname === GMAIL_HOSTNAME;
  } catch (e) {
    return false;
  }
}

function isBlockableUrl(url) {
  if (!url) return false;
  return url.startsWith("http://") || url.startsWith("https://");
}

function notifyContentScript(tabId, type, extra = {}) {
  chrome.tabs.sendMessage(tabId, { type, ...extra }, () => {
    if (chrome.runtime.lastError) {
      console.log("FocusCapsule: content script not ready on tab", tabId);
    }
  });
}
