/**
 * Socket.IO client — real-time events dari backend
 * Events:
 *   wa:status       → { status: 'connected'|'disconnected'|'connecting', phone? }
 *   wa:qr           → { qr: 'data:image/png;base64,...' }
 *   inbox:message   → { id, from, text, timestamp }
 *   inbox:all       → [...messages]
 *   queue:item_update → { id, status, sentAt? }
 *   queue:updated   → [...queue]
 *   blast:sent      → { phone, message, sentAt }
 *   blast:finished  → { total, sent }
 *   blast:ojk_paused→ { message }
 */

let socket = null;
const listeners = {};

function getSocket() {
  return socket;
}

/**
 * Connect to backend Socket.IO
 * Returns { connected: boolean }
 */
export async function initSocket(onEvent) {
  try {
    const { io } = await import('socket.io-client');
    if (socket) socket.disconnect();

    // Deteksi URL: dev server (5173) → backend port 3001, tunnel/produksi → same origin
    const isDevServer = window.location.port === '5173' || window.location.port === '5174';
    const SOCKET_URL  = isDevServer ? 'http://localhost:3001' : window.location.origin;

    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      timeout: 8000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected to backend');
      onEvent?.('socket:connect', {});
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected from backend');
      onEvent?.('socket:disconnect', {});
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
      onEvent?.('socket:error', { error: err.message });
    });

    // Forward all WA events
    const events = [
      'wa:status', 'wa:qr',
      'inbox:message', 'inbox:all',
      'queue:item_update', 'queue:updated',
      'blast:sent', 'blast:finished', 'blast:ojk_paused',
    ];
    events.forEach(evt => {
      socket.on(evt, (data) => {
        onEvent?.(evt, data);
      });
    });

    return { connected: true };
  } catch (err) {
    console.error('[Socket] Init failed:', err);
    return { connected: false, error: err.message };
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export { getSocket };
