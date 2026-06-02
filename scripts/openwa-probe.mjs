const BASE = process.env.OPENWA_API_URL || "https://openwa-railway-production.up.railway.app";
const KEY = process.env.OPENWA_API_KEY || "dev-admin-key";
const SID = process.env.OPENWA_SESSION_ID || "1f5d9616-d30c-4e5d-89c8-3d99285f11bb";

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { "X-API-Key": KEY } });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

async function post(path, data) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "X-API-Key": KEY, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

const health = await get("/api/health");
console.log("health", health);

const sessions = await get("/api/sessions");
console.log("sessions", sessions);

const session = await get(`/api/sessions/${SID}`);
console.log("session", session);

const webhooks = await get(`/api/sessions/${SID}/webhooks`);
console.log("webhooks", webhooks);

const send = await post(`/api/sessions/${SID}/messages/send-text`, {
  chatId: "584121985398@c.us",
  text: "probe test",
});
console.log("send", send);
