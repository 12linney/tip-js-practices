const PRIORITIES = ["low", "medium", "high"];
function validateId(id) {
  if (!Number.isSafeInteger(id) || id <= 0) {
    return "Идентификатор должен быть положительным безопасным целым числом";
  }
  return null;
}

function normalizeTitle(value) {
  if (typeof value !== "string") {
    return { ok: false, error: "Название должно быть строкой" };
  }
  const title = value.trim();
  if (title.length === 0) {
    return { ok: false, error: "Название не должно быть пустым" };
  }
  if (title.length > 100) {
    return { ok: false, error: "Название не должно быть длиннее 100 символов" };
  }
  return { ok: true, title };
}

export function createTask(id, title, priority = "medium") {
  const idError = validateId(id);
  if (idError !== null) {
    return { ok: false, error: idError };
    };

    const titleResult = normalizeTitle(title);
  if (!titleResult.ok) {
    return titleResult;
  }

  if (!PRIORITIES.includes(priority)) {
    return { ok: false, error: 'Приоритет должен быть "low", "medium" или "high"' };
  }

  return {
    ok: true,
    task: { id, title: titleResult.title, completed: false, priority },
  };
}

export function findTaskById(tasks, id) {
  return tasks.find((task) => task.id === id);
}

export function getPendingTasks(tasks) {
  return tasks.filter((task) => task.completed === false);
}

export function getTaskTitles(tasks) {
  return tasks.map((task) => task.title);
}

export function getTaskStats(tasks) {
  const total = tasks.length;
  let completed = 0;

  for (const task of tasks) {
    if (task.completed === true) {
      completed += 1;
    }
  }

  const pending = total - completed;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return { total, completed, pending, progress };
}

export function addTask(tasks, id, title, priority = "medium") {
  const created = createTask(id, title, priority);
  if (!created.ok) {
    return created;
  }

  if (findTaskById(tasks, id) !== undefined) {
    return { ok: false, error: `Задача с id = ${id} уже существует` };
  }

  return { ok: true, tasks: [...tasks, created.task] };
}

export function setTaskCompleted(tasks, id, completed) {
  const idError = validateId(id);
  if (idError !== null) {
    return { ok: false, error: idError };
  }

  if (typeof completed !== "boolean") {
    return { ok: false, error: "Признак выполнения должен быть true или false" };
  }

  if (findTaskById(tasks, id) === undefined) {
    return { ok: false, error: `Задача с id = ${id} не найдена` };
  }

  const updated = tasks.map((task) =>
    task.id === id ? { ...task, completed } : task
  );
  return { ok: true, tasks: updated };
}

export function renameTask(tasks, id, title) {
  const idError = validateId(id);
  if (idError !== null) {
    return { ok: false, error: idError };
  }

  const titleResult = normalizeTitle(title);
  if (!titleResult.ok) {
    return titleResult;
  }

  if (findTaskById(tasks, id) === undefined) {
    return { ok: false, error: `Задача с id = ${id} не найдена` };
  }

  const updated = tasks.map((task) =>
    task.id === id ? { ...task, title: titleResult.title } : task
  );
  return { ok: true, tasks: updated };
}

export function removeTask(tasks, id) {
  const idError = validateId(id);
  if (idError !== null) {
    return { ok: false, error: idError };
  }

  if (findTaskById(tasks, id) === undefined) {
    return { ok: false, error: `Задача с id = ${id} не найдена` };
  }

  return { ok: true, tasks: tasks.filter((task) => task.id !== id) };
}