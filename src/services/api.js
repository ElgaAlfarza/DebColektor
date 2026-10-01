/**
 * API service untuk komunikasi dengan backend WhatsApp Gateway
 * Otomatis deteksi URL: localhost dev → port 3001, tunnel/produksi → same origin
 */

// Jika diakses dari Vite dev server (port 5173), pakai backend port 3001
// Jika diakses dari tunnel/produksi (frontend disajikan backend), pakai path relatif
const isDevServer = typeof window !== 'undefined' &&
  (window.location.port === '5173' || window.location.port === '5174');

const BASE_URL = isDevServer
  ? 'http://localhost:3001/api'
  : `${window.location.origin}/api`;


// ─── HTTP helpers ────────────────────────────────────────────
async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  return res.json();
}

async function post(path, body = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function del(path) {
  const res = await fetch(`${BASE_URL}${path}`, { method: 'DELETE' });
  return res.json();
}

// ─── WhatsApp Connection ─────────────────────────────────────
export const waAPI = {
  getStatus: () => get('/status'),
  connect: () => post('/connect'),
  disconnect: () => post('/disconnect'),
  getQR: () => get('/qr'),
};

// ─── Messaging ───────────────────────────────────────────────
export const messageAPI = {
  sendSingle: (phone, message) => post('/send', { phone, message }),
  getSent: () => get('/sent'),
};

// ─── Blast Queue ─────────────────────────────────────────────
export const queueAPI = {
  getQueue: () => get('/queue'),
  addToQueue: (recipients, message, delayMin = 3, delayMax = 7) =>
    post('/queue/add', { recipients, message, delayMin, delayMax }),
  startBlast: () => post('/queue/start'),
  stopBlast: () => post('/queue/stop'),
  clearQueue: () => del('/queue'),
};


// ─── Check backend availability ──────────────────────────────
export async function checkBackend() {
  try {
    const data = await get('/status');
    return {
      available: true,
      waStatus: data.status || (data.connected ? 'connected' : 'disconnected'),
      phone: data.phone,
      raw: data,   // full payload for health metrics extraction
    };
  } catch {
    return { available: false };
  }
}
