import { ApiError } from "./api-client.js";

const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);
const ALLOWED_FILTERS = new Set(["completed", "priority", "categoryId", "q"]);

function invalidResponse(message) {
  return new ApiError(message, { kind: "invalid-response" });
}

function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

export function isTask(value) {
  return Boolean(
    value
    && typeof value === "object"
    && isPositiveSafeInteger(value.id)
    && typeof value.title === "string"
    && value.title.trim().length >= 1
    && value.title.trim().length <= 100
    && typeof value.completed === "boolean"
    && ALLOWED_PRIORITIES.has(value.priority)
    && isPositiveSafeInteger(value.categoryId),
  );
}

export function isCategory(value) {
  return Boolean(
    value
    && typeof value === "object"
    && isPositiveSafeInteger(value.id)
    && typeof value.name === "string"
    && value.name.trim().length >= 1
    && value.name.trim().length <= 100,
  );
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Принимает только completed, priority, categoryId и q. Значения false сохраняются.
function normalizeFilters(filters = {}) {
  if (!isPlainObject(filters)) {
    throw new TypeError("filters должен быть обычным объектом.");
  }
  const result = {};
  for (const [name, value] of Object.entries(filters)) {
    if (!ALLOWED_FILTERS.has(name)) {
      throw new TypeError(`Неизвестный фильтр: ${name}.`);
    }
    if (value === undefined) continue;

    if (name === "completed") {
      if (typeof value !== "boolean") throw new TypeError("completed должен быть boolean.");
      result.completed = value;
    } else if (name === "priority") {
      if (!ALLOWED_PRIORITIES.has(value)) throw new TypeError("priority должен быть low, medium или high.");
      result.priority = value;
    } else if (name === "categoryId") {
      if (!isPositiveSafeInteger(value)) throw new TypeError("categoryId должен быть положительным целым числом.");
      result.categoryId = value;
    } else {
      if (typeof value !== "string") throw new TypeError("q должен быть строкой.");
      const text = value.trim();
      if (text.length > 100) throw new TypeError("q не должен быть длиннее 100 символов.");
      if (text !== "") result.q = text;
    }
  }
  return result;
}

function checkCollection(payload, isItem, itemName) {
  if (!isPlainObject(payload) || !Array.isArray(payload.data)) {
    throw invalidResponse(`Ответ не содержит массив data (${itemName}).`);
  }
  const ids = new Set();
  for (const item of payload.data) {
    if (!isItem(item)) throw invalidResponse(`Элемент ответа не соответствует схеме (${itemName}).`);
    if (ids.has(item.id)) throw invalidResponse(`В ответе повторяется id ${item.id} (${itemName}).`);
    ids.add(item.id);
  }
  if (!isPlainObject(payload.meta) || payload.meta.total !== payload.data.length) {
    throw invalidResponse(`meta.total не совпадает с длиной data (${itemName}).`);
  }
  return payload;
}

function checkId(id) {
  if (!isPositiveSafeInteger(id)) {
    throw new TypeError("id должен быть положительным целым числом.");
  }
}

function pick(source, names, label) {
  if (!isPlainObject(source)) {
    throw new TypeError(`${label} должен быть обычным объектом.`);
  }
  for (const name of Object.keys(source)) {
    if (!names.includes(name)) throw new TypeError(`Неизвестное поле: ${name}.`);
  }
  const result = {};
  for (const name of names) {
    if (source[name] !== undefined) result[name] = source[name];
  }
  return result;
}

// Любая задача из ответа проверяется до передачи интерфейсу.
function extractTask(payload, expectedId = null) {
  if (!isPlainObject(payload) || !isTask(payload.data)) {
    throw invalidResponse("Ответ не содержит корректную задачу.");
  }
  if (expectedId !== null && payload.data.id !== expectedId) {
    throw invalidResponse("Ответ содержит задачу с другим id.");
  }
  return payload.data;
}

// Методы результата:
// getTasks, getTaskById, getCategories, loadInitialData, createTask, updateTask,
// setTaskCompleted, deleteTask и resetDemoData.
// Последний аргумент каждого метода данных — { signal }.
export function createTaskApi(client) {
  if (!client || typeof client.requestJson !== "function") {
    throw new TypeError("client должен содержать функцию requestJson.");
  }

  async function getTasks(filters = {}, { signal } = {}) {
    const query = normalizeFilters(filters);
    const payload = await client.requestJson("/tasks", { query, signal });
    checkCollection(payload, isTask, "задачи");
    if (!isPlainObject(payload.meta.filters)) {
      throw invalidResponse("meta.filters должен быть объектом.");
    }
    return { tasks: payload.data, meta: payload.meta };
  }

  async function getTaskById(id, { signal } = {}) {
    checkId(id);
    const payload = await client.requestJson(`/tasks/${id}`, { signal });
    return extractTask(payload, id);
  }

  async function getCategories({ signal } = {}) {
    const payload = await client.requestJson("/categories", { signal });
    checkCollection(payload, isCategory, "категории");
    return payload.data;
  }

  async function loadInitialData(filters = {}, { signal } = {}) {
    // Фильтры проверяются до начала любого запроса.
    const query = normalizeFilters(filters);
    // Оба запроса начинаются до общего await: ресурсы независимы.
    const tasksPromise = getTasks(query, { signal });
    const categoriesPromise = getCategories({ signal });
    const [{ tasks, meta }, categories] = await Promise.all([tasksPromise, categoriesPromise]);
    return { tasks, categories, meta };
  }

  async function createTask(draft, { signal } = {}) {
    const body = pick(draft, ["title", "priority", "categoryId"], "draft");
    const payload = await client.requestJson("/tasks", { method: "POST", body, signal });
    return extractTask(payload);
  }

  async function updateTask(id, changes, { signal } = {}) {
    checkId(id);
    const body = pick(changes, ["title", "priority", "categoryId", "completed"], "changes");
    if (Object.keys(body).length === 0) {
      throw new TypeError("changes должен содержать хотя бы одно поле.");
    }
    const payload = await client.requestJson(`/tasks/${id}`, { method: "PATCH", body, signal });
    return extractTask(payload, id);
  }

  async function setTaskCompleted(id, value, { signal } = {}) {
    checkId(id);
    if (typeof value !== "boolean") {
      throw new TypeError("completed должен быть boolean.");
    }
    const payload = await client.requestJson(`/tasks/${id}`, {
      method: "PATCH",
      body: { completed: value },
      signal,
    });
    return extractTask(payload, id);
  }

  async function deleteTask(id, { signal } = {}) {
    checkId(id);
    const result = await client.requestJson(`/tasks/${id}`, { method: "DELETE", signal });
    // Успешное удаление — ответ 204, который клиент преобразует в null.
    if (result !== null) {
      throw invalidResponse("Ответ на удаление должен быть без тела (204).");
    }
    return null;
  }

  async function resetDemoData({ signal } = {}) {
    const payload = await client.requestJson("/debug/reset", { method: "POST", signal });
    const data = payload?.data;
    if (!isPlainObject(payload) || !isPlainObject(data)
      || data.reset !== true || !Number.isSafeInteger(data.total) || data.total < 0) {
      throw invalidResponse("Ответ сброса данных не соответствует контракту.");
    }
    return data;
  }

  return {
    getTasks,
    getTaskById,
    getCategories,
    loadInitialData,
    createTask,
    updateTask,
    setTaskCompleted,
    deleteTask,
    resetDemoData,
  };
}
