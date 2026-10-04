// Сервис задач: чистые функции без DOM и localStorage.
// Для предусмотренных ошибок возвращается { ok: false, error: "..." }.

const PRIORITIES = ["low", "medium", "high"];

const fail = (error) => ({ ok: false, error });

function checkId(id) {
  if (!Number.isSafeInteger(id) || id <= 0) {
    return "Идентификатор должен быть положительным целым числом.";
  }
  return null;
}

function normalizeTitle(title) {
  if (typeof title !== "string") return { error: "Название должно быть строкой." };
  const value = title.trim();
  if (value.length === 0 || value.length > 100) {
    return { error: "Название должно содержать от 1 до 100 символов." };
  }
  return { value };
}

function checkPriority(priority) {
  return PRIORITIES.includes(priority) ? null : "Приоритет должен быть low, medium или high.";
}

export function createTask(id, title, priority = "medium") {
  const idError = checkId(id);
  if (idError) return fail(idError);
  const normalized = normalizeTitle(title);
  if (normalized.error) return fail(normalized.error);
  const priorityError = checkPriority(priority);
  if (priorityError) return fail(priorityError);
  return { ok: true, task: { id, title: normalized.value, completed: false, priority } };
}

export function findTaskById(tasks, id) {
  return tasks.find((task) => task.id === id);
}

export function getPendingTasks(tasks) {
  return tasks.filter((task) => !task.completed);
}

export function getTaskTitles(tasks) {
  return tasks.map((task) => task.title);
}

export function getTaskStats(tasks) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  return {
    total,
    completed,
    pending: total - completed,
    progress: total === 0 ? 0 : (completed / total) * 100,
  };
}

export function addTask(tasks, id, title, priority = "medium") {
  const created = createTask(id, title, priority);
  if (!created.ok) return created;
  if (findTaskById(tasks, id)) return fail(`Задача с id ${id} уже существует.`);
  return { ok: true, tasks: [...tasks, created.task] };
}

function requireTask(tasks, id) {
  const idError = checkId(id);
  if (idError) return idError;
  return findTaskById(tasks, id) ? null : `Задача с id ${id} не найдена.`;
}

export function setTaskCompleted(tasks, id, completed) {
  if (typeof completed !== "boolean") return fail("Статус должен быть логическим значением.");
  const error = requireTask(tasks, id);
  if (error) return fail(error);
  return {
    ok: true,
    tasks: tasks.map((task) => (task.id === id ? { ...task, completed } : task)),
  };
}

export function renameTask(tasks, id, title) {
  const error = requireTask(tasks, id);
  if (error) return fail(error);
  const normalized = normalizeTitle(title);
  if (normalized.error) return fail(normalized.error);
  return {
    ok: true,
    tasks: tasks.map((task) => (task.id === id ? { ...task, title: normalized.value } : task)),
  };
}

export function removeTask(tasks, id) {
  const error = requireTask(tasks, id);
  if (error) return fail(error);
  return { ok: true, tasks: tasks.filter((task) => task.id !== id) };
}

export function updateTask(tasks, id, title, priority) {
  const error = requireTask(tasks, id);
  if (error) return fail(error);
  const normalized = normalizeTitle(title);
  if (normalized.error) return fail(normalized.error);
  const priorityError = checkPriority(priority);
  if (priorityError) return fail(priorityError);
  return {
    ok: true,
    tasks: tasks.map((task) =>
      task.id === id ? { ...task, title: normalized.value, priority } : task,
    ),
  };
}
