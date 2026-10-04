import { ApiError } from "./api-client.js";
import { validateTaskDraft } from "./form-validation.js";

export function messageForError(error) {
  if (!(error instanceof ApiError)) return "Не удалось выполнить операцию.";
  if (error.kind === "timeout") return "Сервер не ответил вовремя. Попробуйте ещё раз.";
  if (error.kind === "network") return "Нет соединения с учебным API. Проверьте, запущен ли npm start.";
  if (error.kind === "invalid-response") return "Сервер вернул ответ неожиданного формата.";
  if (error.kind === "http" && error.status === 404) return "Запись уже отсутствует на сервере. Обновите список.";
  if (error.kind === "http") return error.message || `Сервер вернул ошибку ${error.status}.`;
  return "Не удалось выполнить операцию.";
}

const API_METHODS = [
  "loadInitialData", "getTasks", "createTask", "updateTask",
  "setTaskCompleted", "deleteTask", "resetDemoData",
];
const VIEW_METHODS = [
  "setListState", "setTasks", "setCategories", "setTotal",
  "setFormTask", "showFormErrors", "setMutationPending", "notify",
];

function requireMethods(target, names, label) {
  if (!target || typeof target !== "object") {
    throw new TypeError(`${label} должен быть объектом.`);
  }
  for (const name of names) {
    if (typeof target[name] !== "function") {
      throw new TypeError(`${label}.${name} должен быть функцией.`);
    }
  }
}

// view — адаптер из dom-app.js. Контроллер не должен обращаться к document.
// Обязательные методы результата:
// start, applyFilters, refresh, submit, beginEdit, cancelEdit,
// toggleTask, deleteTask, resetData и destroy.
export function createAppController({ api, view, validateDraft = validateTaskDraft } = {}) {
  requireMethods(api, API_METHODS, "api");
  requireMethods(view, VIEW_METHODS, "view");
  if (typeof validateDraft !== "function") {
    throw new TypeError("validateDraft должен быть функцией.");
  }

  // Состояние приложения.
  let tasks = [];
  let categories = null; // null — категории ещё не получены
  let filters = {};
  let editingId = null;

  // Защита от устаревших ответов: отмена запроса и номер последней загрузки.
  let loadController = null;
  let loadSeq = 0;
  let mutating = false;
  let destroyed = false;

  function isCancellation(error) {
    return error instanceof ApiError && error.kind === "aborted";
  }

  // Загрузка списка. Если категории ещё не получены, выполняется начальная
  // загрузка (задачи и категории), иначе запрашиваются только задачи.
  async function load() {
    if (destroyed) return false;
    loadController?.abort();
    const controller = new AbortController();
    loadController = controller;
    loadSeq += 1;
    const seq = loadSeq;
    const isCurrent = () => seq === loadSeq && !controller.signal.aborted && !destroyed;

    view.setListState("loading");
    const requestFilters = { ...filters };
    try {
      let result;
      if (categories === null) {
        result = await api.loadInitialData(requestFilters, { signal: controller.signal });
      } else {
        result = await api.getTasks(requestFilters, { signal: controller.signal });
      }
      // Ответ не применяется, если за время ожидания начался новый запрос.
      if (!isCurrent()) return false;

      if (result.categories) {
        categories = result.categories;
        view.setCategories(categories);
      }
      tasks = result.tasks;
      view.setTasks(tasks, categories ?? []);
      view.setTotal(result.meta.total);
      view.setListState(tasks.length === 0 ? "empty" : "ready");
      return true;
    } catch (error) {
      if (!isCurrent() || isCancellation(error)) return false;
      view.setListState("error", messageForError(error));
      return false;
    } finally {
      if (loadController === controller && seq === loadSeq) loadController = null;
    }
  }

  function resetForm() {
    editingId = null;
    view.setFormTask(null);
    view.showFormErrors({});
  }

  // Общая схема изменения данных: блокировка, запрос, сообщение, обновление списка.
  async function mutate(action, successMessage) {
    if (destroyed || mutating) return false;
    mutating = true;
    view.notify("");
    view.setMutationPending(true);
    let ok = false;
    try {
      await action();
      ok = true;
      view.notify(successMessage, "success");
      // Список берётся у сервера заново, а не правится локально.
      await load();
    } catch (error) {
      if (!ok) {
        view.notify(messageForError(error), "error");
        // Запись уже удалена другим способом: синхронизируем список.
        if (error instanceof ApiError && error.kind === "http" && error.status === 404) {
          await load();
        }
      }
    } finally {
      mutating = false;
      view.setMutationPending(false);
    }
    return ok;
  }

  return {
    start(initialFilters = {}) {
      filters = { ...initialFilters };
      return load();
    },

    applyFilters(newFilters = {}) {
      filters = { ...newFilters };
      return load();
    },

    refresh() {
      return load();
    },

    async submit(draft) {
      if (destroyed || mutating) return false;
      const result = validateDraft(draft, categories ?? []);
      view.showFormErrors(result.errors);
      if (!result.valid) return false;

      const value = result.value;
      if (editingId !== null) {
        const id = editingId;
        return mutate(async () => {
          await api.updateTask(id, value);
          resetForm();
        }, "Изменения сохранены.");
      }
      return mutate(async () => {
        await api.createTask(value);
        resetForm();
      }, "Задача добавлена.");
    },

    beginEdit(id) {
      const task = tasks.find((item) => item.id === id);
      if (!task) return;
      editingId = id;
      view.setFormTask(task);
      view.showFormErrors({});
    },

    cancelEdit() {
      resetForm();
    },

    async toggleTask(id) {
      const task = tasks.find((item) => item.id === id);
      if (!task) return false;
      const next = !task.completed;
      return mutate(() => api.setTaskCompleted(id, next), "Статус задачи изменён.");
    },

    async deleteTask(id) {
      return mutate(async () => {
        await api.deleteTask(id);
        if (editingId === id) resetForm();
      }, "Задача удалена.");
    },

    async resetData() {
      return mutate(async () => {
        await api.resetDemoData();
        resetForm();
      }, "Учебные данные восстановлены.");
    },

    destroy() {
      destroyed = true;
      loadSeq += 1;
      loadController?.abort();
      loadController = null;
    },
  };
}
