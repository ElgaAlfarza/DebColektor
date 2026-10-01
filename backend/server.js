/**
 * DebtColektor CRM — WhatsApp Gateway Backend v5
 * Single Session + Anti-Ban Engine (Human-like behavior)
 * Engine: Baileys v7
 */

// SSL bypass — HARUS baris pertama
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express  = require('express');
const http     = require('http');
const { Server: SocketIO } = require('socket.io');
const cors     = require('cors');
const pino     = require('pino');
const QRCode   = require('qrcode');
const path     = require('path');
const fs       = require('fs');

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestWaWebVersion,
} = require('@whiskeysockets/baileys');

const app        = express();
const httpServer = http.createServer(app);
const io         = new SocketIO(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST', 'DELETE', 'PUT'] },
});

app.use(cors({ origin: '*' }));
app.use(express.json());

const PORT      = process.env.PORT || 3001;
const AUTH_DIR  = path.join(__dirname, 'wa_session');
const DIST_DIR  = path.join(__dirname, '..', 'dist');
const WARMUP_FILE = path.join(AUTH_DIR, 'warmup.json');

// ─── Serve Frontend ───────────────────────────────────────────
if (fs.existsSync(DIST_DIR)) app.use(express.static(DIST_DIR));
fs.mkdirSync(AUTH_DIR, { recursive: true });

// Migrasi dari multi-session ke single session jika ada
const MULTI_DIR = path.join(__dirname, 'wa_sessions', 'slot_1');
if (fs.existsSync(MULTI_DIR) && fs.readdirSync(MULTI_DIR).length > 0 && !fs.existsSync(path.join(AUTH_DIR, 'creds.json'))) {
  console.log('📦 Migrasi sesi slot_1 → wa_session/');
  for (const f of fs.readdirSync(MULTI_DIR)) {
    fs.copyFileSync(path.join(MULTI_DIR, f), path.join(AUTH_DIR, f));
  }
}

const logger = pino({ level: 'silent' });

// ═══════════════════════════════════════════════════════════════
// ── ANTI-BAN ENGINE ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

// ── 1. Gaussian Random (distribusi normal) ───────────────────
function gaussianRandom(mean, std) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// ── 2. Typing Delay (WPM 40–60 manusia) ─────────────────────
function calcTypingMs(text) {
  const wpm      = gaussianRandom(50, 8);          // 40–60 wpm
  const words    = text.length / 5;                // chars → words
  const baseMs   = (words / wpm) * 60 * 1000;
  const thinkMs  = gaussianRandom(800, 300);       // jeda berpikir
  const total    = Math.max(1000, baseMs + thinkMs);
  return Math.min(total, 8000);                    // max 8 detik
}

// ── 3. Gaussian Jitter Delay antar pesan ────────────────────
function interMessageDelay(minSec, maxSec) {
  const meanMs = ((minSec + maxSec) / 2) * 1000;
  const stdMs  = ((maxSec - minSec) / 4) * 1000;
  return Math.max(minSec * 1000, gaussianRandom(meanMs, stdMs));
}

// ── 4. Circadian Rhythm Multiplier ───────────────────────────
function getCircadianMultiplier() {
  const h = new Date().getHours();
  if (h >= 2  && h < 6)  return 0;    // dini hari → berhenti total
  if (h >= 6  && h < 8)  return 0.3;  // subuh → sangat lambat
  if (h >= 8  && h < 20) return 1.0;  // jam kerja OJK → normal
  if (h >= 20 && h < 22) return 0.6;  // malam → melambat
  return 0.3;                          // larut → sangat lambat
}

// ── 5. OJK Compliance ────────────────────────────────────────
function isOJKWorkingHour() {
  const now = new Date();
  const day  = now.getDay();
  const hour = now.getHours();
  return day >= 1 && day <= 6 && hour >= 8 && hour < 20;
}

// ── 6. Warmup System (7-day gradual ramp) ────────────────────
const WARMUP_LIMITS = [0, 20, 40, 80, 150, 280, 450, 680]; // hari ke-0..7+

function loadWarmup() {
  try {
    if (fs.existsSync(WARMUP_FILE)) {
      return JSON.parse(fs.readFileSync(WARMUP_FILE, 'utf8'));
    }
  } catch (_) {}
  return null;
}

function saveWarmup(data) {
  try { fs.writeFileSync(WARMUP_FILE, JSON.stringify(data, null, 2)); } catch (_) {}
}

function initWarmup() {
  let warmup = loadWarmup();
  if (!warmup) {
    warmup = { startDate: new Date().toISOString().slice(0, 10), acknowledged: false };
    saveWarmup(warmup);
    console.log('🌱 Warmup dimulai hari ke-1 (limit: 20 pesan/hari)');
  }
  return warmup;
}

function getWarmupDay() {
  const warmup = loadWarmup() || initWarmup();
  const start  = new Date(warmup.startDate);
  const today  = new Date();
  const diff   = Math.floor((today - start) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1); // hari ke-1, ke-2, dst
}

function getDailyLimit() {
  const day = getWarmupDay();
  if (day >= WARMUP_LIMITS.length) return WARMUP_LIMITS[WARMUP_LIMITS.length - 1];
  return WARMUP_LIMITS[day] || 20;
}

// ── 7. Health Monitor ────────────────────────────────────────
const health = {
  sentToday:    0,
  failedCount:  0,
  badMacCount:  0,
  riskLevel:    'low',   // low | medium | high | critical
  autoPaused:   false,
  lastReset:    new Date().toDateString(),
};

function resetDailyHealth() {
  if (health.lastReset !== new Date().toDateString()) {
    health.sentToday   = 0;
    health.failedCount = 0;
    health.lastReset   = new Date().toDateString();
    health.autoPaused  = false;
    health.riskLevel   = 'low';
  }
}

function updateRiskLevel() {
  const failRate = health.sentToday > 0 ? health.failedCount / health.sentToday : 0;
  const badMac   = health.badMacCount;

  if (badMac >= 10 || failRate > 0.4) {
    health.riskLevel  = 'critical';
    health.autoPaused = true;
  } else if (badMac >= 5 || failRate > 0.25) {
    health.riskLevel  = 'high';
    health.autoPaused = true;
  } else if (badMac >= 2 || failRate > 0.1) {
    health.riskLevel  = 'medium';
    health.autoPaused = false;
  } else {
    health.riskLevel  = 'low';
    health.autoPaused = false;
  }
  broadcastStatus();
}

// ── 8. ReplyRatioGuard ────────────────────────────────────────
const replyGuard = {
  replied:   new Set(),   // phone yang pernah balas
  sentCount: {},          // phone → jumlah pesan terkirim tanpa balasan
  blocked:   new Set(),   // phone yang diblokir
};

const BLOCK_AFTER_N_UNREPLIED = 3; // blokir setelah 3 pesan tanpa balasan

function checkReplyGuard(phone) {
  if (replyGuard.blocked.has(phone)) return false;
  return true;
}

function recordSentToGuard(phone) {
  if (replyGuard.replied.has(phone)) return; // sudah pernah balas, aman
  replyGuard.sentCount[phone] = (replyGuard.sentCount[phone] || 0) + 1;
  if (replyGuard.sentCount[phone] >= BLOCK_AFTER_N_UNREPLIED) {
    replyGuard.blocked.add(phone);
    console.log(`🛡 ReplyGuard: ${phone} diblokir (${BLOCK_AFTER_N_UNREPLIED}x tidak balas)`);
  }
}

function recordReplyFromGuard(phone) {
  replyGuard.replied.add(phone);
  replyGuard.blocked.delete(phone);
  delete replyGuard.sentCount[phone];
}

// ── 9. Human-like sendMessage ─────────────────────────────────
async function humanSendMessage(sock, jid, text) {
  const cleanJid = await canonicalizeJID(sock, jid);

  // a. Presence: online
  await sock.sendPresenceUpdate('available', cleanJid).catch(() => {});
  await sleep(gaussianRandom(400, 100));

  // b. Typing indicator (durasi proporsional panjang pesan)
  await sock.sendPresenceUpdate('composing', cleanJid).catch(() => {});
  const typingMs = calcTypingMs(text);
  await sleep(typingMs);

  // c. Kirim pesan
  await sock.sendMessage(cleanJid, { text });

  // d. Presence: pause composing
  await sock.sendPresenceUpdate('paused', cleanJid).catch(() => {});
  await sleep(gaussianRandom(500, 150));

  // e. Kembali available lalu offline
  await sock.sendPresenceUpdate('available', cleanJid).catch(() => {});
  await sleep(gaussianRandom(1200, 300));
  await sock.sendPresenceUpdate('unavailable', cleanJid).catch(() => {});
}

// ── 10. LID Canonicalization ─────────────────────────────────
async function canonicalizeJID(sock, jid) {
  // Jika sudah phone JID, gunakan langsung
  if (jid.includes('@s.whatsapp.net')) return jid;
  // Jika LID format (@lid), coba resolve
  try {
    const result = await sock.onWhatsApp(jid.split('@')[0]);
    if (result?.[0]?.jid) return result[0].jid;
  } catch (_) {}
  return jid;
}

// Helper sleep
function sleep(ms) {
  return new Promise(r => setTimeout(r, Math.max(0, ms)));
}

// ── 11. Entropy Service (background humanizer) ────────────────
let entropyTimer = null;
function startEntropyService(sock) {
  if (entropyTimer) clearTimeout(entropyTimer);

  const scheduleNext = () => {
    const delayMs = gaussianRandom(5 * 60 * 1000, 2 * 60 * 1000); // 3–8 menit
    entropyTimer = setTimeout(async () => {
      if (!waSession.sock || waSession.status !== 'connected') return;
      try {
        // Simulasi: buka WA, lihat chat
        await sock.sendPresenceUpdate('available').catch(() => {});
        await sleep(gaussianRandom(3000, 800));
        await sock.sendPresenceUpdate('unavailable').catch(() => {});
      } catch (_) {}
      scheduleNext();
    }, Math.max(60000, delayMs));
  };
  scheduleNext();
}

// ═══════════════════════════════════════════════════════════════
// ── SESSION MANAGER (Single) ─────────────────────────────────
// ═══════════════════════════════════════════════════════════════
const waSession = {
  sock:          null,
  phone:         null,
  status:        'disconnected',
  pairingCode:   null,
  qr:            null,
  reconnectCount: 0,
  reconnectTimer: null,
  lastConnected:  null,
};

const incomingMessages = [];
const sentMessages     = [];
const messageQueue     = [];
let blastRunning       = false;
let blastTimer         = null;

function broadcastStatus() {
  resetDailyHealth();
  const payload = {
    connected:    waSession.status === 'connected',
    status:       waSession.status,
    phone:        waSession.phone,
    pairingCode:  waSession.pairingCode,
    qr:           waSession.qr,
    // Health & warmup
    warmupDay:    getWarmupDay(),
    dailyLimit:   getDailyLimit(),
    sentToday:    health.sentToday,
    riskLevel:    health.riskLevel,
    autoPaused:   health.autoPaused,
    circadian:    getCircadianMultiplier(),
    replyBlocked: replyGuard.blocked.size,
  };
  io.emit('wa:status', payload);
  io.emit('wa:health', payload);
}

// ── Connect ──────────────────────────────────────────────────
async function connectSession(phone = null) {
  if (waSession.reconnectTimer) clearTimeout(waSession.reconnectTimer);
  if (entropyTimer) clearTimeout(entropyTimer);

  waSession.status      = 'connecting';
  waSession.pairingCode = null;
  waSession.qr          = null;
  broadcastStatus();

  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version }          = await fetchLatestWaWebVersion();

    if (waSession.sock) {
      try { waSession.sock.end(undefined); } catch (_) {}
    }

    const usePairingCode = !!phone;

    waSession.sock = makeWASocket({
      version,
      auth:    state,
      logger,
      browser: ['DebtColektor', 'Chrome', '124.0.6367.82'],
      syncFullHistory:      false,
      markOnlineOnConnect:  false,
      connectTimeoutMs:     30000,
      qrTimeout:            20000,
      generateHighQualityLinkPreview: false,
    });

    waSession.sock.ev.on('creds.update', saveCreds);

    // ── Messages masuk ─────────────────────────────────────
    waSession.sock.ev.on('messages.upsert', ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (msg.key.fromMe) continue;
        const from = msg.key.remoteJid?.split('@')[0] || '';
        const text = msg.message?.conversation ||
                     msg.message?.extendedTextMessage?.text || '';
        if (!text || !from) continue;

        // ReplyGuard: catat balasan
        recordReplyFromGuard('+' + from);

        const inboxMsg = {
          id: msg.key.id, jid: msg.key.remoteJid,
          from: '+' + from, text,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          receivedAt: new Date().toISOString(),
        };
        incomingMessages.unshift(inboxMsg);
        if (incomingMessages.length > 500) incomingMessages.pop();
        io.emit('inbox:message', inboxMsg);
      }
    });

    // ── Bad MAC detection ─────────────────────────────────
    waSession.sock.ev.on('CB:ib,,dirty', () => {
      health.badMacCount++;
      console.warn(`⚠ Bad MAC detected (total: ${health.badMacCount})`);
      updateRiskLevel();
    });

    // ── Connection update ─────────────────────────────────
    waSession.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr && !usePairingCode) {
        try {
          waSession.qr     = await QRCode.toDataURL(qr);
          waSession.status = 'connecting';
          broadcastStatus();
        } catch (_) {}
      }

      if (connection === 'open') {
        const phoneNum = waSession.sock.user?.id?.split(':')[0] || (phone?.replace(/\D/g, '') || '');
        waSession.phone         = '+' + phoneNum;
        waSession.status        = 'connected';
        waSession.pairingCode   = null;
        waSession.qr            = null;
        waSession.reconnectCount = 0;
        waSession.lastConnected  = new Date().toISOString();

        // Init warmup jika belum ada
        initWarmup();

        // Start entropy service
        startEntropyService(waSession.sock);

        console.log(`✅ Terhubung: ${waSession.phone} (Warmup hari ke-${getWarmupDay()}, limit ${getDailyLimit()}/hari)`);
        broadcastStatus();
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        const reason = lastDisconnect?.error?.message || '';
        console.log(`❌ Putus. Code: ${code}, Reason: ${reason}`);

        waSession.status = 'disconnected';
        waSession.phone  = null;

        // Jika disconnect manual → jangan reconnect
        if (manualDisconnect) {
          console.log('🔌 Disconnect manual — tidak reconnect otomatis');
          broadcastStatus();
          return;
        }

        // Classify disconnect reason & set backoff
        let backoffMs = 5000;
        let shouldDelete = false;

        if (code === 401 || code === DisconnectReason.loggedOut) {
          // Conflict / logged out → hapus sesi
          shouldDelete = true;
          backoffMs    = 0;
          console.log('🔓 Logout — sesi dihapus');
        } else if (code === 515) {
          // Restart required
          backoffMs = 5000;
          console.log('🔄 Restart required → reconnect dalam 5 detik');
        } else if (code === 463) {
          // Reachout timelock → tunggu 30 menit
          backoffMs = 30 * 60 * 1000;
          console.log('⏳ Timelock → reconnect dalam 30 menit');
        } else if (waSession.reconnectCount < 5) {
          // Exponential backoff: 5s, 10s, 20s, 40s, 80s
          backoffMs = Math.min(5000 * Math.pow(2, waSession.reconnectCount), 5 * 60 * 1000);
          console.log(`🔁 Reconnect dalam ${backoffMs/1000}s (percobaan ke-${waSession.reconnectCount + 1})`);
        } else {
          console.log('⛔ Menyerah reconnect setelah 5 percobaan');
          backoffMs = 0;
        }

        if (shouldDelete) {
          try {
            const files = fs.readdirSync(AUTH_DIR).filter(f => f !== 'warmup.json');
            for (const f of files) fs.rmSync(path.join(AUTH_DIR, f), { force: true });
          } catch (_) {}
        }

        if (backoffMs > 0) {
          waSession.reconnectCount++;
          waSession.status = 'connecting';
          waSession.reconnectTimer = setTimeout(() => connectSession(null), backoffMs);
        }

        broadcastStatus();
      }
    });

    // Request pairing code
    if (usePairingCode && phone) {
      setTimeout(async () => {
        try {
          const cleanPhone = phone.replace(/\D/g, '');
          const code = await waSession.sock.requestPairingCode(cleanPhone);
          waSession.pairingCode = code.match(/.{1,4}/g)?.join('-') || code;
          broadcastStatus();
          console.log(`🔑 Pairing code: ${waSession.pairingCode}`);
        } catch (err) {
          console.error('Gagal pairing code:', err.message);
        }
      }, 3000);
    }

  } catch (err) {
    waSession.status = 'disconnected';
    console.error('Error connect:', err.message);
    broadcastStatus();
  }
}

// ── Disconnect ───────────────────────────────────────────────
let manualDisconnect = false; // flag mencegah auto-reconnect saat disconnect manual

async function disconnectSession() {
  manualDisconnect = true; // tandai sebagai manual disconnect

  // 1. Hentikan semua timer
  if (waSession.reconnectTimer) {
    clearTimeout(waSession.reconnectTimer);
    waSession.reconnectTimer = null;
  }
  if (entropyTimer) {
    clearTimeout(entropyTimer);
    entropyTimer = null;
  }

  // 2. Logout bersih dari WhatsApp
  if (waSession.sock) {
    try {
      await waSession.sock.logout();
    } catch (_) {
      try { waSession.sock.end(undefined); } catch (_2) {}
    }
    waSession.sock = null;
  }

  // 3. Hapus file sesi (agar tidak auto-login saat restart)
  try {
    const files = fs.readdirSync(AUTH_DIR).filter(f => f !== 'warmup.json');
    for (const f of files) fs.rmSync(path.join(AUTH_DIR, f), { force: true });
    console.log('🗑️  Sesi dihapus — siap login ulang');
  } catch (_) {}

  // 4. Reset state
  waSession.status        = 'disconnected';
  waSession.phone         = null;
  waSession.pairingCode   = null;
  waSession.qr            = null;
  waSession.reconnectCount = 0;

  broadcastStatus();

  // 5. Reset flag setelah delay singkat
  setTimeout(() => { manualDisconnect = false; }, 3000);
}

// ── Main Send (dengan anti-ban) ──────────────────────────────
async function sendMessage(phone, message) {
  resetDailyHealth();

  if (!waSession.sock || waSession.status !== 'connected') {
    throw new Error('WhatsApp tidak terhubung');
  }
  if (health.autoPaused) {
    throw new Error(`Auto-pause aktif (risiko: ${health.riskLevel}). Tunggu beberapa menit.`);
  }

  const circadian = getCircadianMultiplier();
  if (circadian === 0) {
    throw new Error('Pengiriman dihentikan (jam 02.00–06.00 untuk menjaga kesehatan nomor)');
  }

  const dailyLimit = getDailyLimit();
  if (health.sentToday >= dailyLimit) {
    throw new Error(`Batas harian tercapai (${health.sentToday}/${dailyLimit}). Lanjut besok.`);
  }

  const cleanPhone = phone.replace(/\D/g, '');
  const jid        = cleanPhone + '@s.whatsapp.net';

  // ReplyGuard check
  if (!checkReplyGuard('+' + cleanPhone)) {
    throw new Error(`Nomor ${phone} diblokir ReplyGuard (tidak pernah membalas)`);
  }

  try {
    await humanSendMessage(waSession.sock, jid, message);

    health.sentToday++;
    recordSentToGuard('+' + cleanPhone);

    const record = {
      phone: '+' + cleanPhone, message,
      sentAt:  new Date().toISOString(),
      warmupDay: getWarmupDay(),
    };
    sentMessages.unshift(record);
    if (sentMessages.length > 1000) sentMessages.pop();
    io.emit('blast:sent', record);

    updateRiskLevel();
    broadcastStatus();

    return { success: true, phone: waSession.phone, warmupDay: getWarmupDay() };

  } catch (err) {
    health.failedCount++;
    updateRiskLevel();
    throw err;
  }
}

// ── Daily reset scheduler ────────────────────────────────────
function scheduleMidnightReset() {
  const now      = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  setTimeout(() => {
    health.sentToday   = 0;
    health.failedCount = 0;
    health.lastReset   = new Date().toDateString();
    health.autoPaused  = false;
    health.riskLevel   = 'low';
    broadcastStatus();
    console.log('🔄 Reset harian health metrics');
    scheduleMidnightReset();
  }, midnight - now);
}
scheduleMidnightReset();

// ═══════════════════════════════════════════════════════════════
// ── REST API ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

// ── Status ────────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  resetDailyHealth();
  res.json({
    connected:    waSession.status === 'connected',
    status:       waSession.status,
    phone:        waSession.phone,
    pairingCode:  waSession.pairingCode,
    qr:           waSession.qr,
    warmupDay:    getWarmupDay(),
    dailyLimit:   getDailyLimit(),
    sentToday:    health.sentToday,
    riskLevel:    health.riskLevel,
    autoPaused:   health.autoPaused,
    circadian:    getCircadianMultiplier(),
    replyBlocked: replyGuard.blocked.size,
  });
});

// ── Health Detail ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  resetDailyHealth();
  res.json({
    ...health,
    warmupDay:    getWarmupDay(),
    dailyLimit:   getDailyLimit(),
    remaining:    Math.max(0, getDailyLimit() - health.sentToday),
    circadian:    getCircadianMultiplier(),
    circadianLabel: getCircadianLabel(),
    replyBlocked: replyGuard.blocked.size,
    repliedCount: replyGuard.replied.size,
    failRate:     health.sentToday > 0 ? (health.failedCount / health.sentToday).toFixed(2) : 0,
  });
});

function getCircadianLabel() {
  const m = getCircadianMultiplier();
  if (m === 0)   return '🌙 Dini hari (berhenti)';
  if (m <= 0.3)  return '😴 Lambat';
  if (m <= 0.6)  return '🌆 Melambat';
  return '☀️ Normal';
}

app.post('/api/health/reset', (req, res) => {
  health.failedCount = 0;
  health.badMacCount = 0;
  health.autoPaused  = false;
  health.riskLevel   = 'low';
  broadcastStatus();
  res.json({ success: true });
});

// ── Connect / Disconnect ──────────────────────────────────────
app.post('/api/connect', async (req, res) => {
  connectSession(null);
  res.json({ success: true });
});

app.post('/api/connect/pairing', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Nomor diperlukan' });
  connectSession(phone);
  res.json({ success: true, message: 'Pairing code akan muncul dalam beberapa detik' });
});

app.post('/api/disconnect', async (req, res) => {
  await disconnectSession();
  res.json({ success: true });
});

// ── QR ───────────────────────────────────────────────────────
app.get('/api/qr', (req, res) => {
  if (waSession.qr) res.json({ qr: waSession.qr });
  else res.status(404).json({ error: 'QR tidak tersedia' });
});

// ── Send ─────────────────────────────────────────────────────
app.post('/api/send', async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) return res.status(400).json({ error: 'phone & message diperlukan' });
  if (!isOJKWorkingHour()) return res.status(403).json({ error: 'Di luar jam OJK (08.00–20.00 Sen–Sab)' });
  try {
    const result = await sendMessage(phone, message);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Inbox / Sent ──────────────────────────────────────────────
app.get('/api/inbox', (req, res) => res.json(incomingMessages));
app.get('/api/sent',  (req, res) => res.json(sentMessages));

// ── Blast Queue ───────────────────────────────────────────────
app.post('/api/queue/add', (req, res) => {
  const { recipients = [], message = '', delayMin = 5, delayMax = 10 } = req.body;
  const newItems = recipients.map(r => ({
    id:       `Q${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name:     r.name || r.phone,
    phone:    r.phone,
    message,
    status:   'antri',
    delayMin, delayMax,
    addedAt:  new Date().toISOString(),
  }));
  messageQueue.push(...newItems);
  io.emit('queue:updated', messageQueue);
  res.json({ success: true, added: newItems.length });
});

app.post('/api/queue/start', async (req, res) => {
  if (blastRunning) return res.json({ success: false, message: 'Sudah berjalan' });
  if (!isOJKWorkingHour()) return res.status(403).json({ error: 'Di luar jam OJK' });
  blastRunning = true;
  res.json({ success: true });

  const pending = messageQueue.filter(q => q.status === 'antri');

  const processNext = async (idx) => {
    if (idx >= pending.length || !blastRunning) {
      blastRunning = false;
      io.emit('blast:finished', { total: pending.length, sent: pending.filter(q => q.status === 'terkirim').length });
      return;
    }
    if (!isOJKWorkingHour()) {
      blastRunning = false;
      io.emit('blast:ojk_paused', { message: 'Dihentikan: di luar jam OJK' });
      return;
    }

    const item   = pending[idx];
    item.status  = 'mengirim';
    io.emit('queue:item_update', item);

    try {
      await sendMessage(item.phone, item.message);
      item.status = 'terkirim';
      item.sentAt = new Date().toISOString();
    } catch (err) {
      item.status = 'gagal';
      item.error  = err.message;
    }

    io.emit('queue:item_update', item);
    io.emit('queue:updated', messageQueue);

    // Delay berikutnya dengan circadian multiplier
    const circadian = getCircadianMultiplier();
    const baseDelay = interMessageDelay(item.delayMin || 5, item.delayMax || 10);
    const adjustedDelay = baseDelay / Math.max(0.1, circadian);

    blastTimer = setTimeout(() => processNext(idx + 1), adjustedDelay);
  };

  processNext(0);
});

app.post('/api/queue/stop', (req, res) => {
  blastRunning = false;
  if (blastTimer) clearTimeout(blastTimer);
  res.json({ success: true });
});

app.delete('/api/queue', (req, res) => {
  messageQueue.length = 0;
  io.emit('queue:updated', messageQueue);
  res.json({ success: true });
});

// ── Reply Guard Management ────────────────────────────────────
app.get('/api/reply-guard', (req, res) => {
  res.json({
    blocked:  [...replyGuard.blocked],
    replied:  replyGuard.replied.size,
    pending:  Object.entries(replyGuard.sentCount).map(([p, c]) => ({ phone: p, count: c })),
  });
});

app.delete('/api/reply-guard/:phone', (req, res) => {
  const phone = decodeURIComponent(req.params.phone);
  replyGuard.blocked.delete(phone);
  delete replyGuard.sentCount[phone];
  res.json({ success: true });
});

// ── Sessions API (backward compat) ────────────────────────────
app.get('/api/sessions', (req, res) => {
  res.json([{
    id:          'slot_1',
    phone:       waSession.phone,
    status:      waSession.status,
    sentToday:   health.sentToday,
    dailyLimit:  getDailyLimit(),
    pairingCode: waSession.pairingCode,
    qr:          waSession.qr,
    label:       'Nomor Utama',
    warmupDay:   getWarmupDay(),
    riskLevel:   health.riskLevel,
  }]);
});

// ═══════════════════════════════════════════════════════════════
// ── SOCKET.IO ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
io.on('connection', socket => {
  console.log('🔌 Client:', socket.id);
  broadcastStatus();
  socket.emit('queue:updated', messageQueue);
  socket.emit('inbox:all', incomingMessages);
});

// ─── SPA Fallback ──────────────────────────────────────────────
if (fs.existsSync(DIST_DIR)) {
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    }
  });
}

// ─── Start ────────────────────────────────────────────────────
httpServer.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n🚀 DebtColektor Backend v5`);
  console.log(`📡 http://localhost:${PORT}`);
  console.log(`🔒 OJK: ${isOJKWorkingHour() ? '✅ Jam aktif' : '⛔ Di luar jam'}`);
  console.log(`🌱 Warmup: hari ke-${getWarmupDay()}, limit ${getDailyLimit()} pesan/hari`);
  console.log(`🛡 Anti-ban engine: aktif\n`);

  // Auto reconnect dari sesi tersimpan
  const files = fs.existsSync(AUTH_DIR) ? fs.readdirSync(AUTH_DIR).filter(f => f !== 'warmup.json') : [];
  if (files.length > 0) {
    console.log('📂 Sesi tersimpan ditemukan, menyambung ulang...');
    connectSession(null);
  }
});
