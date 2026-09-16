/**
 * HTTP helper utility for E2E tests using native fetch.
 */

export async function httpGet(url, headers = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // Not JSON
    }

    const resHeaders = {};
    for (const [k, v] of res.headers.entries()) {
      resHeaders[k.toLowerCase()] = v;
    }

    return {
      status: res.status,
      statusText: res.statusText,
      headers: resHeaders,
      bodyText: text,
      bodyJson: json,
      ok: res.ok,
    };
  } catch (err) {
    return {
      status: 0,
      statusText: err.message,
      headers: {},
      bodyText: "",
      bodyJson: null,
      ok: false,
      error: err,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function httpRequest(url, method = "GET", headers = {}, body = null, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const options = {
      method,
      headers: { ...headers },
      signal: controller.signal,
    };
    if (body !== null) {
      if (typeof body === "object") {
        options.headers["content-type"] = "application/json";
        options.body = JSON.stringify(body);
      } else {
        options.body = String(body);
      }
    }

    const res = await fetch(url, options);
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // Not JSON
    }

    const resHeaders = {};
    for (const [k, v] of res.headers.entries()) {
      resHeaders[k.toLowerCase()] = v;
    }

    return {
      status: res.status,
      statusText: res.statusText,
      headers: resHeaders,
      bodyText: text,
      bodyJson: json,
      ok: res.ok,
    };
  } catch (err) {
    return {
      status: 0,
      statusText: err.message,
      headers: {},
      bodyText: "",
      bodyJson: null,
      ok: false,
      error: err,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Polls an endpoint until predicate returns true or timeout expires.
 */
export async function pollEndpoint(url, predicate, options = {}) {
  const { timeoutMs = 15000, intervalMs = 500 } = options;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const res = await httpGet(url, {}, 3000);
    if (predicate(res)) {
      return { success: true, lastResponse: res };
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  const lastRes = await httpGet(url, {}, 3000);
  return { success: false, lastResponse: lastRes };
}
