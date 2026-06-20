// Centralized fetch wrapper. Always sends cookies and normalizes errors.

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  // When true, do not throw on 401 (used for the initial /auth/me probe).
  silent?: boolean;
}

// tryRefresh attempts to mint a new access token from the refresh cookie.
async function tryRefresh(): Promise<boolean> {
  try {
    const r = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
    return r.ok;
  } catch {
    return false;
  }
}

async function request<T>(
  path: string,
  opts: ApiOptions = {},
  allowRefresh = true,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: opts.method ?? "GET",
    credentials: "include",
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });

  // Access token muddati tugagan bo'lsa — refresh qilib, so'rovni bir marta qayta yuboramiz.
  const skipRefresh =
    path.startsWith("/auth/refresh") ||
    path.startsWith("/auth/login") ||
    path.startsWith("/auth/logout");
  if (res.status === 401 && allowRefresh && !skipRefresh) {
    if (await tryRefresh()) {
      return request<T>(path, opts, false);
    }
  }

  let payload: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!res.ok) {
    const errObj =
      (payload as { error?: { code: string; message: string } })?.error;
    throw new ApiError(
      res.status,
      errObj?.code ?? "error",
      errObj?.message ?? "Xatolik yuz berdi",
    );
  }

  return (payload as { data: T })?.data;
}

// uploadForm posts multipart/form-data (e.g. avatar uploads). The browser sets
// the Content-Type boundary itself, so we must NOT set it manually.
async function uploadForm<T>(
  path: string,
  form: FormData,
  allowRefresh = true,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    body: form,
    cache: "no-store",
  });

  if (res.status === 401 && allowRefresh) {
    if (await tryRefresh()) {
      return uploadForm<T>(path, form, false);
    }
  }

  let payload: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!res.ok) {
    const errObj =
      (payload as { error?: { code: string; message: string } })?.error;
    throw new ApiError(
      res.status,
      errObj?.code ?? "error",
      errObj?.message ?? "Xatolik yuz berdi",
    );
  }

  return (payload as { data: T })?.data;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, form: FormData) => uploadForm<T>(path, form),
};

export { BASE_URL };
