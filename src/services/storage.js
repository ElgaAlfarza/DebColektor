/**
 * Temporary Privacy-First Storage for Debtor / Contact Data
 * Auto-expires after 24 hours (1x24 jam)
 * Provides instant manual wipe functions
 */

const STORAGE_KEY = 'debcolektor_nasabah_v2';
const LEGACY_KEY  = 'debcolektor_nasabah';
const TTL_MS      = 24 * 60 * 60 * 1000; // 24 jam dalam milidetik

/**
 * Ambil data nasabah yang tersimpan
 * Jika sudah melewati 24 jam, data otomatis dihapus dan mengembalikan []
 */
export function getStoredNasabah() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    
    // Migrasi format lama jika belum ada format v2
    if (!raw) {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        try {
          const items = JSON.parse(legacy);
          if (Array.isArray(items) && items.length > 0) {
            saveStoredNasabah(items);
            raw = localStorage.getItem(STORAGE_KEY);
          }
        } catch (_) {}
      }
    }

    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.timestamp || !Array.isArray(parsed.items)) {
      return [];
    }

    // Periksa masa kedaluwarsa 1x24 jam
    const ageMs = Date.now() - parsed.timestamp;
    if (ageMs > TTL_MS) {
      console.log('🧹 Data nasabah telah melewati 24 jam — otomatis dihapus (privacy policy)');
      clearStoredNasabah();
      return [];
    }

    return parsed.items;
  } catch (err) {
    console.warn('Gagal membaca data nasabah:', err);
    return [];
  }
}

/**
 * Simpan data nasabah dengan stempel waktu baru
 */
export function saveStoredNasabah(items) {
  try {
    if (!items || items.length === 0) {
      clearStoredNasabah();
      return;
    }

    const payload = {
      timestamp: Date.now(),
      items,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    // Simpan salinan format array ke LEGACY_KEY agar kompatibel jika ada modul lain
    localStorage.setItem(LEGACY_KEY, JSON.stringify(items));

    // Beritahu semua komponen di window
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nasabah:updated', { detail: { count: items.length } }));
    }
  } catch (err) {
    console.warn('Gagal menyimpan data nasabah:', err);
  }
}

/**
 * Hapus seluruh data nasabah seketika (Manual Wipe)
 */
export function clearStoredNasabah() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_KEY);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nasabah:updated', { detail: { count: 0 } }));
    }
    console.log('🗑️ Seluruh data nasabah berhasil dihapus dari browser');
  } catch (err) {
    console.warn('Gagal menghapus data nasabah:', err);
  }
}

/**
 * Dapatkan informasi masa berlaku data (sisa waktu 24 jam)
 */
export function getStoredNasabahMeta() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.timestamp || !Array.isArray(parsed.items) || parsed.items.length === 0) {
      return null;
    }

    const ageMs = Date.now() - parsed.timestamp;
    if (ageMs > TTL_MS) {
      clearStoredNasabah();
      return null;
    }

    const remainingMs = Math.max(0, TTL_MS - ageMs);
    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

    return {
      uploadedAt: new Date(parsed.timestamp),
      remainingMs,
      remainingHours,
      remainingMinutes,
      count: parsed.items.length,
    };
  } catch (_) {
    return null;
  }
}
