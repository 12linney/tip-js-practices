const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);

// Возвращает { valid, value, errors }.
// value содержит нормализованные title, priority и числовой categoryId.
export function validateTaskDraft(draft, categories) {
  const errors = {};
  const source = draft && typeof draft === "object" ? draft : {};

  const title = typeof source.title === "string" ? source.title.trim() : "";
  if (title.length === 0) {
    errors.title = "Введите название задачи.";
  } else if (title.length > 100) {
    errors.title = "Название не должно быть длиннее 100 символов.";
  }

  const priority = source.priority;
  if (!ALLOWED_PRIORITIES.has(priority)) {
    errors.priority = "Выберите приоритет: низкий, средний или высокий.";
  }

  // Значение select приходит строкой; пустая строка не должна превращаться в 0.
  const rawCategory = typeof source.categoryId === "string"
    ? source.categoryId.trim()
    : source.categoryId;
  const categoryId = typeof rawCategory === "string" && /^\d+$/.test(rawCategory)
    ? Number(rawCategory)
    : rawCategory;
  const known = Array.isArray(categories)
    && categories.some((category) => category.id === categoryId);
  if (!Number.isSafeInteger(categoryId) || !known) {
    errors.categoryId = "Выберите существующую категорию.";
  }

  const valid = Object.keys(errors).length === 0;
  return {
    valid,
    value: valid ? { title, priority, categoryId } : null,
    errors,
  };
}
