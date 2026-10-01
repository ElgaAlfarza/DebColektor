import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, StopCircle, Clock, Shuffle, Shield, AlertTriangle,
  CheckCircle, XCircle, Loader2, ChevronRight, Zap, Calendar,
  Timer, RotateCcw, Send, Users, Search, ChevronDown, Trash2,
  MessageSquare, RefreshCw, Wifi, WifiOff
} from 'lucide-react';
import { mockNasabah, formatRupiah } from '../data/mockData';

// ─── Template Siap Pakai ─────────────────────────────────────
const READY_TEMPLATES = [
  {
    id: 't1',
    nama: '📅 Pengingat Jatuh Tempo',
    kategori: 'Pengingat',
    isi: '{Halo|Selamat pagi|Yth. Bapak/Ibu} {nama},\n\nKami menginformasikan bahwa tagihan Anda sebesar *{nominal}* akan jatuh tempo pada *{jatuhTempo}*.\n\nSilakan lakukan pembayaran melalui:\n{linkPembayaran}\n\nTerima kasih atas kerjasamanya. 🙏',
  },
  {
    id: 't2',
    nama: '⚠️ Peringatan Keterlambatan',
    kategori: 'Peringatan',
    isi: '{Halo|Hai|Selamat siang} {nama},\n\nTagihan Anda sebesar *{nominal}* telah melewati batas waktu pembayaran ({jatuhTempo}).\n\nMohon segera lunasi untuk menghindari denda tambahan.\n\n🔗 Bayar sekarang: {linkPembayaran}\n\nJika ada kendala, hubungi kami. 🤝',
  },
  {
    id: 't3',
    nama: '🌟 Konfirmasi Janji Bayar',
    kategori: 'Follow-up',
    isi: '{Selamat pagi|Halo|Yth.} {nama},\n\nIni pengingat janji pembayaran tagihan *{nominal}* Anda hari ini.\n\nLink pembayaran: {linkPembayaran}\n\nTerima kasih telah berkomitmen. 🌟',
  },
  {
    id: 't4',
    nama: '🤝 Tawaran Keringanan',
    kategori: 'Negosiasi',
    isi: '{Halo|Selamat siang} {nama},\n\nKami memahami situasi Anda. Kami menawarkan *keringanan cicilan* untuk tagihan {nominal}.\n\nHubungi kami untuk diskusi lebih lanjut, atau akses:\n{linkPembayaran}\n\nKami siap membantu menemukan solusi terbaik. 💙',
  },
];

const STATUS_CONFIG = {
  'mengirim':  { color: 'text-blue-400',   bg: 'bg-blue-900/30 border-blue-700/50',   icon: Loader2,    spin: true  },
  'antri':     { color: 'text-slate-400',  bg: 'bg-slate-700/30 border-slate-600/50', icon: Clock,      spin: false },
  'terkirim':  { color: 'text-teal-400',   bg: 'bg-teal-900/30 border-teal-700/50',   icon: CheckCircle,spin: false },
  'gagal':     { color: 'text-red-400',    bg: 'bg-red-900/30 border-red-700/50',     icon: XCircle,    spin: false },
};

// ─── Spintax renderer ────────────────────────────────────────
function renderSpintax(text) {
  return text.replace(/\{([^{}]+)\}/g, (_, group) => {
    const opts = group.split('|');
    return opts[Math.floor(Math.random() * opts.length)];
  });
}

// ─── Isi variabel dari data nasabah ──────────────────────────
// Mendukung format: {nama} {{nama}} [nama] %nama%
function fillTemplate(template, nasabah) {
  const vars = {
    nama:            nasabah.nama || '',
    name:            nasabah.nama || '',
    nominal:         formatRupiah(nasabah.nominal || 0),
    amount:          formatRupiah(nasabah.nominal || 0),
    tagihan:         formatRupiah(nasabah.nominal || 0),
    tunggakan:       formatRupiah(nasabah.nominal || 0),
    jatuhTempo:      nasabah.jatuhTempo || '',
    'jatuh_tempo':   nasabah.jatuhTempo || '',
    dueDate:         nasabah.jatuhTempo || '',
    due_date:        nasabah.jatuhTempo || '',
    tanggal:         nasabah.jatuhTempo || '',
    linkPembayaran:  nasabah.linkPembayaran || '',
    'link_pembayaran': nasabah.linkPembayaran || '',
    link:            nasabah.linkPembayaran || '',
    url:             nasabah.linkPembayaran || '',
    noTelp:          nasabah.noTelp || '',
    hp:              nasabah.noTelp || '',
    phone:           nasabah.noTelp || '',
  };

  let result = template;

  // Ganti semua format variabel yang umum digunakan
  for (const [key, value] of Object.entries(vars)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Format: {{key}}, {key}, [key], %key%
    result = result
      .replace(new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`, 'gi'), value)  // {{nama}}
      .replace(new RegExp(`\\{\\s*${escaped}\\s*\\}`, 'gi'), value)         // {nama}
      .replace(new RegExp(`\\[\\s*${escaped}\\s*\\]`, 'gi'), value)         // [nama]
      .replace(new RegExp(`%\\s*${escaped}\\s*%`, 'gi'), value);            // %nama%
  }
  return result;
}

function processMessage(templateText, nasabah) {
  // 1. Isi variabel dulu
  const filled = fillTemplate(templateText, nasabah);
  // 2. Render spintax {opsi1|opsi2} — tapi SETELAH variabel diisi
  return renderSpintax(filled);
}


function useCurrentTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return now;
}
function isWorkingHour(date) {
  const d = date.getDay(), h = date.getHours();
  return d >= 1 && d <= 6 && h >= 8 && h < 20;
}

export default function BlastControl() {
  const now       = useCurrentTime();
  const isWorking = isWorkingHour(now);

  // ── State ──────────────────────────────────────────────────
  const [allNasabah, setAllNasabah]         = useState([]);
  const [search, setSearch]                 = useState('');
  const [selectedIds, setSelectedIds]       = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [customMsg, setCustomMsg]           = useState('');
  const [useCustomMsg, setUseCustomMsg]     = useState(true);
  const [previewMsg, setPreviewMsg]         = useState('');

  const [delayMin, setDelayMin]             = useState(5);
  const [delayMax, setDelayMax]             = useState(10);
  const [delayMode, setDelayMode]           = useState('random');

  const [queue, setQueue]                   = useState([]);
  const [running, setRunning]               = useState(false);
  const [waConnected, setWaConnected]       = useState(false);
  const [backendOnline, setBackendOnline]   = useState(false);
  const [blastError, setBlastError]         = useState('');

  // ── Anti-ban warmup state ──────────────────────────────────
  const [warmupDay, setWarmupDay]           = useState(1);
  const [dailyLimit, setDailyLimit]         = useState(20);
  const [sentToday, setSentToday]           = useState(0);
  const [riskLevel, setRiskLevel]           = useState('low');

  const stopRef    = useRef(false);   // flag untuk stop blast
  const intervalRef = useRef(null);

  // ── Load nasabah dari localStorage ─────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('debcolektor_nasabah');
    if (saved) {
      try { setAllNasabah(JSON.parse(saved)); return; } catch (_) {}
    }
    setAllNasabah(mockNasabah);
  }, []);

  // ── Cek status WA setiap 5 detik ───────────────────────────
  const checkBackend = useCallback(async () => {
    try {
      const r = await fetch('http://localhost:3001/api/status');
      const d = await r.json();
      setBackendOnline(true);
      setWaConnected(d.connected);
      if (d.warmupDay !== undefined)  setWarmupDay(d.warmupDay);
      if (d.dailyLimit !== undefined) setDailyLimit(d.dailyLimit);
      if (d.sentToday !== undefined)  setSentToday(d.sentToday);
      if (d.riskLevel !== undefined)  setRiskLevel(d.riskLevel);
    } catch {
      setBackendOnline(false);
      setWaConnected(false);
    }
  }, []);

  useEffect(() => {
    checkBackend();
    const t = setInterval(checkBackend, 5000);
    return () => clearInterval(t);
  }, [checkBackend]);

  // ── Preview pesan ───────────────────────────────────────────
  useEffect(() => {
    const tmpl    = READY_TEMPLATES.find(t => t.id === selectedTemplate);
    const msgText = useCustomMsg ? customMsg : (tmpl?.isi || '');
    if (!msgText) { setPreviewMsg(''); return; }
    const dummy = allNasabah[0] || { nama: 'Budi Santoso', nominal: 4500000, jatuhTempo: '2026-09-10', linkPembayaran: 'https://bayar.example.com' };
    setPreviewMsg(processMessage(msgText, dummy));
  }, [selectedTemplate, customMsg, useCustomMsg, allNasabah]);

  // ── Nasabah filter ──────────────────────────────────────────
  const filtered = allNasabah.filter(n =>
    ((n.nama || '').toLowerCase().includes(search.toLowerCase()) ||
     (n.noTelp || '').includes(search)) &&
    n.status !== 'Lunas'
  );

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll    = () => setSelectedIds(prev => prev.length === filtered.length ? [] : filtered.map(n => n.id));

  // ─────────────────────────────────────────────────────────────
  // ── SIAPKAN ANTRIAN (tanpa kirim dulu) ──────────────────────
  // ─────────────────────────────────────────────────────────────
  const buildQueue = () => {
    const tmpl    = READY_TEMPLATES.find(t => t.id === selectedTemplate);
    const msgText = useCustomMsg ? customMsg.trim() : (tmpl?.isi || '');
    if (!msgText) { alert('Tulis pesan terlebih dahulu!'); return; }
    if (selectedIds.length === 0) { alert('Pilih nasabah dulu!'); return; }

    const nasabahList = allNasabah
      .filter(n => selectedIds.includes(n.id))
      .filter(n => n.noTelp && n.noTelp.length > 5);

    if (nasabahList.length === 0) {
      alert('Nasabah yang dipilih tidak memiliki nomor telepon yang valid.');
      return;
    }

    const newItems = nasabahList.map(n => ({
      id:       `Q${Date.now()}-${n.id}`,
      nama:     n.nama || 'Nasabah',
      noTelp:   n.noTelp,
      nominal:  n.nominal || 0,
      message:  processMessage(msgText, n),   // variabel + spintax sudah dirender per-nasabah
      template: tmpl?.nama || 'Pesan Manual',
      status:   'antri',
      waktu:    '--:--',
      error:    '',
    }));

    setQueue(prev => [...prev, ...newItems]);
    setSelectedIds([]);
    setBlastError('');
  };

  // ─────────────────────────────────────────────────────────────
  // ── MULAI BLAST — kirim 1 per 1, tunggu respons nyata ───────
  // ─────────────────────────────────────────────────────────────
  const startBlast = async () => {
    if (!isWorking)         { setBlastError('Di luar jam OJK (08.00–20.00 Sen–Sab)'); return; }
    if (!backendOnline)     { setBlastError('Backend tidak aktif. Jalankan server dulu.'); return; }
    if (!waConnected)       { setBlastError('WhatsApp belum terhubung. Hubungkan di Dashboard.'); return; }
    if (sentToday >= dailyLimit) {
      setBlastError(`Batas pemanasan harian tercapai (${sentToday}/${dailyLimit} pesan). Sistem anti-ban membatasi pengiriman untuk menjaga nomor Anda.`);
      return;
    }

    // Ambil SEMUA item antri dari state saat ini via functional update
    // Simpan di ref agar tidak stale
    let antriItems = [];
    setQueue(prev => {
      antriItems = prev.filter(q => q.status === 'antri');
      return prev;
    });

    // Tunggu micro-task agar state terbaca
    await new Promise(r => setTimeout(r, 50));

    // Re-read from DOM state
    setQueue(prev => {
      antriItems = prev.filter(q => q.status === 'antri');
      return prev;
    });

    if (antriItems.length === 0) {
      setBlastError('Antrian kosong. Pilih nasabah dan tambah ke antrian dulu.');
      return;
    }

    stopRef.current = false;
    setRunning(true);
    setBlastError('');

    for (const item of antriItems) {
      if (stopRef.current) break;

      // Tandai sedang mengirim
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'mengirim' } : q));

      try {
        const r = await fetch('http://localhost:3001/api/send', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ phone: item.noTelp, message: item.message }),
        });
        const result = await r.json();

        if (result.success) {
          const waktu = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'terkirim', waktu } : q));
        } else {
          throw new Error(result.error || 'Gagal');
        }
      } catch (err) {
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'gagal', error: err.message } : q));
        // Jika error "tidak ada sesi" → stop blast
        if (err.message?.includes('sesi') || err.message?.includes('terhubung')) {
          setBlastError(`⛔ Blast dihentikan: ${err.message}`);
          break;
        }
      }

      // Tunggu delay acak/tetap sebelum kirim berikutnya
      if (!stopRef.current) {
        const delay = delayMode === 'fixed'
          ? delayMin * 1000
          : (Math.random() * (delayMax - delayMin) + delayMin) * 1000;
        await new Promise(r => { intervalRef.current = setTimeout(r, delay); });
      }
    }

    setRunning(false);
    stopRef.current = false;
  };

  const pauseBlast = () => {
    stopRef.current = true;
    clearTimeout(intervalRef.current);
    setRunning(false);
    setQueue(prev => prev.map(q => q.status === 'mengirim' ? { ...q, status: 'antri' } : q));
  };

  const stopBlast = () => {
    stopRef.current = true;
    clearTimeout(intervalRef.current);
    setRunning(false);
  };

  const clearQueue = () => {
    if (running) return;
    setQueue([]);
    setBlastError('');
  };

  const qStats = {
    antri:    queue.filter(q => q.status === 'antri').length,
    mengirim: queue.filter(q => q.status === 'mengirim').length,
    terkirim: queue.filter(q => q.status === 'terkirim').length,
    gagal:    queue.filter(q => q.status === 'gagal').length,
  };

  const canBlast = isWorking && queue.filter(q => q.status === 'antri').length > 0;

  // ═══════════════════════════════════════════════════════════
  return (
    <div className="page-enter space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Bulk Blast & Queue Control</h1>
          <p className="text-slate-400 text-sm">Pusat pengiriman pesan massal anti-blokir</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Anti-Ban Warmup Badge */}
          {backendOnline && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-slate-800 border-slate-700 text-slate-300">
              <span className="text-yellow-400 font-semibold">🛡️ Pemanasan Hari ke-{warmupDay}</span>
              <span className="text-slate-600">|</span>
              <span className={sentToday >= dailyLimit ? 'text-red-400 font-bold' : 'text-teal-400'}>
                {sentToday}/{dailyLimit} kuota
              </span>
            </div>
          )}

          {/* WA Status */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
            waConnected ? 'bg-teal-900/30 border-teal-700/50 text-teal-400' : 'bg-red-900/20 border-red-700/40 text-red-400'
          }`}>
            {waConnected ? <><Wifi size={12}/> WA Terhubung</> : <><WifiOff size={12}/> WA Terputus</>}
          </div>
          <div className="flex items-center gap-1.5 text-slate-300 font-mono text-sm">
            <Clock size={13} className="text-slate-400" />
            {now.toLocaleTimeString('id-ID')}
          </div>
        </div>
      </div>

      {/* OJK Banner */}
      {!isWorking ? (
        <div className="flex items-start gap-3 p-4 bg-red-900/30 border border-red-700/50 rounded-xl">
          <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-300">⛔ Pengiriman Diblokir — Di Luar Jam OJK</p>
            <p className="text-sm text-red-400/80 mt-1">
              Regulasi OJK: pengiriman hanya <strong>Senin–Sabtu, 08.00–20.00 WIB</strong>.
              Sekarang: <strong>{now.toLocaleString('id-ID', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}</strong>
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 bg-teal-900/20 border border-teal-700/40 rounded-xl">
          <CheckCircle size={16} className="text-teal-400" />
          <p className="text-sm text-teal-300"><strong>Jam OJK Aktif</strong> — Pengiriman diizinkan hingga 20.00 WIB</p>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-xs text-teal-400 font-medium">COMPLIANCE OK</span>
          </div>
        </div>
      )}

      {/* WA Tidak Terhubung Warning */}
      {!waConnected && backendOnline && (
        <div className="flex items-center gap-3 p-3 bg-yellow-900/20 border border-yellow-700/40 rounded-xl">
          <AlertTriangle size={16} className="text-yellow-400" />
          <p className="text-sm text-yellow-300">
            WhatsApp belum terhubung. Pergi ke <strong>Dashboard</strong> dan hubungkan WA terlebih dahulu.
          </p>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Kiri: Setup ─────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-4">

          {/* 1. Tulis Pesan */}
          <div className="card">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <MessageSquare size={15} className="text-teal-400"/> Pesan
            </h3>

            {/* TAB: Pesan Manual vs Template */}
            <div className="flex gap-1 mb-3 p-1 bg-slate-800/60 rounded-xl">
              <button
                onClick={() => { setUseCustomMsg(true); setSelectedTemplate(''); }}
                className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-all ${
                  useCustomMsg ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-300'
                }`}>
                ✏️ Tulis Manual
              </button>
              <button
                onClick={() => setUseCustomMsg(false)}
                className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-all ${
                  !useCustomMsg ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-300'
                }`}>
                📋 Template
              </button>
            </div>

            {/* Pesan Manual */}
            {useCustomMsg && (
              <div className="space-y-2">
                <textarea
                  value={customMsg}
                  onChange={e => setCustomMsg(e.target.value)}
                  placeholder={`Ketik pesan Anda di sini...\n\nGunakan {nama} untuk menyisipkan nama nasabah secara otomatis.\n\nContoh:\nHalo {nama}, kami mengingatkan tagihan Anda. Mohon segera melakukan pembayaran. Terima kasih 🙏`}
                  rows={7}
                  className="input-field w-full text-sm"
                />
                <p className="text-xs text-slate-500">💡 Tip: tulis <code className="bg-slate-700 px-1 rounded">{'{nama}'}</code> → diganti otomatis dengan nama tiap nasabah</p>
              </div>
            )}

            {/* Template List */}
            {!useCustomMsg && (
              <div className="space-y-2">
                {READY_TEMPLATES.map(t => (
                  <button key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${
                      selectedTemplate === t.id
                        ? 'border-teal-600 bg-teal-900/20 text-teal-200'
                        : 'border-slate-600 bg-slate-700/30 text-slate-300 hover:border-slate-500'
                    }`}>
                    <p className="font-medium">{t.nama}</p>
                    <p className="text-xs opacity-60 mt-0.5">{t.kategori}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Preview */}
            {previewMsg && (
              <div className="mt-3">
                <p className="text-xs text-slate-500 mb-1.5">Preview (nasabah pertama):</p>
                <div className="bg-[#1a2e1a] border border-teal-900/50 rounded-xl p-3">
                  <div className="bg-[#25d366]/15 rounded-lg p-2.5 max-w-[90%]">
                    <p className="text-xs text-green-200 whitespace-pre-wrap leading-relaxed">{previewMsg}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Delay Settings */}
          <div className="card">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Timer size={15} className="text-teal-400" /> Kecepatan Kirim
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { val: 'random', label: '🎲 Acak', sub: `${delayMin}–${delayMax}s`, rec: true },
                  { val: 'fixed',  label: '⏱ Tetap', sub: `${delayMin}s`, rec: false },
                ].map(m => (
                  <button key={m.val} onClick={() => setDelayMode(m.val)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      delayMode === m.val ? 'border-teal-600 bg-teal-900/20 text-teal-300' : 'border-slate-600 bg-slate-700/40 text-slate-400 hover:border-slate-500'
                    }`}>
                    <p className="text-sm font-medium">{m.label}</p>
                    <p className="text-xs opacity-70">{m.sub}</p>
                    {m.rec && <p className="text-xs text-teal-500 mt-0.5">⭐ Rekomendasi</p>}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Min (detik)</label>
                  <input type="number" className="input-field" min={1} max={60} value={delayMin} onChange={e => setDelayMin(Number(e.target.value))} />
                </div>
                {delayMode === 'random' && (
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Max (detik)</label>
                    <input type="number" className="input-field" min={delayMin} max={120} value={delayMax} onChange={e => setDelayMax(Number(e.target.value))} />
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500">💡 Rekomendasi: acak 5–10 detik untuk keamanan nomor</p>
            </div>
          </div>
        </div>

        {/* ── Tengah: Pilih Nasabah ───────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Pilih Nasabah */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Users size={15} className="text-teal-400" />
                Pilih Nasabah ({allNasabah.filter(n => n.status !== 'Lunas').length} aktif)
              </h3>
              {selectedIds.length > 0 && (
                <button onClick={buildQueue} className="btn-primary !py-1.5 !px-3 text-xs">
                  <ChevronRight size={13} /> Tambah {selectedIds.length} ke Antrian
                </button>
              )}
            </div>

            <div className="relative mb-3">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Cari nama atau nomor..." className="input-field pl-8 w-full text-sm" />
            </div>

            {/* Select All */}
            <div className="flex items-center gap-3 mb-2 px-1">
              <input type="checkbox" checked={selectedIds.length === filtered.length && filtered.length > 0} onChange={toggleAll} className="rounded" />
              <span className="text-xs text-slate-400">Pilih semua ({filtered.length})</span>
              {selectedIds.length > 0 && <span className="text-xs text-teal-400 ml-auto">{selectedIds.length} dipilih</span>}
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
              {filtered.length === 0 && (
                <p className="text-center text-slate-500 text-sm py-6">Tidak ada nasabah aktif</p>
              )}
              {filtered.map(n => (
                <label key={n.id} className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border transition-all ${
                  selectedIds.includes(n.id) ? 'bg-teal-900/20 border-teal-700/50' : 'bg-slate-700/20 border-slate-700/30 hover:bg-slate-700/40'
                }`}>
                  <input type="checkbox" checked={selectedIds.includes(n.id)} onChange={() => toggleSelect(n.id)} className="rounded flex-shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{n.nama || '—'}</p>
                    <p className="text-xs text-slate-400 font-mono">{n.noTelp || 'No telp kosong'}</p>
                  </div>
                  {(n.nominal > 0 || n.jatuhTempo) && (
                    <div className="text-right flex-shrink-0">
                      {n.nominal > 0 && <p className="text-xs text-teal-400 font-semibold">{formatRupiah(n.nominal)}</p>}
                      {n.jatuhTempo && <p className="text-xs text-slate-500">{n.jatuhTempo}</p>}
                    </div>
                  )}
                </label>
              ))}
            </div>

            {selectedIds.length > 0 && (
              <button onClick={buildQueue}
                disabled={!(useCustomMsg ? customMsg.trim() : selectedTemplate)}
                className="btn-primary w-full justify-center mt-3 disabled:opacity-40 disabled:cursor-not-allowed">
                <Send size={14} /> Tambahkan {selectedIds.length} Nasabah ke Antrian
              </button>
            )}
            {selectedIds.length > 0 && !(useCustomMsg ? customMsg.trim() : selectedTemplate) && (
              <p className="text-xs text-yellow-400 text-center mt-2">⚠ Tulis pesan atau pilih template dulu</p>
            )}
          </div>

          {/* ── Queue Control ─────────────────────────────── */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Zap size={15} className="text-teal-400" /> Antrian & Kontrol
              </h3>
              <div className="flex items-center gap-2">
                {/* Stats */}
                {[
                  { label: 'Antri',    val: qStats.antri,    color: 'text-slate-400' },
                  { label: 'Terkirim', val: qStats.terkirim, color: 'text-teal-400' },
                  { label: 'Gagal',    val: qStats.gagal,    color: 'text-red-400' },
                ].map(s => (
                  <span key={s.label} className="text-xs">
                    <span className={`font-bold ${s.color}`}>{s.val}</span>
                    <span className="text-slate-500 ml-0.5">{s.label}</span>
                  </span>
                ))}
                {queue.length > 0 && (
                  <button onClick={clearQueue} className="p-1.5 rounded-lg bg-slate-700/60 text-slate-400 hover:text-red-400 transition-colors ml-1">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Blast Error */}
            {blastError && (
              <div className="mb-3 flex items-start gap-2 p-3 bg-red-900/20 border border-red-700/40 rounded-xl">
                <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5"/>
                <p className="text-sm text-red-300 flex-1">{blastError}</p>
                <button onClick={() => setBlastError('')} className="text-red-500 hover:text-red-300 flex-shrink-0">×</button>
              </div>
            )}

            {/* Progress summary saat running */}
            {running && (
              <div className="mb-3 p-3 bg-blue-900/20 border border-blue-700/40 rounded-xl">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-blue-300 font-medium animate-pulse">⏳ Mengirim...</span>
                  <span className="text-slate-400">{qStats.terkirim}/{qStats.terkirim + qStats.antri + qStats.mengirim} terkirim</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${((qStats.terkirim) / Math.max(queue.length, 1)) * 100}%` }}/>
                </div>
              </div>
            )}

            {/* Play/Pause/Stop Controls */}
            <div className="flex gap-2 mb-4">
              {!running ? (
                <button onClick={startBlast}
                  disabled={qStats.antri === 0}
                  className="btn-primary flex-1 justify-center disabled:opacity-40 disabled:cursor-not-allowed">
                  <Play size={15}/>
                  {qStats.antri === 0 ? 'Antrian Kosong' : `▶ Mulai Blast (${qStats.antri} pesan)`}
                </button>
              ) : (
                <>
                  <button onClick={pauseBlast} className="btn-secondary flex-1 justify-center">
                    <Pause size={15}/> Jeda
                  </button>
                  <button onClick={stopBlast} className="btn-danger flex-1 justify-center">
                    <StopCircle size={15}/> Stop
                  </button>
                </>
              )}
            </div>

            {/* Queue List */}
            {queue.length === 0 ? (
              <div className="text-center py-10 text-slate-600">
                <Send size={28} className="mx-auto mb-2 opacity-30"/>
                <p className="text-sm">Belum ada antrian.</p>
                <p className="text-xs mt-1 opacity-60">Pilih nasabah → klik "Tambahkan ke Antrian"</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {queue.map((item, i) => {
                  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG['antri'];
                  const Icon = cfg.icon;
                  return (
                    <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border ${cfg.bg} transition-all`}>
                      <span className="text-xs text-slate-500 w-5 flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{item.nama}</p>
                        <p className="text-xs text-slate-400 font-mono truncate">{item.noTelp}</p>
                        {item.status === 'gagal' && item.error && (
                          <p className="text-xs text-red-400 mt-0.5 truncate">{item.error}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Icon size={14} className={`${cfg.color} ${cfg.spin ? 'animate-spin' : ''}`}/>
                        <span className={`text-xs font-medium ${cfg.color}`}>{item.status}</span>
                        {item.waktu && item.waktu !== '--:--' && (
                          <span className="text-xs text-slate-500">{item.waktu}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
