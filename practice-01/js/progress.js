"use strict";

const totalTasks = 12;
const completedTasks = 5;

let percent = completedTasks / totalTasks * 100;
console.log(`Всего задач: ${totalTasks}`)
console.log(`Выполнено: ${completedTasks}`)
console.log("Осталось: ", totalTasks - completedTasks)
console.log(`Прогресс: ${percent.toFixed(1)}%`);

if (totalTasks < 0 || totalTasks > 1000 || completedTasks < 0 || completedTasks > totalTasks){
    console.log("Ошибка: Недопустимые значения");
}
else if ((completedTasks === 0) && (totalTasks === 0)){
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