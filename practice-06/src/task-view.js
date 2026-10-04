const PRIORITY_LABELS = Object.freeze({
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
});

function textElement(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  return node;
}

function actionButton(action, label, description) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "button-secondary";
  button.dataset.action = action;
  button.setAttribute("aria-label", description);
  button.append(textElement("span", "action-label", label));
  return button;
}

export function createTaskElement(task, category) {
  const item = document.createElement("li");
  item.className = task.completed ? "task-card is-completed" : "task-card";
  item.dataset.taskId = String(task.id);

  // Пользовательский текст добавляется только через textContent.
  const title = textElement("h3", "task-title", task.title);

  const meta = document.createElement("div");
  meta.className = "task-meta";
  meta.append(
    textElement("span", "task-status", task.completed ? "Выполнена" : "В работе"),
    textElement("span", "task-priority", `Приоритет: ${PRIORITY_LABELS[task.priority] ?? task.priority}`),
    textElement("span", "task-category", category?.name ?? "Без категории"),
    textElement("span", "task-id", `№ ${task.id}`),
  );

  const actions = document.createElement("div");
  actions.className = "task-actions";
  actions.append(
    actionButton(
      "toggle",
      task.completed ? "Вернуть в работу" : "Выполнено",
      task.completed ? `Вернуть задачу № ${task.id} в работу` : `Отметить задачу № ${task.id} выполненной`,
    ),
    actionButton("edit", "Изменить", `Изменить задачу № ${task.id}`),
    actionButton("delete", "Удалить", `Удалить задачу № ${task.id}`),
  );

  item.append(title, meta, actions);
  return item;
}

export function renderTaskList(list, tasks, categories) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  // replaceChildren заменяет содержимое, поэтому карточки не накапливаются.
  list.replaceChildren(...tasks.map((task) => createTaskElement(task, byId.get(task.categoryId))));
}
