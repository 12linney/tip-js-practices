export const STORAGE_VERSION = 1;

const PRIORITIES = ["low", "medium", "high"];
const copyTasks = (tasks) => tasks.map((task) => ({ ...task }));

// Все функции принимают объект storage явно, чтобы их можно было проверить
// без обращения к глобальному window.localStorage.

export function isValidTaskList(value) {
  if (!Array.isArray(value)) return false;
  const ids = new Set();
  for (const task of value) {
    if (typeof task !== "object" || task === null || Array.isArray(task)) return false;
    if (!Number.isSafeInteger(task.id) || task.id <= 0 || ids.has(task.id)) return false;
    ids.add(task.id);
    if (
      typeof task.title !== "string" ||
      task.title !== task.title.trim() ||
      task.title.length === 0 ||
      task.title.length > 100
    ) return false;
    if (typeof task.completed !== "boolean") return false;
    if (!PRIORITIES.includes(task.priority)) return false;
  }
  return true;
}

export function loadTasks(storage, key, fallbackTasks) {
  const fallback = () => copyTasks(fallbackTasks);
  try {
    const raw = storage.getItem(key);
    if (raw === null) return { ok: true, source: "initial", tasks: fallback() };

    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || parsed.version !== STORAGE_VERSION) {
      return { ok: false, source: "fallback", tasks: fallback(),
        error: "Сохранённые данные имеют неизвестную версию; используется исходный набор." };
    }
    if (!isValidTaskList(parsed.tasks)) {
      return { ok: false, source: "fallback", tasks: fallback(),
        error: "Сохранённые данные не соответствуют схеме; используется исходный набор." };
    }
    return { ok: true, source: "storage", tasks: copyTasks(parsed.tasks) };
  } catch (error) {
    return { ok: false, source: "fallback", tasks: fallback(),
      error: `Не удалось прочитать сохранённые данные (${error.message}); используется исходный набор.` };
  }
}

export function saveTasks(storage, key, tasks) {
  if (!isValidTaskList(tasks)) {
    return { ok: false, error: "Список задач некорректен и не был сохранён." };
  }
  try {
    storage.setItem(key, JSON.stringify({ version: STORAGE_VERSION, tasks }));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: `Не удалось сохранить данные: ${error.message}. После перезагрузки изменения могут быть потеряны.` };
  }
}

export function removeSavedTasks(storage, key) {
  try {
    storage.removeItem(key);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: `Не удалось удалить сохранённые данные: ${error.message}.` };
  }
}
