// popup.js
// -----------------------------------------------------------------------
// FocusCapsule — popup script
//
// Lets the user add/remove scheduled focus checkpoints. Tasks are stored
// in chrome.storage.local under "focusTasks" as an array of
// { id, title, time } — "time" is a 24hr "HH:MM" string.
//
// Every change notifies background.js so it can reschedule alarms.
// -----------------------------------------------------------------------

const form = document.getElementById("fc-task-form");
const titleInput = document.getElementById("fc-task-title");
const timeInput = document.getElementById("fc-task-time");
const listEl = document.getElementById("fc-task-list");

document.addEventListener("DOMContentLoaded", loadAndRenderTasks);

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const time = timeInput.value; // "HH:MM" from the native time picker

  if (!title || !time) return;

  addTask({ id: crypto.randomUUID(), title, time });
  form.reset();
  titleInput.focus();
});

function loadAndRenderTasks() {
  chrome.storage.local.get({ focusTasks: [] }, ({ focusTasks }) => {
    renderTasks(focusTasks);
  });
}

function addTask(task) {
  chrome.storage.local.get({ focusTasks: [] }, ({ focusTasks }) => {
    const updated = [...focusTasks, task];
    saveTasks(updated);
  });
}

function deleteTask(taskId) {
  chrome.storage.local.get({ focusTasks: [] }, ({ focusTasks }) => {
    const updated = focusTasks.filter((t) => t.id !== taskId);
    saveTasks(updated);
  });
}

function saveTasks(tasks) {
  chrome.storage.local.set({ focusTasks: tasks }, () => {
    renderTasks(tasks);
    // Tell background.js to recompute alarms now that tasks changed.
    chrome.runtime.sendMessage({ type: "FOCUS_CAPSULE_TASKS_UPDATED" });
  });
}

function renderTasks(tasks) {
  listEl.innerHTML = "";

  if (tasks.length === 0) {
    const empty = document.createElement("li");
    empty.className = "fc-empty";
    empty.textContent = "No checkpoints yet — add one above.";
    listEl.appendChild(empty);
    return;
  }

  const sorted = [...tasks].sort((a, b) => a.time.localeCompare(b.time));

  sorted.forEach((task) => {
    const item = document.createElement("li");
    item.className = "fc-task-item";
    item.innerHTML = `
      <span class="fc-task-time">${formatTime(task.time)}</span>
      <span class="fc-task-title"></span>
      <button class="fc-task-delete" aria-label="Delete checkpoint">×</button>
    `;
    // Set title via textContent (not innerHTML) to avoid any injection risk
    // from user-entered task names.
    item.querySelector(".fc-task-title").textContent = task.title;
    item
      .querySelector(".fc-task-delete")
      .addEventListener("click", () => deleteTask(task.id));

    listEl.appendChild(item);
  });
}

// Renders "14:30" as "2:30 PM" for readability.
function formatTime(time24) {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}
