import React, { useState } from 'react';
import {
  Plus, Edit2, Trash2, Copy, Eye, RefreshCw, Save, X,
  MessageSquare, Tag, Zap, ChevronDown, CheckCircle
} from 'lucide-react';
import { mockTemplates } from '../data/mockData';

const SPINTAX_OPTIONS = [
  '{Halo|Selamat pagi|Yth. Bapak/Ibu}',
  '{Hai|Halo|Salam sejahtera}',
  '{Semoga|Mudah-mudahan|Kami berharap}',
  '{Mohon|Harap|Kami mohon}',
  '{Terima kasih|Salam hormat|Best regards}',
];

const PLACEHOLDERS = ['{{Nama}}', '{{Nominal}}', '{{JatuhTempo}}', '{{LinkPembayaran}}'];

function resolveSpintax(text) {
  return text.replace(/\{([^}]+)\}/g, (match, options) => {
    const opts = options.split('|');
    return opts[Math.floor(Math.random() * opts.length)];
  });
}

function TemplateCard({ tmpl, onEdit, onDelete, onDuplicate }) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewText, setPreviewText] = useState('');

  const preview = () => {
    const resolved = resolveSpintax(tmpl.isi)
      .replace('{{Nama}}', 'Budi Santoso')
      .replace('{{Nominal}}', 'Rp 4.500.000')
      .replace('{{JatuhTempo}}', '10 September 2026')
      .replace('{{LinkPembayaran}}', 'https://pay.example.com/budi001');
    setPreviewText(resolved);
    setShowPreview(true);
  };

  const KATEGORI_COLOR = {
    'Pengingat': 'bg-blue-900/50 text-blue-400',
    'Peringatan': 'bg-red-900/50 text-red-400',
    'Konfirmasi': 'bg-teal-900/50 text-teal-400',
  };

  return (
    <div className="card hover:border-slate-600 transition-colors group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${KATEGORI_COLOR[tmpl.kategori]}`}>
            {tmpl.kategori}
          </span>
          {tmpl.tombolInteraktif && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/50 text-purple-400">Tombol Aktif</span>
          )}
          {tmpl.allowUnsubscribe && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">Unsubscribe</span>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onDuplicate(tmpl)} className="p-1.5 rounded-lg hover:bg-slate-600 text-slate-400 hover:text-slate-200 transition-colors" title="Duplikat"><Copy size={13} /></button>
          <button onClick={() => onEdit(tmpl)} className="p-1.5 rounded-lg hover:bg-slate-600 text-slate-400 hover:text-slate-200 transition-colors" title="Edit"><Edit2 size={13} /></button>
          <button onClick={() => onDelete(tmpl.id)} className="p-1.5 rounded-lg hover:bg-red-900/40 text-slate-400 hover:text-red-400 transition-colors" title="Hapus"><Trash2 size={13} /></button>
        </div>
      </div>
      <h3 className="font-semibold text-white mb-2">{tmpl.nama}</h3>
      <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans leading-relaxed bg-slate-900/50 rounded-lg p-3 max-h-32 overflow-hidden relative">
        {tmpl.isi}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-900/50 to-transparent rounded-b-lg" />
      </pre>

      <div className="flex gap-2 mt-3">
        <button onClick={preview} className="btn-secondary flex-1 justify-center !py-1.5">
          <Eye size={13} /> Preview
        </button>
        <button onClick={() => onEdit(tmpl)} className="btn-primary flex-1 justify-center !py-1.5">
          <Edit2 size={13} /> Edit
        </button>
      </div>

      {showPreview && (
        <div className="mt-3 p-3 bg-[#075e54] rounded-xl border border-[#128c7e]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-teal-300 font-medium flex items-center gap-1"><Eye size={11} /> Preview Pesan WA</span>
            <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-white"><X size={13} /></button>
          </div>
          <div className="bg-[#dcf8c6] rounded-xl rounded-tl-none p-3 max-w-xs">
            <p className="text-slate-900 text-xs whitespace-pre-wrap leading-relaxed">{previewText}</p>
            {tmpl.tombolInteraktif && (
              <div className="mt-2 space-y-1.5 border-t border-slate-300/40 pt-2">
                <button className="w-full text-xs text-[#128c7e] font-semibold py-1 border border-[#128c7e]/40 rounded-lg bg-white/60">✅ Konfirmasi Pembayaran</button>
                <button className="w-full text-xs text-[#128c7e] font-semibold py-1 border border-[#128c7e]/40 rounded-lg bg-white/60">🙏 Minta Keringanan</button>
              </div>
            )}
            {tmpl.allowUnsubscribe && (
              <button className="w-full text-xs text-slate-500 py-1 mt-1 border-t border-slate-300/30">Berhenti Menerima Pesan</button>
            )}
          </div>
          <button
            onClick={preview}
            className="mt-2 flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300"
          >
            <RefreshCw size={11} /> Spin ulang
          </button>
        </div>
      )}
    </div>
  );
}

function TemplateEditor({ tmpl, onSave, onClose }) {
  const [form, setForm] = useState(tmpl || {
    nama: '',
    isi: '',
    tombolInteraktif: false,
    allowUnsubscribe: false,
    kategori: 'Pengingat',
  });

  const insertPlaceholder = (ph) => {
    setForm(prev => ({ ...prev, isi: prev.isi + ph }));
  };

  const insertSpintax = (sp) => {
    setForm(prev => ({ ...prev, isi: prev.isi + sp }));
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="font-bold text-white text-lg">{tmpl?.id ? 'Edit Template' : 'Buat Template Baru'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Nama Template</label>
              <input
                className="input-field"
                placeholder="cth: Pengingat Jatuh Tempo"
                value={form.nama}
                onChange={e => setForm(prev => ({ ...prev, nama: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Kategori</label>
              <select
                className="input-field"
                value={form.kategori}
                onChange={e => setForm(prev => ({ ...prev, kategori: e.target.value }))}
              >
                <option value="Pengingat">Pengingat</option>
                <option value="Peringatan">Peringatan</option>
                <option value="Konfirmasi">Konfirmasi</option>
              </select>
            </div>
          </div>

          {/* Placeholder Buttons */}
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block font-medium">Sisipkan Placeholder Dinamis</label>
            <div className="flex flex-wrap gap-2">
              {PLACEHOLDERS.map(ph => (
                <button
                  key={ph}
                  onClick={() => insertPlaceholder(ph)}
                  className="px-2.5 py-1 bg-blue-900/50 text-blue-300 border border-blue-700/50 rounded-lg text-xs hover:bg-blue-800/50 transition-colors font-mono"
                >
                  {ph}
                </button>
              ))}
            </div>
          </div>

          {/* Spintax Buttons */}
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block font-medium flex items-center gap-1.5">
              <Zap size={12} className="text-yellow-400" /> Sisipkan Spintax (Anti-Bot)
            </label>
            <div className="flex flex-wrap gap-2">
              {SPINTAX_OPTIONS.map(sp => (
                <button
                  key={sp}
                  onClick={() => insertSpintax(sp)}
                  className="px-2.5 py-1 bg-yellow-900/40 text-yellow-300 border border-yellow-700/40 rounded-lg text-xs hover:bg-yellow-800/40 transition-colors font-mono truncate max-w-xs"
                >
                  {sp}
                </button>
              ))}
            </div>
          </div>

          {/* Message Body */}
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block font-medium">Isi Pesan</label>
            <textarea
              className="input-field h-44 resize-none font-mono text-xs leading-relaxed"
              placeholder="Tulis pesan penagihan di sini. Gunakan placeholder dan spintax di atas..."
              value={form.isi}
              onChange={e => setForm(prev => ({ ...prev, isi: e.target.value }))}
            />
            <p className="text-xs text-slate-500 mt-1">{form.isi.length} karakter</p>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                form.tombolInteraktif ? 'bg-purple-900/20 border-purple-700/50' : 'bg-slate-700/40 border-slate-600/50'
              }`}
              onClick={() => setForm(prev => ({ ...prev, tombolInteraktif: !prev.tombolInteraktif }))}
            >
              <div>
                <p className="text-sm font-medium text-slate-200">Tombol Interaktif</p>
                <p className="text-xs text-slate-400">Konfirmasi / Keringanan</p>
              </div>
              <div className={`w-11 h-6 rounded-full relative transition-colors ${form.tombolInteraktif ? 'bg-purple-600' : 'bg-slate-600'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.tombolInteraktif ? 'left-5' : 'left-0.5'}`} />
              </div>
            </div>
            <div
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                form.allowUnsubscribe ? 'bg-slate-700/80 border-slate-500' : 'bg-slate-700/40 border-slate-600/50'
              }`}
              onClick={() => setForm(prev => ({ ...prev, allowUnsubscribe: !prev.allowUnsubscribe }))}
            >
              <div>
                <p className="text-sm font-medium text-slate-200">Allow Unsubscribe</p>
                <p className="text-xs text-slate-400">Berhenti Terima Pesan</p>
              </div>
              <div className={`w-11 h-6 rounded-full relative transition-colors ${form.allowUnsubscribe ? 'bg-teal-600' : 'bg-slate-600'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.allowUnsubscribe ? 'left-5' : 'left-0.5'}`} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 p-5 border-t border-slate-700">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">
            <X size={14} /> Batal
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!form.nama || !form.isi}
            className="btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={14} /> Simpan Template
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TemplateManager() {
  const [templates, setTemplates] = useState(mockTemplates);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const handleSave = (form) => {
    if (form.id) {
      setTemplates(prev => prev.map(t => t.id === form.id ? form : t));
    } else {
      setTemplates(prev => [...prev, { ...form, id: Date.now() }]);
    }
    setEditorOpen(false);
    setEditTarget(null);
  };

  const handleEdit = (tmpl) => {
    setEditTarget(tmpl);
    setEditorOpen(true);
  };

  const handleDelete = (id) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const handleDuplicate = (tmpl) => {
    setTemplates(prev => [...prev, { ...tmpl, id: Date.now(), nama: `${tmpl.nama} (Salinan)` }]);
  };

  return (
    <div className="page-enter space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Template Pesan & Spintax Manager</h1>
          <p className="text-slate-400 text-sm">{templates.length} template tersedia · Variasi Spintax aktif</p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setEditorOpen(true); }}
          className="btn-primary"
        >
          <Plus size={15} /> Template Baru
        </button>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-yellow-900/20 border border-yellow-700/40 rounded-xl">
        <Zap size={16} className="text-yellow-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-yellow-300">Spintax Aktif — Perlindungan Anti-Deteksi Bot</p>
          <p className="text-xs text-yellow-400/70 mt-0.5">
            Setiap pesan yang mengandung <code className="bg-yellow-900/40 px-1 rounded font-mono">{'{'+'Halo|Selamat pagi|Yth.'+'}'}</code> akan diputar secara acak saat pengiriman, menghindari pola berulang yang dideteksi WhatsApp sebagai bot.
          </p>
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {templates.map(tmpl => (
          <TemplateCard
            key={tmpl.id}
            tmpl={tmpl}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
          />
        ))}
        {/* Add New Card */}
        <div
          onClick={() => { setEditTarget(null); setEditorOpen(true); }}
          className="card border-dashed border-slate-600 hover:border-teal-600 cursor-pointer flex flex-col items-center justify-center gap-3 min-h-48 hover:bg-teal-900/10 transition-all group"
        >
          <div className="w-12 h-12 rounded-full bg-slate-700 group-hover:bg-teal-900/40 flex items-center justify-center transition-colors">
            <Plus size={22} className="text-slate-400 group-hover:text-teal-400 transition-colors" />
          </div>
          <p className="text-slate-400 group-hover:text-teal-400 text-sm font-medium transition-colors">Buat Template Baru</p>
        </div>
      </div>

      {editorOpen && (
        <TemplateEditor
          tmpl={editTarget}
          onSave={handleSave}
          onClose={() => { setEditorOpen(false); setEditTarget(null); }}
        />
      )}
    </div>
  );
}
