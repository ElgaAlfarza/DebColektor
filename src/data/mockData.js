// Mock data for Debcolektor CRM

export const mockNasabah = [
  { id: 1, nama: 'Budi Santoso', noTelp: '628112345678', nominal: 4500000, jatuhTempo: '2026-09-10', linkPembayaran: 'https://pay.example.com/budi001', status: 'Belum Bayar', tagihan: 3, agen: 'Rina' },
  { id: 2, nama: 'Siti Rahayu', noTelp: '628123456789', nominal: 12000000, jatuhTempo: '2026-09-08', linkPembayaran: 'https://pay.example.com/siti002', status: 'Janji Bayar', tagihan: 5, agen: 'Doni' },
  { id: 3, nama: 'Ahmad Fauzi', noTelp: '628134567890', nominal: 2750000, jatuhTempo: '2026-09-15', linkPembayaran: 'https://pay.example.com/ahmad003', status: 'Lunas', tagihan: 1, agen: 'Rina' },
  { id: 4, nama: 'Dewi Lestari', noTelp: '628145678901', nominal: 8900000, jatuhTempo: '2026-09-07', linkPembayaran: 'https://pay.example.com/dewi004', status: 'Belum Bayar', tagihan: 7, agen: 'Budi' },
  { id: 5, nama: 'Hendra Wijaya', noTelp: '628156789012', nominal: 3200000, jatuhTempo: '2026-09-12', linkPembayaran: 'https://pay.example.com/hendra005', status: 'Belum Bayar', tagihan: 2, agen: 'Doni' },
  { id: 6, nama: 'Rina Kusuma', noTelp: '628167890123', nominal: 15500000, jatuhTempo: '2026-09-05', linkPembayaran: 'https://pay.example.com/rina006', status: 'Janji Bayar', tagihan: 9, agen: 'Budi' },
  { id: 7, nama: 'Yoga Pratama', noTelp: '628178901234', nominal: 6750000, jatuhTempo: '2026-09-18', linkPembayaran: 'https://pay.example.com/yoga007', status: 'Belum Bayar', tagihan: 4, agen: 'Rina' },
  { id: 8, nama: 'Indah Permata', noTelp: '628189012345', nominal: 950000, jatuhTempo: '2026-09-20', linkPembayaran: 'https://pay.example.com/indah008', status: 'Lunas', tagihan: 1, agen: 'Doni' },
  { id: 9, nama: 'Rizky Maulana', noTelp: '628190123456', nominal: 22000000, jatuhTempo: '2026-09-03', linkPembayaran: 'https://pay.example.com/rizky009', status: 'Belum Bayar', tagihan: 12, agen: 'Budi' },
  { id: 10, nama: 'Fitriani Sari', noTelp: '628101234567', nominal: 5100000, jatuhTempo: '2026-09-14', linkPembayaran: 'https://pay.example.com/fitri010', status: 'Janji Bayar', tagihan: 3, agen: 'Rina' },
  { id: 11, nama: 'Agus Setiawan', noTelp: '628111234567', nominal: 7800000, jatuhTempo: '2026-09-09', linkPembayaran: 'https://pay.example.com/agus011', status: 'Belum Bayar', tagihan: 6, agen: 'Doni' },
  { id: 12, nama: 'Maya Anggraini', noTelp: '628122345678', nominal: 3600000, jatuhTempo: '2026-09-22', linkPembayaran: 'https://pay.example.com/maya012', status: 'Lunas', tagihan: 2, agen: 'Budi' },
];

export const mockDailyStats = [
  { day: 'Sen', terkirim: 145, dibaca: 98, dibalas: 32 },
  { day: 'Sel', terkirim: 188, dibaca: 134, dibalas: 47 },
  { day: 'Rab', terkirim: 162, dibaca: 115, dibalas: 39 },
  { day: 'Kam', terkirim: 201, dibaca: 158, dibalas: 61 },
  { day: 'Jum', terkirim: 173, dibaca: 129, dibalas: 44 },
  { day: 'Sab', terkirim: 95, dibaca: 72, dibalas: 18 },
  { day: 'Min', terkirim: 12, dibaca: 9, dibalas: 2 },
];

export const mockTemplates = [
  {
    id: 1,
    nama: 'Pengingat Jatuh Tempo',
    isi: '{Halo|Selamat pagi|Yth. Bapak/Ibu} {{Nama}},\n\nKami menginformasikan bahwa tagihan Anda sebesar *Rp {{Nominal}}* akan jatuh tempo pada tanggal *{{JatuhTempo}}*.\n\nSilakan lakukan pembayaran melalui tautan berikut:\n{{LinkPembayaran}}\n\nTerima kasih atas kerja samanya. 🙏',
    tombolInteraktif: true,
    allowUnsubscribe: true,
    kategori: 'Pengingat',
  },
  {
    id: 2,
    nama: 'Peringatan Keterlambatan',
    isi: '{Halo|Hai|Selamat siang} {{Nama}},\n\nTagihan Anda sebesar *Rp {{Nominal}}* sudah melewati batas waktu pembayaran. Mohon segera lakukan pelunasan untuk menghindari denda tambahan.\n\nBayar sekarang: {{LinkPembayaran}}\n\nJika ada kendala, kami siap membantu. 🤝',
    tombolInteraktif: true,
    allowUnsubscribe: false,
    kategori: 'Peringatan',
  },
  {
    id: 3,
    nama: 'Konfirmasi Janji Bayar',
    isi: '{Selamat pagi|Halo|Yth.} {{Nama}},\n\nIni adalah pengingat untuk janji pembayaran tagihan Anda sebesar *Rp {{Nominal}}* hari ini.\n\nLink pembayaran: {{LinkPembayaran}}\n\nTerima kasih telah berkomitmen. 🌟',
    tombolInteraktif: false,
    allowUnsubscribe: true,
    kategori: 'Konfirmasi',
  },
];

export const mockQueue = [
  { id: 'Q001', nasabah: 'Budi Santoso', noTelp: '628112345678', template: 'Pengingat Jatuh Tempo', status: 'Mengirim', progress: 65, waktu: '14:32' },
  { id: 'Q002', nasabah: 'Siti Rahayu', noTelp: '628123456789', template: 'Pengingat Jatuh Tempo', status: 'Antri', progress: 0, waktu: '14:35' },
  { id: 'Q003', nasabah: 'Ahmad Fauzi', noTelp: '628134567890', template: 'Peringatan Keterlambatan', status: 'Antri', progress: 0, waktu: '14:37' },
  { id: 'Q004', nasabah: 'Dewi Lestari', noTelp: '628145678901', template: 'Pengingat Jatuh Tempo', status: 'Antri', progress: 0, waktu: '14:40' },
  { id: 'Q005', nasabah: 'Hendra Wijaya', noTelp: '628156789012', template: 'Pengingat Jatuh Tempo', status: 'Gagal', progress: 0, waktu: '14:20' },
  { id: 'Q006', nasabah: 'Rina Kusuma', noTelp: '628167890123', template: 'Konfirmasi Janji Bayar', status: 'Terkirim', progress: 100, waktu: '14:15' },
  { id: 'Q007', nasabah: 'Yoga Pratama', noTelp: '628178901234', template: 'Peringatan Keterlambatan', status: 'Terkirim', progress: 100, waktu: '14:10' },
];

export const mockChats = [
  {
    id: 1,
    nasabah: 'Budi Santoso',
    noTelp: '628112345678',
    label: 'Janji Bayar',
    agen: 'Rina',
    unread: 2,
    lastMsg: 'Baik, saya akan transfer besok pagi ya',
    lastTime: '14:31',
    messages: [
      { from: 'agen', text: 'Selamat pagi Budi, mengingatkan tagihan Rp 4.500.000 jatuh tempo 10 September.', time: '09:00', status: 'read' },
      { from: 'nasabah', text: 'Iya mas, saya tau. Tapi sementara lagi mepet nih.', time: '10:15', status: 'read' },
      { from: 'agen', text: 'Baik Budi, apakah bisa janji bayar hari ini atau besok?', time: '10:17', status: 'read' },
      { from: 'nasabah', text: 'Baik, saya akan transfer besok pagi ya', time: '14:31', status: 'delivered' },
    ],
  },
  {
    id: 2,
    nasabah: 'Siti Rahayu',
    noTelp: '628123456789',
    label: 'Butuh Follow-Up',
    agen: 'Doni',
    unread: 0,
    lastMsg: 'Sudah saya cek, tagihan masih tercatat belum lunas',
    lastTime: '13:45',
    messages: [
      { from: 'nasabah', text: 'Halo, saya sudah bayar kemarin loh', time: '13:30', status: 'read' },
      { from: 'agen', text: 'Sudah saya cek, tagihan masih tercatat belum lunas', time: '13:45', status: 'read' },
    ],
  },
  {
    id: 3,
    nasabah: 'Dewi Lestari',
    noTelp: '628145678901',
    label: 'Sengketa',
    agen: 'Budi',
    unread: 5,
    lastMsg: 'Saya tidak merasa punya hutang! Ini salah sistem',
    lastTime: '12:20',
    messages: [
      { from: 'agen', text: 'Selamat pagi Dewi, tagihan Rp 8.900.000 sudah melewati jatuh tempo.', time: '09:30', status: 'read' },
      { from: 'nasabah', text: 'Saya tidak merasa punya hutang! Ini salah sistem', time: '12:20', status: 'delivered' },
    ],
  },
  {
    id: 4,
    nasabah: 'Rizky Maulana',
    noTelp: '628190123456',
    label: 'Butuh Follow-Up',
    agen: 'Budi',
    unread: 1,
    lastMsg: 'Kapan bisa dicicil ya mas?',
    lastTime: '11:00',
    messages: [
      { from: 'agen', text: 'Halo Rizky, tagihan Rp 22.000.000 sudah lebih dari 12 hari lewat jatuh tempo.', time: '10:00', status: 'read' },
      { from: 'nasabah', text: 'Kapan bisa dicicil ya mas?', time: '11:00', status: 'delivered' },
    ],
  },
  {
    id: 5,
    nasabah: 'Fitriani Sari',
    noTelp: '628101234567',
    label: 'Janji Bayar',
    agen: 'Rina',
    unread: 0,
    lastMsg: 'Oke siap, nanti sore saya bayar',
    lastTime: '10:30',
    messages: [
      { from: 'agen', text: 'Selamat pagi Fitri, mengingatkan janji bayar hari ini Rp 5.100.000.', time: '08:00', status: 'read' },
      { from: 'nasabah', text: 'Oke siap, nanti sore saya bayar', time: '10:30', status: 'read' },
    ],
  },
];

export const mockAgents = [
  { id: 1, nama: 'Rina Putri', status: 'Online', chatAktif: 8, avatar: 'R' },
  { id: 2, nama: 'Doni Firmansyah', status: 'Online', chatAktif: 5, avatar: 'D' },
  { id: 3, nama: 'Budi Prakoso', status: 'Offline', chatAktif: 0, avatar: 'B' },
  { id: 4, nama: 'Maya Sari', status: 'Away', chatAktif: 2, avatar: 'M' },
];

export const formatRupiah = (num) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
};
