// Собственные проверки ПР5 (вариант 5). Запускают реальный учебный API на свободном порту.
import assert from "node:assert/strict";
import { createApiServer } from "../api/server.mjs";
import { ApiError, buildUrl, createApiClient } from "../src/api-client.js";
import { createTaskApi } from "../src/task-api.js";
import { variantFilters } from "../src/variant.js";

let passed = 0;
let failed = 0;

async function check(name, action) {
  try {
    await action();
    passed += 1;
    console.log(`OK: ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL: ${name}`);
    console.error(error.stack ?? error.message);
  }
}

const server = createApiServer();
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
const client = createApiClient({ baseUrl, timeoutMs: 1000 });
const api = createTaskApi(client);

try {
  await check("В0. Вариант 5: categoryId=1 даёт id [1, 7, 13] и meta.total 3", async () => {
    const { tasks, meta } = await api.loadInitialData(variantFilters);
    assert.deepEqual(variantFilters, { categoryId: 1 });
    assert.deepEqual(tasks.map((task) => task.id), [1, 7, 13]);
    assert.equal(meta.total, 3);
    assert.equal(meta.filters.categoryId, 1);
  });

  await check("С1. Собственная комбинация: categoryId=1, completed=false, q=разобр", async () => {
    const { tasks, meta } = await api.getTasks({ categoryId: 1, completed: false, q: "  разобр  " });
    assert.deepEqual(tasks.map((task) => task.id), [13]);
    assert.deepEqual(meta.filters, { completed: false, priority: null, categoryId: 1, q: "разобр" });
    const url = new URL(buildUrl(baseUrl, "/tasks", { categoryId: 1, completed: false, q: "разобр" }));
    assert.equal(url.searchParams.get("completed"), "false");
    assert.equal(url.searchParams.get("categoryId"), "1");
  });

  await check("С2. HTTP-ошибка: несуществующий маршрут и неверный id не считаются сетевыми", async () => {
    let error;
    try { await client.requestJson("/unknown-route"); } catch (e) { error = e; }
    assert.ok(error instanceof ApiError);
    assert.equal(error.kind, "http");
    assert.equal(error.status, 404);
    assert.equal(typeof error.code, "string");

    let invalidId;
    try { await client.requestJson("/tasks/abc"); } catch (e) { invalidId = e; }
    assert.equal(invalidId.kind, "http");
    assert.equal(invalidId.status, 400);
    assert.equal(invalidId.code, "INVALID_ID");
  });

  await check("С3. Граница отмены: уже отменённый signal даёт aborted без ответа сервера", async () => {
    const controller = new AbortController();
    controller.abort();
    let error;
    try {
      await client.requestJson("/tasks", { signal: controller.signal });
    } catch (e) { error = e; }
    assert.ok(error instanceof ApiError);
    assert.equal(error.kind, "aborted");
  });

  await check("С4. Граница схемы: название 100 символов принимается, 101 отклоняется", async () => {
    const make = (title) => createTaskApi({
      async requestJson() {
        return {
          data: [{ id: 1, title, completed: false, priority: "low", categoryId: 1 }],
          meta: { total: 1, filters: {} },
        };
      },
    });
    assert.equal((await make("я".repeat(100)).getTasks()).tasks.length, 1);
    await assert.rejects(() => make("я".repeat(101)).getTasks(), (e) => e instanceof ApiError && e.kind === "invalid-response");
  });
} finally {
  await new Promise((resolve) => server.close(resolve));
}

console.log(`\nИтог собственных проверок: успешно ${passed}, ошибок ${failed}.`);
if (failed > 0) process.exitCode = 1;
