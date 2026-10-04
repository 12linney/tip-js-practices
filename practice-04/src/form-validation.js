const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);

// Чистая проверка данных формы. DOM и показ сообщений выполняются в main.js.
export function validateTaskDraft(draft, tasks, editingId = null) {
  const errors = {};
  const list = Array.isArray(tasks) ? tasks : [];
  const source = draft ?? {};

  let id;
  if (editingId === null) {
    const raw = source.id;
    if (typeof raw === "number") id = raw;
    else if (typeof raw === "string" && raw.trim() !== "") id = Number(raw);

    if (id === undefined) {
      errors.id = "Введите идентификатор.";
    } else if (!Number.isSafeInteger(id) || id <= 0) {
      errors.id = "Идентификатор должен быть положительным целым числом.";
    } else if (list.some((task) => task.id === id)) {
      errors.id = "Задача с таким идентификатором уже существует.";
    }
  } else {
    id = editingId;
    if (!Number.isSafeInteger(id) || id <= 0 || !list.some((task) => task.id === id)) {
      errors.id = "Редактируемая задача не найдена.";
    }
  }

  let title = "";
  if (typeof source.title !== "string") {
    errors.title = "Название должно быть строкой.";
  } else {
    title = source.title.trim();
    if (title.length === 0) errors.title = "Введите название (не только пробелы).";
    else if (title.length > 100) errors.title = "Название не должно быть длиннее 100 символов.";
  }

  if (!ALLOWED_PRIORITIES.has(source.priority)) {
    errors.priority = "Выберите приоритет: low, medium или high.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { id, title, priority: source.priority } };
}
