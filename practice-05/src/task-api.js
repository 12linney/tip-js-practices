import { ApiError } from "./api-client.js";

const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);
const ALLOWED_FILTERS = new Set(["completed", "priority", "categoryId", "q"]);

function invalidResponse(message) {
  return new ApiError(message, { kind: "invalid-response" });
}

function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function isTask(value) {
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

function isCategory(value) {
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

// client — объект, созданный createApiClient.
// Контракт результата:
// getTasks(filters) -> Promise<{ tasks, meta }>
// getTaskById(id) -> Promise<task>
// getCategories() -> Promise<category[]>
// loadInitialData(filters) -> Promise<{ tasks, categories, meta }>
export function createTaskApi(client) {
  if (!client || typeof client.requestJson !== "function") {
    throw new TypeError("client должен содержать функцию requestJson.");
  }

  async function getTasks(filters = {}) {
    const query = normalizeFilters(filters);
    const payload = await client.requestJson("/tasks", { query });
    checkCollection(payload, isTask, "задачи");
    if (!isPlainObject(payload.meta.filters)) {
      throw invalidResponse("meta.filters должен быть объектом.");
    }
    return { tasks: payload.data, meta: payload.meta };
  }

  async function getTaskById(id) {
    if (!isPositiveSafeInteger(id)) {
      throw new TypeError("id должен быть положительным целым числом.");
    }
    const payload = await client.requestJson(`/tasks/${id}`);
    if (!isPlainObject(payload) || !isTask(payload.data) || payload.data.id !== id) {
      throw invalidResponse("Ответ не содержит запрошенную задачу.");
    }
    return payload.data;
  }

  async function getCategories() {
    const payload = await client.requestJson("/categories");
    checkCollection(payload, isCategory, "категории");
    return payload.data;
  }

  async function loadInitialData(filters = {}) {
    // Фильтры проверяются до начала любого запроса.
    const query = normalizeFilters(filters);
    // Оба запроса начинаются до общего await: ресурсы независимы.
    const tasksPromise = getTasks(query);
    const categoriesPromise = getCategories();
    const [{ tasks, meta }, categories] = await Promise.all([tasksPromise, categoriesPromise]);
    return { tasks, categories, meta };
  }

  return { getTasks, getTaskById, getCategories, loadInitialData };
}
