const log = (label) => console.log(label);

log("A: синхронный код");

setTimeout(() => {
  log("F: задача таймера");
}, 0);

Promise.resolve().then(() => {
  log("D: обработчик Promise");
});

async function demonstrateAwait() {
  log("B: начало async-функции");
  await null;
  log("E: продолжение после await");
}

demonstrateAwait();
log("C: конец синхронного кода");

// Собственный обработчик (задание 2): ставится после D и E, поэтому выполнится после них.
Promise.resolve().then(() => {
  log("G: собственная микрозадача");
});

// До запуска записать прогноз порядка A–F в отчёт, затем объяснить результат.