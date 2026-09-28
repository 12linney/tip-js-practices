"use strict";

const totalTasks = 7;
const completedTasks = 2;

let percent = completedTasks / totalTasks * 100;
console.log(`Всего задач: ${totalTasks}`)
console.log(`Выполнено: ${completedTasks}`)
console.log("Осталось: ", totalTasks - completedTasks)
console.log(`Прогресс: ${percent}`);

if ((0 > totalTasks > 1000) && (0 > completedTasks > totalTasks)){
    console.log("Ошибка: Недопустимые значения");
}
else if ((totalTasks === completedTasks) && (totalTasks === 0)){
    console.log("Статус: Задач пока нет");
}
else {
    if (totalTasks!=0){
        if (completedTasks === 0){
            console.log("Статус: Не начато");
        }
        else if (completedTasks != totalTasks){
            console.log("Статус: В работе");
        }
        else {
            console.log("Статус: Завершено");
        }
    }
}