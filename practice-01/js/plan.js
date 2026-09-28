"use strict";

const totalTasks = 5;
const completedTasks = 2;
const dailyLimit = 2;
let currentTasks = totalTasks - completedTasks;
let currentCompletedTasks = completedTasks;
let count = 0;

if (dailyLimit >= 1 && dailyLimit <= 1000){
    console.log(`Осталось задач: ${currentTasks}`);
    while (currentTasks>0){
        if (currentTasks < dailyLimit){
            ++count;
            console.log(`День ${count}: выполнено ${currentTasks}, осталось 0`);
            break;
        } else{
        currentTasks -= dailyLimit;
        currentCompletedTasks += dailyLimit;
        ++count;
        console.log(`День ${count}: выполнено ${dailyLimit}, осталось ${currentTasks}`)
        }
    }
    console.log(`Потребуется дней: ${count}`);

} else{
    console.log("Ошибка: Недопустимое занчение");
}