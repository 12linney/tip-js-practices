// Заготовка модуля. throw ниже отмечает отсутствие реализации,
// а не способ обработки некорректных данных в готовом решении.
// Для предусмотренных ошибок необходимо возвращать { ok: false, error: "..." }.
// console.log(), prompt(), document и чтение внешнего состояния здесь не нужны.

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