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

async function request<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: opts.method ?? "GET",
    credentials: "include",
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });

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
};

export { BASE_URL };
