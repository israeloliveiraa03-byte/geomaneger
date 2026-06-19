const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

function authHeaders(token: string | null) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  register: (email: string, password: string, name: string) =>
    fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name })
    }).then(handle),

  login: (email: string, password: string) =>
    fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    }).then(handle),

  listMaps: (token: string) => fetch(`${API_URL}/maps`, { headers: authHeaders(token) }).then(handle),

  createMap: (token: string, title: string) =>
    fetch(`${API_URL}/maps`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify({ title })
    }).then(handle),

  getMap: (token: string, id: string) => fetch(`${API_URL}/maps/${id}`, { headers: authHeaders(token) }).then(handle),

  saveLayers: (token: string, mapId: string, layers: unknown) =>
    fetch(`${API_URL}/maps/${mapId}/layers`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify({ layers })
    }).then(handle),

  deleteMap: (token: string, id: string) =>
    fetch(`${API_URL}/maps/${id}`, { method: "DELETE", headers: authHeaders(token) }).then(handle),

  publishMap: (token: string, id: string) =>
    fetch(`${API_URL}/maps/${id}/publish`, { method: "PATCH", headers: authHeaders(token) }).then(handle),

  unpublishMap: (token: string, id: string) =>
    fetch(`${API_URL}/maps/${id}/unpublish`, { method: "PATCH", headers: authHeaders(token) }).then(handle),

  getPlans: () => fetch(`${API_URL}/billing/plans`).then(handle),

  subscribe: (token: string, plan: string) =>
    fetch(`${API_URL}/billing/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify({ plan })
    }).then(handle)
};
