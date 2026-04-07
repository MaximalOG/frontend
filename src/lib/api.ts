/**
 * Central API utility — all requests go through here.
 * Dev:  VITE_API_URL=""  (proxied or same origin)
 * Prod: VITE_API_URL="https://api.nethernodes.online"
 */
export const API_URL = (import.meta.env.VITE_API_URL as string) || "";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Low-level fetch wrapper — returns raw Response */
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, options);
}

/** High-level wrapper — throws ApiError on non-ok, returns parsed JSON */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    let msg = "API error";
    try { const d = await res.json(); msg = d.error || d.message || msg; } catch { /* ignore */ }
    throw new ApiError(msg, res.status);
  }
  return res.json() as Promise<T>;
}

/** Convenience helpers */
export const api = {
  get: <T = unknown>(path: string, headers?: HeadersInit) =>
    apiRequest<T>(path, { method: "GET", headers }),

  post: <T = unknown>(path: string, body?: unknown, headers?: HeadersInit) =>
    apiRequest<T>(path, { method: "POST", body: JSON.stringify(body), headers }),

  patch: <T = unknown>(path: string, body?: unknown, headers?: HeadersInit) =>
    apiRequest<T>(path, { method: "PATCH", body: JSON.stringify(body), headers }),

  delete: <T = unknown>(path: string, headers?: HeadersInit) =>
    apiRequest<T>(path, { method: "DELETE", headers }),
};
