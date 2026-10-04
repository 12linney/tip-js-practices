export class ApiError extends Error {
  constructor(message, {
    kind,
    status = null,
    code = null,
    details = null,
    url = null,
    cause,
  } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.details = details;
    this.url = url;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const ALLOWED_METHODS = new Set(["GET", "POST", "PATCH", "DELETE"]);

// Проверяет baseUrl и возвращает объект URL: абсолютный http(s)-адрес без query и hash.
function parseBaseUrl(baseUrl) {
  if (typeof baseUrl !== "string" || baseUrl.trim() === "") {
    throw new TypeError("baseUrl должен быть непустой строкой.");
  }
  let url;
  try {
    url = new URL(baseUrl);
  } catch (cause) {
    throw new TypeError("baseUrl должен быть абсолютным адресом.", { cause });
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TypeError("baseUrl должен использовать схему http или https.");
  }
  if (baseUrl.includes("?") || baseUrl.includes("#")) {
    throw new TypeError("baseUrl не должен содержать query и hash.");
  }
  return url;
}

function checkTimeout(value, name = "timeoutMs") {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${name} должен быть положительным целым числом.`);
  }
}

// Соединяет абсолютный baseUrl, путь и непустые query-параметры.
// Значения кодируются через URLSearchParams; false и 0 сохраняются.
export function buildUrl(baseUrl, path, query = {}) {
  const url = parseBaseUrl(baseUrl);

  if (typeof path !== "string" || path.trim() === "") {
    throw new TypeError("path должен быть непустой строкой.");
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith("//")) {
    throw new TypeError("path должен быть относительным путём.");
  }
  if (path.includes("?") || path.includes("#")) {
    throw new TypeError("path не должен содержать query и hash.");
  }
  const cleanPath = path.replace(/^\/+|\/+$/g, "");
  if (cleanPath === "") {
    throw new TypeError("path не должен состоять только из слешей.");
  }
  if (!isPlainObject(query)) {
    throw new TypeError("query должен быть обычным объектом.");
  }

  url.pathname = `${url.pathname.replace(/\/+$/, "")}/${cleanPath}`;
  for (const [name, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.append(name, String(value));
  }
  return url.href;
}

function isJsonContentType(response) {
  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
  return contentType.includes("application/json");
}

// requestJson(path, { method, query, body, signal, timeoutMs } = {})
// поддерживает GET, POST, PATCH и DELETE; ответ 204 преобразуется в null.
export function createApiClient({
  baseUrl,
  fetchFn = globalThis.fetch,
  timeoutMs = 3000,
} = {}) {
  parseBaseUrl(baseUrl);
  if (typeof fetchFn !== "function") {
    throw new TypeError("fetchFn должен быть функцией.");
  }
  checkTimeout(timeoutMs);

  async function requestJson(path, {
    method = "GET",
    query = {},
    body,
    signal,
    timeoutMs: ownTimeout,
  } = {}) {
    if (typeof method !== "string") {
      throw new TypeError("method должен быть строкой.");
    }
    const httpMethod = method.toUpperCase();
    if (!ALLOWED_METHODS.has(httpMethod)) {
      throw new TypeError(`Метод ${method} не поддерживается.`);
    }
    if (body !== undefined && httpMethod === "GET") {
      throw new TypeError("GET-запрос не может содержать body.");
    }

    const url = buildUrl(baseUrl, path, query);

    const effectiveTimeout = ownTimeout ?? timeoutMs;
    checkTimeout(effectiveTimeout);
    if (signal !== undefined && !(signal instanceof AbortSignal)) {
      throw new TypeError("signal должен быть экземпляром AbortSignal.");
    }

    // Заголовок Content-Type добавляется только вместе с телом.
    const headers = { Accept: "application/json" };
    const init = { method: httpMethod, headers };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    // Один сигнал на запрос: тайм-аут и, при наличии, внешняя отмена.
    const timeoutSignal = AbortSignal.timeout(effectiveTimeout);
    const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
    init.signal = requestSignal;

    // Причина сигнала отличает тайм-аут и отмену от сетевого сбоя.
    const classifyFailure = (cause, networkMessage) => {
      if (requestSignal.aborted) {
        if (requestSignal.reason?.name === "TimeoutError") {
          return new ApiError(
            `Превышено время ожидания ответа (${effectiveTimeout} мс).`,
            { kind: "timeout", url, cause },
          );
        }
        return new ApiError("Запрос отменён.", { kind: "aborted", url, cause });
      }
      return new ApiError(networkMessage, { kind: "network", url, cause });
    };

    // Отдельный try только для сетевого этапа: ApiError обработки ответа
    // не должен попадать сюда и превращаться в network.
    let response;
    try {
      response = await fetchFn(url, init);
    } catch (cause) {
      throw classifyFailure(cause, "Не удалось получить ответ сервера.");
    }

    if (!(response instanceof Response)) {
      throw new ApiError("Функция запроса вернула не Response.", {
        kind: "invalid-response",
        url,
      });
    }

    // HTTP-ошибка проверяется раньше Content-Type успешного ответа.
    if (!response.ok) {
      let apiError = null;
      if (isJsonContentType(response)) {
        try {
          const payload = await response.json();
          if (isPlainObject(payload?.error)) apiError = payload.error;
        } catch {
          // Тело ошибки не разобрано: сохраняются статус и общий текст.
        }
      }
      const fallbackMessage = `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;
      throw new ApiError(
        typeof apiError?.message === "string" && apiError.message !== ""
          ? apiError.message
          : fallbackMessage,
        {
          kind: "http",
          status: response.status,
          code: typeof apiError?.code === "string" ? apiError.code : null,
          details: apiError?.details ?? null,
          url,
        },
      );
    }

    // Статус 204 не содержит тела, JSON не читается.
    if (response.status === 204) return null;

    if (!isJsonContentType(response)) {
      throw new ApiError("Ожидался ответ в формате JSON.", { kind: "invalid-response", url });
    }

    try {
      return await response.json();
    } catch (cause) {
      if (requestSignal.aborted) throw classifyFailure(cause, "");
      throw new ApiError("Тело ответа не является корректным JSON.", {
        kind: "invalid-response",
        url,
        cause,
      });
    }
  }

  return { requestJson };
}
