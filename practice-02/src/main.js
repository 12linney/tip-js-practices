import { demoTasks, variantNumber, variantTasks } from "./data.js";
import {
  addTask,
  setTaskCompleted,
  renameTask,
  removeTask,
  findTaskById,
  getPendingTasks,
  getTaskTitles,
  getTaskStats,
} from "./task-service.js";

function printStats(label, tasks) {
  const { total, completed, pending, progress } = getTaskStats(tasks);
  console.log(`[${label}] Всего: ${total}; выполнено: ${completed}; осталось: ${pending}`);
  if (total === 0) {
    console.log("Задач пока нет");
  } else {
    console.log(`Прогресс: ${progress.toFixed(1)}%`);
  }
}

// Состояние заменяется только при ok === true
function apply(label, tasks, result) {
  if (result.ok) {
    console.log(`✔ ${label}`);
    return result.tasks;
  }
  console.error(`✘ ${label} — ошибка: ${result.error}`);
  return tasks;
}

console.log("Общий сценарий (demoTasks)");

// Исходное состояние
console.log("Исходные задачи:", demoTasks);
console.log("Названия:", getTaskTitles(demoTasks));
console.log("Невыполненные id:", getPendingTasks(demoTasks).map((t) => t.id));
console.log("Задача с id = 4:", findTaskById(demoTasks, 4));
printStats("исходный набор", demoTasks);

let currentTasks = demoTasks;

// Добавление
currentTasks = apply("Добавлена задача id = 20", currentTasks,
  addTask(currentTasks, 20, "Добавить проверку", "high"));
printStats("после добавления id = 20", currentTasks);

// Изменение статуса
currentTasks = apply("Задача id = 4 выполнена", currentTasks,
  setTaskCompleted(currentTasks, 4, true));
printStats("после выполнения id = 4", currentTasks);

// Переименование
currentTasks = apply("Задача id = 10 переименована", currentTasks,
  renameTask(currentTasks, 10, "Подготовить инструкцию запуска"));
printStats("после переименования id = 10", currentTasks);

// Удаление
currentTasks = apply("Задача id = 7 удалена", currentTasks,
  removeTask(currentTasks, 7));
printStats("после удаления id = 7", currentTasks);

// Отказы (состояние не меняется)
const before = currentTasks;
currentTasks = apply("Повторное добавление id = 20", currentTasks,
  addTask(currentTasks, 20, "Дубликат"));
currentTasks = apply('Статус строкой "true"', currentTasks,
  setTaskCompleted(currentTasks, 4, "true"));
currentTasks = apply("Удаление отсутствующей id = 999", currentTasks,
  removeTask(currentTasks, 999));
console.log("Состояние после отказов не изменилось:", currentTasks === before);

console.log("Итоговые id:", currentTasks.map((t) => t.id));
console.log("Итоговые задачи:", currentTasks);
console.log("Невыполненные id:", getPendingTasks(currentTasks).map((t) => t.id));

console.log("demoTasks после сценария:", demoTasks);
console.log("В demoTasks по-прежнему 4 записи:", demoTasks.length === 4);
console.log("id = 4 в demoTasks всё ещё не выполнена:", demoTasks[1].completed === false);
console.log("Название id = 10 в demoTasks прежнее:", demoTasks[3].title);

// вариант 5
console.log(`\n=== Индивидуальный сценарий (вариант ${variantNumber}) ===`);

// Исходные данные и сводка
console.log("Исходные задачи:", variantTasks);
printStats("вариант: исходный набор", variantTasks);

let variantCurrent = variantTasks;

// Добавление id = 80 (приоритет medium по таблице варианта)
variantCurrent = apply("Добавлена задача id = 80", variantCurrent,
  addTask(variantCurrent, 80, "Подготовить презентацию прототипа", "medium"));
printStats("вариант: после добавления id = 80", variantCurrent);

// completed = true для id = 11
variantCurrent = apply("Задача id = 11: completed = true", variantCurrent,
  setTaskCompleted(variantCurrent, 11, true));
printStats("вариант: после установки статуса id = 11", variantCurrent);

// Переименование id = 23
variantCurrent = apply("Задача id = 23 переименована", variantCurrent,
  renameTask(variantCurrent, 23, "Утвердить структуру репозитория"));
printStats("вариант: после переименования id = 23", variantCurrent);

// Удаление id = 37
variantCurrent = apply("Задача id = 37 удалена", variantCurrent,
  removeTask(variantCurrent, 37));
printStats("вариант: после удаления id = 37", variantCurrent);

// Повторное добавление id = 80
const variantBefore = variantCurrent;
variantCurrent = apply("Повторное добавление id = 80", variantCurrent,
  addTask(variantCurrent, 80, "Дубликат", "medium"));
console.log("Список после отказа не изменился:", variantCurrent === variantBefore);

// Итог и сохранность variantTasks
console.log("Итоговые id:", variantCurrent.map((t) => t.id));
console.log("Итоговые задачи:", variantCurrent);
console.log("variantTasks: записей:", variantTasks.length,
  "| id:", variantTasks.map((t) => t.id));
console.log("variantTasks: id = 23 прежнее название:", variantTasks[1].title);
console.log("variantTasks: id = 37 на месте:", findTaskById(variantTasks, 37) !== undefined);
console.log("variantTasks: id = 80 отсутствует:", findTaskById(variantTasks, 80) === undefined);