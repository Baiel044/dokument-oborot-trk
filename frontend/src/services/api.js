import { getStoredLanguage, translate } from "../utils/localization";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
export const AUTH_UNAUTHORIZED_EVENT = "eduflow:auth-unauthorized";

export function getAuthToken() {
  return localStorage.getItem("eduflow-token");
}

export function buildWebSocketUrl(path) {
  const base = API_BASE || window.location.origin;
  const url = new URL(path, base);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

export function buildAssetUrl(path) {
  const value = String(path || "").trim();
  if (!value) {
    return "";
  }

  if (/^(data:|blob:|https?:\/\/)/i.test(value)) {
    return value;
  }

  const requestPath = API_BASE.endsWith("/api") && value.startsWith("/api/")
    ? value.replace(/^\/api/, "")
    : value;

  return `${API_BASE}${requestPath}`;
}

function emitUnauthorized() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
  }
}

async function request(path, options = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  const requestPath = API_BASE.endsWith("/api") && path.startsWith("/api/")
    ? path.replace(/^\/api/, "")
    : path;

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${requestPath}`, {
      ...options,
      headers,
    });
  } catch (_error) {
    throw new Error(translate(getStoredLanguage(), "common.serverUnavailable"));
  }

  // Proxies and misconfigured hosts may answer with an empty or HTML body.
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      emitUnauthorized();
    }
    throw new Error(data.message || translate(getStoredLanguage(), "common.requestError"));
  }

  return data;
}

async function download(path) {
  const token = getAuthToken();
  const headers = new Headers();
  const requestPath = API_BASE.endsWith("/api") && path.startsWith("/api/")
    ? path.replace(/^\/api/, "")
    : path;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${requestPath}`, { headers });
  } catch (_error) {
    throw new Error(translate(getStoredLanguage(), "common.serverUnavailable"));
  }

  if (!response.ok) {
    let message = translate(getStoredLanguage(), "common.requestError");
    try {
      const data = await response.json();
      message = data.message || message;
    } catch (_error) {
      // Keep the translated fallback when the server returns a non-JSON error.
    }
    if (response.status === 401) {
      emitUnauthorized();
    }
    throw new Error(message);
  }

  return response.blob();
}

function buildProtectedFilePath(filePath) {
  const fileName = String(filePath || "").split("/").filter(Boolean).pop();
  if (!fileName) {
    throw new Error(translate(getStoredLanguage(), "common.requestError"));
  }

  return `/api/files/${encodeURIComponent(fileName)}`;
}

async function openFile(filePath) {
  const blob = await download(buildProtectedFilePath(filePath));
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export const api = {
  get: (path) => request(path),
  download,
  openFile,
  post: (path, body, options = {}) =>
    request(path, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options,
    }),
  put: (path, body) =>
    request(path, {
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  delete: (path) =>
    request(path, {
      method: "DELETE",
    }),
};
