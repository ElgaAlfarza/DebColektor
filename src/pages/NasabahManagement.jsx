import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  Upload, Search, Filter, Edit2, Trash2, Eye, ChevronDown,
  FileSpreadsheet, Plus, AlertCircle, CheckCircle, Clock,
  Download, RefreshCw, SortAsc, Info, X, Shield, Sparkles
} from 'lucide-react';
import { mockNasabah, formatRupiah } from '../data/mockData';
import {
  getStoredNasabah,
  saveStoredNasabah,
  clearStoredNasabah,
  getStoredNasabahMeta,
} from '../services/storage';

const STATUS_CONFIG = {
  'Lunas':      { cls: 'badge-lunas', icon: CheckCircle },
  'Janji Bayar':{ cls: 'badge-janji', icon: Clock },
  'Belum Bayar':{ cls: 'badge-belum', icon: AlertCircle },
};

// ─── Auto-detect kolom secara fleksibel ──────────────────────
// Mencocokkan berbagai nama kolom yang mungkin dipakai user
const COLUMN_ALIASES = {
  nama: [
    'nama', 'name', 'nama nasabah', 'customer name', 'debitur',
    'nama debitur', 'nama lengkap', 'full name', 'pelanggan',
  ],
  noTelp: [
    'nomor telepon', 'no telepon', 'no.telepon', 'no telp', 'notelp',
    'no hp', 'nohp', 'phone', 'phone number', 'mobile', 'handphone',
    'nomor hp', 'nomor wa', 'no wa', 'whatsapp', 'telepon', 'telpon',
    'hp', 'contact', 'kontak',
  ],
  nominal: [
    'nominal tunggakan', 'nominal', 'tunggakan', 'jumlah', 'amount',
    'tagihan', 'hutang', 'saldo', 'outstanding', 'total tagihan',
    'jumlah tagihan', 'nominal hutang', 'baki debet', 'pokok',
    'total hutang', 'sisa hutang', 'angsuran',
  ],
  jatuhTempo: [
    'tanggal jatuh tempo', 'jatuh tempo', 'due date', 'tgl jatuh tempo',
    'tanggal', 'tgl', 'deadline', 'tempo', 'jatuh', 'expire date',
    'tgl tagihan', 'tanggal tagihan',
  ],
  linkPembayaran: [
    'link pembayaran', 'link', 'url', 'payment link', 'url pembayaran',
    'link bayar', 'url bayar', 'payment url', 'va', 'virtual account',
    'no rekening', 'rekening', 'link tagihan',
  ],
};

function detectColumn(headers) {
  const result = {};
  const used = new Set();

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const header of headers) {
      const normalized = header.toLowerCase().trim();
      if (!used.has(header) && aliases.includes(normalized)) {
        result[field] = header;
        used.add(header);
        break;
      }
    }
    // Jika tidak ada yang cocok persis, coba partial match
    if (!result[field]) {
      for (const header of headers) {
        const normalized = header.toLowerCase().trim();
        if (!used.has(header)) {
          const match = aliases.some(a => normalized.includes(a) || a.includes(normalized));
          if (match) {
            result[field] = header;
            used.add(header);
            break;
          }
        }
      }
    }
  }

  return result; // { nama: 'Nama Nasabah', noTelp: 'No HP', ... }
}

function formatPhone(raw) {
  if (!raw) return '';
  let n = String(raw).replace(/[\s\-\.\(\)]/g, '');
  // Hapus karakter non-digit kecuali + di awal
  n = n.replace(/[^\d+]/g, '');
  if (n.startsWith('+')) n = n.slice(1);
  if (n.startsWith('0')) n = '62' + n.slice(1);
  if (!n.startsWith('62')) n = '62' + n;
  return n;
}

function formatNominal(raw) {
  if (!raw) return 0;
  const n = String(raw).replace(/[^\d]/g, '');
  return parseInt(n, 10) || 0;
}

function parseRows(rows, colMap) {
  return rows
    .filter(row => row && Object.values(row).some(v => v !== null && v !== ''))
    .map((row, i) => ({
      id: Date.now() + i,
      nama:           colMap.nama          ? String(row[colMap.nama] || '').trim()     : `Baris ${i + 1}`,
      noTelp:         colMap.noTelp        ? formatPhone(row[colMap.noTelp])            : '',
      nominal:        colMap.nominal       ? formatNominal(row[colMap.nominal])         : 0,
      jatuhTempo:     colMap.jatuhTempo    ? String(row[colMap.jatuhTempo] || '').trim(): '',
      linkPembayaran: colMap.linkPembayaran? String(row[colMap.linkPembayaran] || '').trim(): '',
      status: 'Belum Bayar',
      tagihan: 1,
      agen: '-',
      _raw: row, // simpan data asli untuk referensi
    }))
    .filter(r => r.nama); // buang baris kosong
}

const csvTemplate = `Nama,Nomor Telepon,Nominal Tunggakan,Tanggal Jatuh Tempo,Link Pembayaran\nBudi Santoso,628112345678,4500000,2026-09-10,https://pay.example.com/budi001\nSiti Rahayu,628123456789,12000000,2026-09-08,https://pay.example.com/siti002`;

export default function NasabahManagement() {
  const [data, setData] = useState(() => getStoredNasabah());
  const [meta, setMeta] = useState(() => getStoredNasabahMeta());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [unmappedCols, setUnmappedCols] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const fileRef = useRef();

  // Sinkronisasi data & meta masa berlaku 24 jam
  useEffect(() => {
    const handleUpdate = () => {
      setData(getStoredNasabah());
      setMeta(getStoredNasabahMeta());
    };
    window.addEventListener('nasabah:updated', handleUpdate);
    const interval = setInterval(() => {
      const currentMeta = getStoredNasabahMeta();
      setMeta(currentMeta);
      if (!currentMeta && data.length > 0) {
        setData([]);
      }
    }, 30000);
    return () => {
      window.removeEventListener('nasabah:updated', handleUpdate);
      clearInterval(interval);
    };
  }, [data.length]);

  // Update data & simpan dengan stempel waktu
  const updateData = (newData) => {
    setData(newData);
    saveStoredNasabah(newData);
    setMeta(getStoredNasabahMeta());
  };

  const handleClearAll = () => {
    if (window.confirm('Hapus seluruh data nasabah sesi ini?\n\nData yang di-upload akan langsung dihapus bersih dari browser dan tidak tersimpan lagi.')) {
      clearStoredNasabah();
      setData([]);
      setSelectedRows([]);
      setUploadResult({ info: 'Seluruh data nasabah sesi ini telah dihapus bersih.' });
      setMeta(null);
    }
  };

  const loadDemoData = () => {
    updateData(mockNasabah);
    setUploadResult({
      success: true,
      count: mockNasabah.length,
      fileName: 'data_contoh_demo.xlsx',
      colMap: { nama: 'Nama', noTelp: 'No Telepon', nominal: 'Nominal', jatuhTempo: 'Jatuh Tempo' }
    });
  };

  const filtered = data.filter(n => {
    const matchSearch = n.nama.toLowerCase().includes(search.toLowerCase()) ||
      n.noTelp.includes(search);
    const matchStatus = filterStatus === 'Semua' || n.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // ─── File Processing ─────────────────────────────────────
  const processFile = (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    setUploading(true);
    setUploadResult(null);
    setPreviewData(null);

    if (ext === 'csv' || ext === 'txt') {
      // CSV
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        complete: (result) => handleParsed(result.data, result.meta.fields || [], file.name),
        error: (err) => {
          setUploading(false);
          setUploadResult({ error: `Gagal membaca CSV: ${err.message}` });
        },
      });
    } else if (['xlsx', 'xls', 'xlsm', 'ods'].includes(ext)) {
      // Excel
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]]; // ambil sheet pertama
          const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
          const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
          handleParsed(rows, headers, file.name);
        } catch (err) {
          setUploading(false);
          setUploadResult({ error: `Gagal membaca Excel: ${err.message}` });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setUploading(false);
      setUploadResult({ error: `Format tidak didukung: .${ext}\nGunakan .csv, .xlsx, atau .xls` });
    }
  };

  const handleParsed = (rows, headers, fileName) => {
    const colMap = detectColumn(headers);
    const parsed = parseRows(rows, colMap);

    // Kolom yang tidak ter-mapping
    const mappedHeaders = new Set(Object.values(colMap));
    const unmapped = headers.filter(h => !mappedHeaders.has(h));

    setUploading(false);

    if (parsed.length === 0) {
      setUploadResult({ error: 'File kosong atau tidak ada data yang bisa dibaca.' });
      return;
    }

    // Tampilkan preview dulu
    setPreviewData({ parsed, colMap, unmapped, fileName, totalRows: rows.length });
    setUnmappedCols(unmapped);
  };

  const confirmImport = () => {
    if (!previewData) return;
    const combined = [...data, ...previewData.parsed];
    updateData(combined);
    setUploadResult({
      success: true,
      count: previewData.parsed.length,
      fileName: previewData.fileName,
      colMap: previewData.colMap,
    });
    setPreviewData(null);
  };

  const handleFileDrop = (e) => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]); };
  const toggleSelect  = (id) => setSelectedRows(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll     = () => setSelectedRows(prev => prev.length === filtered.length ? [] : filtered.map(n => n.id));
  const handleStatusChange = (id, s) => updateData(data.map(n => n.id === id ? { ...n, status: s } : n));
  const handleDelete  = (id) => {
    updateData(data.filter(n => n.id !== id));
    setSelectedRows(prev => prev.filter(x => x !== id));
  };
  const handleDeleteSelected = () => {
    updateData(data.filter(n => !selectedRows.includes(n.id)));
    setSelectedRows([]);
  };

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'template_nasabah.csv'; a.click();
  };

  const FIELD_LABELS = { nama: 'Nama', noTelp: 'No Telepon', nominal: 'Nominal', jatuhTempo: 'Jatuh Tempo', linkPembayaran: 'Link Bayar' };

  return (
    <div className="page-enter space-y-5">
      {/* ─── Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Manajemen Data Nasabah</h1>
          <p className="text-slate-400 text-sm">
            Total {data.length} nasabah · {data.filter(n => n.status === 'Lunas').length} lunas · {data.filter(n => n.status === 'Belum Bayar').length} belum bayar
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.length > 0 && (
            <button onClick={handleClearAll} className="btn-secondary text-red-400 hover:text-red-300 border-red-800/40">
              <Trash2 size={14} /> Hapus Semua Data
            </button>
          )}
          <button onClick={downloadTemplate} className="btn-secondary">
            <Download size={14} /> Template CSV
          </button>
          <button onClick={() => fileRef.current.click()} className="btn-primary">
            <Plus size={14} /> Upload Data
          </button>
        </div>
      </div>

      {/* ─── Privacy & Auto-expiry Banner ──────────────────── */}
      {meta && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-900/80 border border-slate-700/70 rounded-xl text-xs">
          <div className="flex items-center gap-2.5 text-slate-300">
            <div className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex-shrink-0">
              <Shield size={16} />
            </div>
            <div>
              <p className="font-semibold text-slate-200">
                Mode Privasi Sesi: Otomatis Terhapus dalam{' '}
                <span className="text-amber-400 font-bold font-mono">
                  {meta.remainingHours} jam {meta.remainingMinutes} menit
                </span>
              </p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Data nasabah yang di-upload hanya tersimpan sementara dan akan otomatis dibersihkan 1x24 jam demi keamanan data Anda.
              </p>
            </div>
          </div>
          <button
            onClick={handleClearAll}
            className="text-red-400 hover:text-red-300 underline font-medium cursor-pointer self-start sm:self-auto flex items-center gap-1 flex-shrink-0"
          >
            <Trash2 size={12} /> Hapus Sekarang
          </button>
        </div>
      )}

      {/* ─── Upload Zone ────────────────────────────────────── */}
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
          dragOver ? 'border-teal-500 bg-teal-900/20' : 'border-slate-600 hover:border-slate-500 bg-slate-800/30'
        }`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleFileDrop}
        onClick={() => fileRef.current.click()}
      >
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.xlsm,.ods,.txt" className="hidden"
          onChange={e => { processFile(e.target.files[0]); e.target.value = ''; }} />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <RefreshCw size={28} className="text-teal-400 animate-spin" />
            <p className="text-slate-300 font-medium">Membaca file & mendeteksi kolom...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <FileSpreadsheet size={32} className="text-slate-400" />
            <p className="text-slate-300 font-medium">Drop file di sini atau klik untuk pilih</p>
            <p className="text-slate-500 text-sm">Mendukung: <strong className="text-slate-400">CSV, XLSX, XLS, ODS</strong> — kolom bebas, terdeteksi otomatis</p>
          </div>
        )}
      </div>

      {/* ─── Hasil Upload ─────────────────────────────────── */}
      {uploadResult?.error && (
        <div className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-700/40 rounded-xl">
          <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-300">Upload Gagal</p>
            <p className="text-sm text-red-400 mt-1 whitespace-pre-line">{uploadResult.error}</p>
          </div>
        </div>
      )}

      {uploadResult?.success && (
        <div className="flex items-start gap-3 p-4 bg-teal-900/20 border border-teal-700/40 rounded-xl">
          <CheckCircle size={18} className="text-teal-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-teal-300">✅ {uploadResult.count} nasabah berhasil diimpor dari "{uploadResult.fileName}"</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {Object.entries(uploadResult.colMap).map(([field, col]) => (
                <span key={field} className="text-xs text-slate-400">
                  <span className="text-slate-500">{FIELD_LABELS[field]}:</span> <span className="text-teal-400">"{col}"</span>
                </span>
              ))}
            </div>
          </div>
          <button onClick={() => setUploadResult(null)} className="text-slate-500 hover:text-slate-300"><X size={16}/></button>
        </div>
      )}

      {uploadResult?.info && (
        <div className="flex items-start gap-3 p-4 bg-blue-900/20 border border-blue-700/40 rounded-xl">
          <Info size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-blue-300">Informasi Sesi</p>
            <p className="text-sm text-blue-200 mt-0.5">{uploadResult.info}</p>
          </div>
          <button onClick={() => setUploadResult(null)} className="text-slate-500 hover:text-slate-300"><X size={16}/></button>
        </div>
      )}

      {/* ─── Preview Modal ──────────────────────────────────── */}
      {previewData && (
        <div className="border border-blue-700/40 bg-blue-900/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-blue-300 flex items-center gap-2">
              <Info size={16}/> Preview Import — "{previewData.fileName}"
            </p>
            <button onClick={() => setPreviewData(null)} className="text-slate-500 hover:text-slate-300"><X size={16}/></button>
          </div>

          {/* Mapping kolom terdeteksi */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(previewData.colMap).map(([field, col]) => (
              <div key={field} className="bg-slate-800/60 rounded-lg px-3 py-2 text-xs">
                <p className="text-slate-500">{FIELD_LABELS[field]}</p>
                <p className="text-teal-400 font-medium truncate">✓ "{col}"</p>
              </div>
            ))}
            {['nama','noTelp','nominal','jatuhTempo','linkPembayaran']
              .filter(f => !previewData.colMap[f])
              .map(f => (
                <div key={f} className="bg-slate-800/60 rounded-lg px-3 py-2 text-xs border border-yellow-700/30">
                  <p className="text-slate-500">{FIELD_LABELS[f]}</p>
                  <p className="text-yellow-500">⚠ Tidak terdeteksi</p>
                </div>
              ))
            }
          </div>

          {/* Kolom yang tidak dikenali */}
          {previewData.unmapped.length > 0 && (
            <p className="text-xs text-slate-500">
              Kolom tidak dipakai: {previewData.unmapped.map(c => `"${c}"`).join(', ')} (data tetap tersimpan)
            </p>
          )}

          {/* Preview 3 baris pertama */}
          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="w-full text-xs">
              <thead className="bg-slate-800">
                <tr>
                  {['Nama','No Telepon','Nominal','Jatuh Tempo'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-slate-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.parsed.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-t border-slate-700/50">
                    <td className="px-3 py-2 text-white">{row.nama || <span className="text-red-400">Kosong</span>}</td>
                    <td className="px-3 py-2 text-slate-300">{row.noTelp || <span className="text-yellow-400">-</span>}</td>
                    <td className="px-3 py-2 text-slate-300">{row.nominal ? formatRupiah(row.nominal) : '-'}</td>
                    <td className="px-3 py-2 text-slate-300">{row.jatuhTempo || '-'}</td>
                  </tr>
                ))}
                {previewData.parsed.length > 5 && (
                  <tr className="border-t border-slate-700/50">
                    <td colSpan={4} className="px-3 py-2 text-slate-500 text-center">
                      ... dan {previewData.parsed.length - 5} baris lainnya
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <button onClick={confirmImport} className="btn-primary">
              <CheckCircle size={14}/> Import {previewData.parsed.length} Nasabah
            </button>
            <button onClick={() => setPreviewData(null)} className="btn-secondary">
              Batal
            </button>
          </div>
        </div>
      )}

      {/* ─── Filters ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atau nomor..."
            className="input-field pl-9 w-full" />
        </div>
        <div className="flex gap-2">
          {['Semua','Belum Bayar','Janji Bayar','Lunas'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                filterStatus === s ? 'bg-teal-600 text-white' : 'bg-slate-700/60 text-slate-400 hover:bg-slate-700'
              }`}>{s}</button>
          ))}
        </div>
        {selectedRows.length > 0 && (
          <button onClick={handleDeleteSelected} className="btn-danger">
            <Trash2 size={14} /> Hapus {selectedRows.length}
          </button>
        )}
      </div>

      {/* ─── Table ───────────────────────────────────────────── */}
      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/80">
              <tr>
                <th className="w-10 px-4 py-3"><input type="checkbox" checked={selectedRows.length === filtered.length && filtered.length > 0} onChange={toggleAll} className="rounded" /></th>
                {['Nama Nasabah','No Telepon','Tunggakan','Jatuh Tempo','Status','Aksi'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filtered.map(n => {
                const S = STATUS_CONFIG[n.status] || STATUS_CONFIG['Belum Bayar'];
                const Icon = S.icon;
                return (
                  <tr key={n.id} className={`hover:bg-slate-700/30 transition-colors ${selectedRows.includes(n.id) ? 'bg-slate-700/20' : ''}`}>
                    <td className="px-4 py-3"><input type="checkbox" checked={selectedRows.includes(n.id)} onChange={() => toggleSelect(n.id)} /></td>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium text-sm">{n.nama}</p>
                      <p className="text-slate-500 text-xs mt-0.5">Agen: {n.agen || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-sm font-mono">{n.noTelp}</td>
                    <td className="px-4 py-3 text-teal-400 text-sm font-semibold">{formatRupiah(n.nominal)}</td>
                    <td className="px-4 py-3 text-slate-400 text-sm">{n.jatuhTempo}</td>
                    <td className="px-4 py-3">
                      <select value={n.status} onChange={e => handleStatusChange(n.id, e.target.value)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium border-0 cursor-pointer outline-none ${S.cls}`}>
                        <option>Belum Bayar</option>
                        <option>Janji Bayar</option>
                        <option>Lunas</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {n.linkPembayaran && (
                          <a href={n.linkPembayaran} target="_blank" rel="noreferrer"
                            className="p-1.5 rounded-lg bg-slate-700/60 text-slate-400 hover:text-teal-400 transition-colors">
                            <Eye size={13} />
                          </a>
                        )}
                        <button onClick={() => handleDelete(n.id)}
                          className="p-1.5 rounded-lg bg-slate-700/60 text-slate-400 hover:text-red-400 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <p className="font-medium text-slate-400">Tidak ada data nasabah</p>
                    <p className="text-xs text-slate-500 mt-1">Silakan upload file Excel / CSV di atas atau gunakan data contoh</p>
                    <button onClick={loadDemoData} className="btn-secondary text-xs mx-auto mt-3">
                      <Sparkles size={13} className="text-yellow-400" /> Muat Data Contoh (Demo)
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-slate-800/40 border-t border-slate-700/50 flex items-center justify-between">
          <p className="text-xs text-slate-500">Menampilkan {filtered.length} dari {data.length} nasabah</p>
          {selectedRows.length > 0 && (
            <p className="text-xs text-teal-400">{selectedRows.length} dipilih</p>
          )}
        </div>
      </div>
    </div>
  );
}
