import { getTaskStats } from "./task-service.js";

const PRIORITY_LABELS = { low: "Низкий", medium: "Средний", high: "Высокий" };

function createTextElement(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = text;
  return el;
}

function createActionButton(action, labelText) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.action = action;
  button.append(createTextElement("span", "action-label", labelText));
  return button;
}

export function createTaskElement(task) {
  const card = document.createElement("li");
  card.className = "task-card";
  if (task.completed) card.classList.add("is-completed");
  card.dataset.taskId = String(task.id);

  const title = createTextElement("h3", "task-title", task.title);
  const status = createTextElement(
    "span",
    "task-status",
    task.completed ? "Выполнена" : "В работе"
  );
  const priority = createTextElement(
    "span",
    "task-priority",
    PRIORITY_LABELS[task.priority] ?? task.priority
  );

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const toggleButton = createActionButton("toggle", "Выполнена");
  toggleButton.setAttribute("aria-pressed", String(task.completed));

  const deleteButton = createActionButton("delete", "Удалить");

  actions.append(toggleButton, deleteButton);
  card.append(title, status, priority, actions);
  return card;
}

export function renderTaskList(listElement, tasks) {
  listElement.replaceChildren(...tasks.map((task) => createTaskElement(task)));
}

export function renderSummary(summaryElement, tasks, visibleCount) {
  const stats = getTaskStats(tasks);
  const set = (name, value) => {
    summaryElement.querySelector(`[data-stat="${name}"]`).textContent = String(value);
  };

  set("total", stats.total);
  set("completed", stats.completed);
  set("pending", stats.pending);
  set("progress", `${stats.progress.toFixed(1)}%`);
  set("visible", visibleCount);
}

export function renderEmptyState(messageElement, total, visibleCount) {
  if (visibleCount > 0) {
    messageElement.textContent = "";
    messageElement.hidden = true;
    return;
  }
  messageElement.textContent =
    total === 0 ? "Список задач пуст." : "Нет задач по выбранному фильтру.";
  messageElement.hidden = false;
}