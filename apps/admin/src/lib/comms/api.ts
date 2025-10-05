export async function fetchJSON<T = any>(path: string, init?: RequestInit): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function getThreads(status: "open" | "pending" | "resolved" | "snoozed" = "open") {
  return fetchJSON<{
    items: Array<{ id: string; external_contact_id: string; last_message_at: string | null }>;
  }>(`/communications/threads?status=${status}`);
}

export async function getAccounts() {
  return fetchJSON<{ items: Array<{ id: string; provider: string; external_id: string }> }>(
    `/communications/accounts`,
  );
}
