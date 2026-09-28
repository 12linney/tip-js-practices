"use strict";

const totalTasks = 6;
const completedTasks = 0;
const dailyLimit = 1;

let remainingTasks = totalTasks - completedTasks;
let calendarDays = 0;
let workDays = 0;
let dayOfWeek = 1;

while (remainingTasks > 0){
    calendarDays++;
    const isWeekend = dayOfWeek === 6 || dayOfWeek === 7;
    if (!isWeekend){
        const completedToday = Math.min(dailyLimit, remainingTasks);
        remainingTasks -= completedToday;
        workDays++;
        console.log(`День ${calendarDays}: выполнено ${completedToday}`);
    }
    else {
        console.log(`День ${calendarDays}: выходной`);
    }

    dayOfWeek++;
    if (dayOfWeek > 7){
        dayOfWeek == 1;
    }
}

console.log(`Рабочих дней: ${workDays}`);
console.log(`Календарных дней: ${calendarDays}`);