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
  // Use a longer timeout for provisioning endpoints that make serial external calls.
  const isProvision = path.includes("/setup");
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), isProvision ? 45000 : 15000);
  const abortParent = () => controller.abort();
  options?.signal?.addEventListener("abort", abortParent, { once: true });
  try {
    const res = await fetch(`${API_URL}${path}`, { ...options, signal: controller.signal });
    // Treat 304 Not Modified as a failed request — our API responses are
    // always dynamic and should never be served from browser cache.
    if (res.status === 304) {
      return new Response(null, { status: 204, statusText: "Not Modified — cache miss" });
    }
    return res;
  } finally {
    window.clearTimeout(timer);
    options?.signal?.removeEventListener("abort", abortParent);
  }
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
