const BASE_URL = (process.env.NEXT_PUBLIC_ODOO_API_URL || "").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: { method?: string; token?: string | null; body?: unknown } = {}
): Promise<T> {
  const { method = "GET", token, body } = options;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor", 0);
  }

  let json: Record<string, unknown> | null = null;
  try {
    json = await res.json();
  } catch {
    throw new ApiError("Respuesta inválida del servidor", res.status);
  }

  if (!res.ok || json?.status === "error") {
    throw new ApiError(
      (json?.error as string) || "Error desconocido",
      res.status
    );
  }
  return json as T;
}

export const api = {
  get: <T>(path: string, token?: string | null) => request<T>(path, { token }),
  post: <T>(path: string, body: unknown = {}, token?: string | null) =>
    request<T>(path, { method: "POST", body, token }),
};
