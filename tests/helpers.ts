const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";

export async function api(
  path: string,
  options?: { method?: string; body?: unknown }
): Promise<Response> {
  return await fetch(`${BASE}${path}`, {
    method: options?.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
}
