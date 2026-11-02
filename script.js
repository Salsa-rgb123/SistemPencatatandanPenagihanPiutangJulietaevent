const SUPABASE_URL = 'https://gvxysxktqexuhrfkikjv.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_COVBM_Uc-UaQsywiDVtc9g_46fqORa1';
const SUPABASE_API_URL = `${SUPABASE_URL}/functions/v1/julieta-api`;
const SUPABASE_AUTH_URL = `${SUPABASE_URL}/auth/v1`;
const SERVICE_OPTIONS = [
  ['event-organizer', 'Event Organizer (EO)', 45000000],
  ['decoration', 'Decoration', 120000000],
  ['mua', 'MUA', 25000000],
  ['wardrobe', 'Wardrobe', 35000000],
  ['catering', 'Catering', 75000000],
  ['photobooth', 'Photobooth', 15000000],
  ['mc', 'MC', 12500000],
  ['sanggar', 'Sanggar Tradisional', 18000000]
];
const LOCATION_ZONES = [
  ['Zona 1', 'Semarang & Sekitarnya', 0],
  ['Zona 2', 'Jawa Tengah & Jogja', 5000000],
  ['Zona 3', 'Destination Domestic — Jakarta/Bali', 25000000],
  ['Zona 4', 'ASEAN / International', 75000000]
];
const STUDIO_PROFILE = {
  name: 'Julieta Event & Décor',
  address: 'Alamat studio belum dikonfigurasi',
  whatsapp: 'Kontak WhatsApp studio belum dikonfigurasi',
  email: 'Email studio belum dikonfigurasi',
  financeName: 'Finance / Admin Julieta Suite'
};
const DAMAGE_INVENTORY = [
  ['backdrop-floral', 'Backdrop Floral Mewah (Custom Fresh Flower)', 3500000, 'set'],
  ['arch-inisial', 'Set Arch / Inisial Wedding Kayu Jati Ukir', 1500000, 'set'],
  ['spotlight-led', 'Lampu Standing Spotlight LED', 450000, 'set'],
  ['fairy-lights', 'Fairy Lights / Lampu Gantung Warm White', 75000, 'meter', true],
  ['kursi-chiavari', 'Kursi Akad Kayu Chiavari Premium', 250000, 'unit'],
  ['meja-vip', 'Meja Kotak VIP Lapis Kain Velvet', 800000, 'unit'],
  ['piring-cutlery', 'Set Piring & Cutlery Mewah Gold', 300000, 'lusin'],
  ['table-runner', 'Kain Table Runner / Napkin Premium', 50000, 'pcs'],
  ['karpet-velvet', 'Karpet Pameran / Panggung Velvet', 120000, 'meter persegi', true],
  ['kotak-angpao', 'Kotak Angpao Akrilik Eksklusif', 350000, 'buah'],
  ['standing-easel', 'Standing Easel Kayu Lukisan / Welcome Sign', 200000, 'buah'],
  ['kain-tile', 'Kain Tile Dekorasi Latar Belakang', 45000, 'meter', true],
  ['sound-system', 'Sound System Portable / Speaker Aktif (Set Wireless Mic)', 2500000, 'set'],
  ['mist-fan', 'Kipas Angin Mist Fan / Air Cooler Portabel', 1200000, 'unit'],
  ['portable-ac', 'Pendingin Ruangan Portable AC (Stand PK Besar)', 4500000, 'unit'],
  ['direction-sign', 'Papan Penunjuk Arah / Direction Sign Board Akrilik', 250000, 'buah']
].map(([id, name, price, unit, fractional = false]) => ({ id, name, price, unit, fractional }));
const IDR = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const state = { view: 'dashboard', data: null, search: '', filter: 'all', adminName: 'Salsabila Dwi Putri', session: readAuthSession() };
const page = document.querySelector('#page-content');
const modalLayer = document.querySelector('#modal-layer');
const names = { dashboard: 'Ringkasan', receivables: 'Piutang', deposits: 'Smart deposit & Refund', events: 'Event', clients: 'Klien' };

function useData() { return state.data; }
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]); }
function readAuthSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem('julieta-auth-session') || 'null');
    return session?.access_token && session?.refresh_token ? session : null;
  } catch { return null; }
}
function saveAuthSession(session) {
  const next = { ...session, expires_at: session.expires_at || Math.floor(Date.now() / 1000) + Number(session.expires_in || 3600) };
  try { sessionStorage.setItem('julieta-auth-session', JSON.stringify(next)); }
  catch { throw new Error('Sesi tidak dapat disimpan di browser ini. Izinkan penyimpanan sesi lalu coba lagi.'); }
  state.session = next;
}
function clearAuthSession() {
  try { sessionStorage.removeItem('julieta-auth-session'); } catch { /* Browser storage may be disabled. */ }
  state.session = null;
  state.data = null;
}
function setAuthenticatedView(authenticated) {
  document.querySelector('#auth-screen').hidden = authenticated;
  document.querySelector('#app-shell').hidden = !authenticated;
}
function showLogin(message = '') {
  clearAuthSession();
  modalLayer.hidden = true;
  document.querySelector('#login-form [name="password"]').value = '';
  setAuthenticatedView(false);
  const error = document.querySelector('#auth-error');
  error.textContent = message;
  error.hidden = !message;
}
async function authRequest(path, body) {
  const response = await fetch(`${SUPABASE_AUTH_URL}${path}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.msg || result.message || result.error_description || 'Autentikasi gagal. Periksa email dan password.');
    error.status = response.status;
    throw error;
  }
  return result;
}
async function refreshAuthSession() {
  if (!state.session) throw new Error('Sesi login telah berakhir. Silakan masuk kembali.');
  try {
    const session = await authRequest('/token?grant_type=refresh_token', { refresh_token: state.session.refresh_token });
    saveAuthSession(session);
    return session;
  } catch (error) {
    clearAuthSession();
    throw new Error(error.message || 'Sesi admin berakhir. Silakan masuk kembali.');
  }
}
async function ensureFreshAuthSession() {
  if (!state.session) throw new Error('Login admin diperlukan.');
  if (Number(state.session.expires_at) <= Math.floor(Date.now() / 1000) + 60) await refreshAuthSession();
  return state.session;
}
async function signOut() {
  let message = 'Anda telah keluar dari Julieta Suite.';
  if (state.session?.access_token) {
    try {
      const response = await fetch(`${SUPABASE_AUTH_URL}/logout`, {
        method: 'POST',
        headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${state.session.access_token}` }
      });
      if (!response.ok) message = 'Sesi lokal sudah dihapus, tetapi token sesi belum dapat dicabut dari Supabase.';
    } catch {
      message = 'Sesi lokal sudah dihapus, tetapi server tidak dapat dihubungi untuk mencabut token.';
    }
  }
  showLogin(message);
}
function greetingByTime(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 4 && hour < 11) return 'Selamat pagi';
  if (hour >= 11 && hour < 15) return 'Selamat siang';
  if (hour >= 15 && hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}
function money(value) { return IDR.format(Number(value) || 0).replace(/\u00a0/g, ' '); }
function parseDate(value) { return new Date(`${String(value).slice(0, 10)}T12:00:00`); }
function dateShort(value) { return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(parseDate(value)); }
function dateLong(value) { return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(parseDate(value)); }
function whatsappNumber(value) {
  const raw = String(value || '').trim();
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  else if (!raw.startsWith('+') && !digits.startsWith('62')) return '';
  return /^\d{8,15}$/.test(digits) ? digits : '';
}
function clientFor(event) { return useData().clients.find(client => client.id === event?.client_id); }
function eventFor(receivable) { return useData().events.find(event => event.id === receivable?.event_id); }
function receivableFor(deposit) { return useData().receivables.find(receivable => receivable.id === deposit?.receivable_id); }
function securityDepositFor(eventId) { return useData().securityDeposits.find(deposit => deposit.event_id === eventId); }
function statusClass(status) { return ({ Lunas: 'paid', Dibayar: 'paid', 'Dibayar sebagian': 'paid', Aktif: 'paid', Selesai: 'paid', Terlambat: 'overdue', Terjadwal: 'scheduled', 'Menunggu bayaran': 'scheduled', Persiapan: 'scheduled', Nonaktif: 'neutral', Dibatalkan: 'neutral', Draft: 'neutral' })[status] || ''; }
function badge(status) { return `<span class="status ${statusClass(status)}">${escapeHtml(status)}</span>`; }
function statusSelect(table, id, status, values) { return `<select class="inline-status" data-table="${table}" data-id="${escapeHtml(id)}" data-current="${escapeHtml(status)}">${values.map(value => `<option value="${value}" ${status === value ? 'selected' : ''}>${value}</option>`).join('')}</select>`; }
function deleteButton(table, id) { return `<button class="button small danger" data-action="delete-row" data-table="${table}" data-id="${escapeHtml(id)}" title="Hapus data">Hapus</button>`; }
function initials(name = '') { return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase(); }
function publicId(prefix, id) { return `${prefix}-${String(id || '').replaceAll('-', '').slice(0, 8).toUpperCase()}`; }
function sortByDate(items, key) { return [...items].sort((a, b) => parseDate(a[key]) - parseDate(b[key])); }
function depositPaid(item) { return item.status === 'Dibayar'; }
function paidTotal() { return useData().deposits.filter(depositPaid).reduce((sum, item) => sum + Number(item.amount), 0); }
function openCount() { return useData().receivables.filter(item => item.status !== 'Lunas' && item.status !== 'Draft'); }
function outstandingTotal() { return openCount().reduce((sum, item) => sum + Number(item.remaining_amount ?? item.total_amount), 0); }
function setView(view) { state.view = view; state.search = ''; state.filter = 'all'; document.querySelector('#current-section').textContent = names[view]; document.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.view === view)); document.querySelector('#sidebar').classList.remove('open'); render(); }
function heading(eyebrow, title, description, actions = '') { return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div>${actions ? `<div class="heading-actions">${actions}</div>` : ''}</div>`; }
function actionButton(label, action, primary = false, icon = '+') { return `<button class="button ${primary ? 'primary' : ''}" data-action="${action}"><span>${icon}</span>${label}</button>`; }
function statCard(title, value, note, icon, tone = '') { return `<article class="stat-card"><div class="stat-top"><span>${title}</span><span class="stat-icon ${tone}">${icon}</span></div><div class="stat-value">${value}</div><div class="stat-meta">${note}</div></article>`; }
function eventRow(event, showStatus = false) { const client = clientFor(event); const date = parseDate(event.event_date); const month = new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(date).replace('.', ''); return `<div class="event-row"><div class="event-date"><strong>${date.getDate()}</strong><small>${month}</small></div><div class="event-info"><strong>${escapeHtml(event.name)}</strong><small>${escapeHtml(publicId('EVT', event.id))} · ${escapeHtml(client?.name || 'Klien')}${event.venue ? ` · ${escapeHtml(event.venue)}` : ''}</small></div>${showStatus ? badge(event.status) : `<span class="event-value">${money(event.budget)}</span>`}</div>`; }
function dueReminder(deposit) {
  if (deposit.status === 'Terlambat') return 'TERLAMBAT';
  if (depositPaid(deposit) || deposit.status === 'Dibatalkan') return '';
  const days = Math.round((parseDate(deposit.due_date) - parseDate(new Date().toISOString().slice(0, 10))) / 86400000);
  if (days < 0) return 'TERLAMBAT';
  if (days === 0) return 'JATUH TEMPO HARI INI';
  if (days <= 7) return `JATUH TEMPO ${days} HARI LAGI`;
  return '';
}
function depositRow(deposit) { const event = eventFor(receivableFor(deposit)); const reminder = dueReminder(deposit); return `<div class="deposit-row"><div><strong>${escapeHtml(deposit.installment_type || deposit.label)} ${reminder ? `<span class="due-marker ${reminder === 'TERLAMBAT' ? 'overdue' : ''}">${reminder}</span>` : ''}</strong><small>${escapeHtml(publicId('DEP', deposit.id))} · ${escapeHtml(event?.name || 'Event')} · ${dateShort(deposit.due_date)}</small></div><div class="row-amount"><strong>${money(deposit.amount)}</strong><small>${badge(deposit.status)}</small></div></div>`; }
function whatsappLink(client, message, label = 'WhatsApp') {
  const number = whatsappNumber(client?.phone);
  if (!client || !number) return '<span class="cell-sub">Nomor WhatsApp belum tersedia</span>';
  return `<a class="button small whatsapp-button" href="https://wa.me/${number}?text=${encodeURIComponent(message)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}
function whatsappGreeting() {
  const hour = new Date().getHours();
  const greeting = hour >= 4 && hour < 11 ? 'pagi' : hour >= 11 && hour < 15 ? 'siang' : hour >= 15 && hour < 18 ? 'sore' : 'malam';
  return `Shalom / Selamat ${greeting}`;
}
function whatsappBillingMessage(client, event, receivable, paymentDetails = '') {
  return `${whatsappGreeting()}, Yth. Bapak/Ibu *${client.name}* 🌸

Semoga Bapak/Ibu beserta keluarga senantiasa sehat dan berlimpah kebahagiaan.

Mewakili manajemen *Julieta Suite (by Julieta Event & Décor)*, kami ingin menyampaikan rincian administrasi dan sisa piutang untuk penyelenggaraan acara terhormat Bapak/Ibu:

📋 *DETAIL ACARA & TAGIHAN*
• *Nama Acara / Klien:* ${event.name} / ${client.name}
• *Venue / Lokasi:* ${event.venue || 'Belum ditentukan'}
• *Tanggal Acara:* ${dateLong(event.event_date)} (${Number(event.duration_days) || 1} Hari)
• *Nomor Invoice:* ${receivable.invoice_number}
• *Total Nilai Kontrak:* ${money(receivable.total_amount)}
• *Pembayaran Masuk (DP):* ${money(receivable.amount_paid)}
• *Sisa Piutang Pelunasan:* *${money(receivable.remaining_amount)}*${paymentDetails ? `\n${paymentDetails}` : ''}

💳 *INFORMASI REKENING PEMBAYARAN RESMI*
Mohon melakukan transfer pelunasan melalui rekening resmi perusahaan kami di bawah ini:
• *Bank BCA:* \`3920184920\` a.n. PT Julieta Event Nusantara
• *Bank Mandiri:* \`1350009823411\` a.n. CV Julieta Kreatif Indonesia

Setelah melakukan pembayaran, mohon berkenan mengirimkan *bukti transfer (struk)* melalui balasan chat ini agar tim keuangan kami dapat segera melakukan verifikasi dan menerbitkan kuitansi lunas resmi.

Jika ada hal yang ingin dikonfirmasikan, silakan menghubungi admin kami. Terima kasih banyak atas kepercayaan dan kerja sama yang luar biasa bersama Julieta Suite.

Warmest regards,
*Salsabila Dwi Putri*
Head of Administration & Finance
✨ *Julieta Suite by Julieta Event & Décor*`;
}
function whatsappReminderButton(deposit) {
  const receivable = receivableFor(deposit);
  const event = eventFor(receivable);
  const client = clientFor(event);
  if (!client || !event || !receivable) return '<span class="cell-sub">Data klien belum tersedia</span>';
  const paymentDetails = `• *Termin yang perlu dibayar:* ${deposit.installment_type || deposit.label} · ${money(deposit.amount)}
• *Jatuh tempo termin:* ${dateLong(deposit.due_date)}`;
  return whatsappLink(client, whatsappBillingMessage(client, event, receivable, paymentDetails), 'Ingatkan via WA');
}
function whatsappInvoiceButton(receivable) {
  if (receivable.status === 'Draft') return '<span class="cell-sub">Terbitkan invoice sebelum dikirim</span>';
  const event = eventFor(receivable);
  const client = clientFor(event);
  if (!client || !event) return '<span class="cell-sub">Data klien belum tersedia</span>';
  const invoiceButton = `<button class="button small primary" data-action="share-invoice" data-id="${escapeHtml(receivable.id)}">Invoice PDF + WhatsApp</button>`;
  const settlementButton = receivable.status === 'Lunas'
    ? ` <button class="button small" data-action="share-receipt" data-id="${escapeHtml(receivable.id)}">Bukti Pelunasan PDF</button>`
    : '';
  return `${invoiceButton}${settlementButton}`;
}
function whatsappPaidButton(deposit) {
  const receivable = receivableFor(deposit);
  const event = eventFor(receivable);
  const client = clientFor(event);
  if (!client || !event || !receivable) return '<span class="cell-sub">Data klien belum tersedia</span>';
  const paymentDetails = `✅ *PEMBAYARAN DITERIMA*
• *Termin:* ${deposit.installment_type || deposit.label}
• *Jumlah diterima:* ${money(deposit.amount)}
• *Tanggal pembayaran:* ${deposit.paid_at ? dateLong(deposit.paid_at) : 'Hari ini'}`;
  const receiptButton = `<button class="button small primary" data-action="payment-receipt" data-id="${escapeHtml(deposit.id)}">Struk Bukti Bayar</button>`;
  const whatsappButton = receivable.status === 'Lunas'
    ? `<button class="button small" data-action="share-receipt" data-id="${escapeHtml(receivable.id)}">Bagikan Bukti Lunas</button>`
    : whatsappLink(client, whatsappBillingMessage(client, event, receivable, paymentDetails), 'Konfirmasi via WA');
  return `${receiptButton} ${whatsappButton}`;
}
function paymentReceiptData(deposit) {
  const receivable = receivableFor(deposit);
  const event = eventFor(receivable);
  const client = clientFor(event);
  if (!deposit || !receivable || !event || !client || !depositPaid(deposit)) return null;
  const paidDate = deposit.paid_at ? new Date(deposit.paid_at) : new Date();
  const validDate = Number.isNaN(paidDate.getTime()) ? new Date() : paidDate;
  const identifier = String(deposit.id || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(-8).padStart(8, '0');
  const year = validDate.getFullYear();
  const paidAmount = Number(deposit.amount) || 0;
  const invoiceTotal = Number(receivable.total_amount) || 0;
  const installmentShare = invoiceTotal > 0 ? Math.round(paidAmount / invoiceTotal * 100) : 0;
  return {
    receiptNumber: `JS-REC-${year}-${identifier}`,
    invoiceNumber: receivable.invoice_number,
    transactionDate: new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' }).format(validDate),
    clientName: client.name,
    maskedPhone: maskPhone(client.phone),
    maskedEmail: maskEmail(client.email),
    eventName: event.name,
    installment: `${deposit.installment_type || deposit.label || 'Termin'} (${installmentShare}%)`,
    paymentMethod: deposit.payment_method || 'Tidak dicatat',
    paidAmount,
    contractTotal: invoiceTotal,
    totalPaid: Number(receivable.amount_paid) || 0,
    outstanding: Number(receivable.remaining_amount) || 0,
    invoiceStatus: receivable.status === 'Lunas' ? 'LUNAS' : 'CICILAN BERJALAN',
    financeName: state.adminName || STUDIO_PROFILE.financeName
  };
}
function maskPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return 'Tidak tersedia';
  return `${digits.startsWith('62') ? '+62 ' : ''}•••• •••• ${digits.slice(-4)}`;
}
function maskEmail(value) {
  const [name, domain] = String(value || '').split('@');
  if (!name || !domain) return 'Tidak tersedia';
  return `${name.slice(0, 1)}•••@${domain}`;
}
function showPaymentReceiptModal(depositId) {
  const deposit = useData().deposits.find(item => item.id === depositId);
  const receipt = paymentReceiptData(deposit);
  if (!receipt) {
    showToast('Struk hanya tersedia untuk pembayaran yang sudah berhasil dicatat.');
    return;
  }
  modalLayer.innerHTML = `<section class="modal receipt-modal" role="dialog" aria-modal="true" aria-labelledby="receipt-modal-title"><div class="modal-head"><div><h2 id="receipt-modal-title">Struk Bukti Pembayaran</h2><p>Pratinjau sebelum mencetak, mengunduh, atau mengirim PDF.</p></div><button class="icon-button" data-action="close-modal" aria-label="Tutup">×</button></div><article class="payment-receipt" id="payment-receipt-preview"><header class="receipt-brand"><span class="receipt-monogram">J</span><div><strong>${escapeHtml(STUDIO_PROFILE.name)}</strong><small>${escapeHtml(STUDIO_PROFILE.address)}</small><small>WA ${escapeHtml(STUDIO_PROFILE.whatsapp)} · ${escapeHtml(STUDIO_PROFILE.email)}</small></div></header><div class="receipt-title"><span>PAYMENT RECEIPT</span><h3>STRUK BUKTI PEMBAYARAN</h3></div><dl class="receipt-meta"><div><dt>Nomor bukti bayar</dt><dd>${escapeHtml(receipt.receiptNumber)}</dd></div><div><dt>Referensi invoice</dt><dd>${escapeHtml(receipt.invoiceNumber)}</dd></div><div><dt>Tanggal &amp; waktu transaksi</dt><dd>${escapeHtml(receipt.transactionDate)}</dd></div><div><dt>Klien</dt><dd>${escapeHtml(receipt.clientName)}</dd></div><div><dt>Event</dt><dd>${escapeHtml(receipt.eventName)}</dd></div><div><dt>Kontak klien (tersensor)</dt><dd>${escapeHtml(receipt.maskedPhone)} · ${escapeHtml(receipt.maskedEmail)}</dd></div></dl><section class="receipt-paid"><span>Nominal dibayarkan</span><strong>${money(receipt.paidAmount)}</strong></section><dl class="receipt-meta receipt-payment-details"><div><dt>Jenis termin</dt><dd>${escapeHtml(receipt.installment)}</dd></div><div><dt>Metode pembayaran</dt><dd>${escapeHtml(receipt.paymentMethod)}</dd></div><div><dt>Status pembayaran</dt><dd><span class="receipt-paid-status">BERHASIL / LUNAS (PAID)</span></dd></div></dl><dl class="receipt-meta receipt-totals"><div><dt>Total kontrak event</dt><dd>${money(receipt.contractTotal)}</dd></div><div><dt>Total pembayaran masuk</dt><dd>${money(receipt.totalPaid)}</dd></div><div><dt>Status invoice</dt><dd>${escapeHtml(receipt.invoiceStatus)}</dd></div><div><dt>Sisa piutang</dt><dd>${money(receipt.outstanding)}</dd></div></dl><footer class="receipt-footer"><p>Struk ini merupakan bukti pembayaran sah yang diterbitkan oleh sistem Julieta Suite.</p><p>Data kontak disensor sebagai upaya perlindungan privasi sesuai UU No. 27 Tahun 2022 (UU PDP).</p><div class="receipt-signatures"><div><span class="signature-script">${escapeHtml(receipt.financeName)}</span><strong>${escapeHtml(receipt.financeName)}</strong><small>Finance / Administrator</small></div><div class="digital-stamp"><strong>JULIETA</strong><small>EVENT &amp; DÉCOR · PAID</small></div></div><small class="receipt-security-note">Tanda tangan dan stempel digital pada struk ini merupakan penanda visual penerbit, bukan tanda tangan elektronik tersertifikasi.</small></footer></article><div class="receipt-actions"><button class="button" data-action="close-modal">Tutup</button><button class="button" data-action="share-payment-receipt" data-id="${escapeHtml(depositId)}">Kirim ke Klien</button><button class="button" data-action="print-payment-receipt" data-id="${escapeHtml(depositId)}">Cetak Struk</button><button class="button primary" data-action="download-payment-receipt" data-id="${escapeHtml(depositId)}">Download Struk PDF</button></div></section>`;
  modalLayer.hidden = false;
}
function printPaymentReceipt(depositId) {
  try {
    const deposit = useData().deposits.find(item => item.id === depositId);
    const { pdf, receipt } = receiptPdfData(deposit);
    pdf.autoPrint();
    const pdfUrl = URL.createObjectURL(pdf.output('blob'));
    const printWindow = window.open(pdfUrl, '_blank');
    if (!printWindow) {
      URL.revokeObjectURL(pdfUrl);
      throw new Error('Jendela cetak diblokir browser. Izinkan pop-up untuk Julieta Suite, lalu coba lagi.');
    }
    printWindow.opener = null;
    window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);
    showToast(`Struk ${receipt.receiptNumber} dibuka untuk dicetak.`);
  } catch (error) {
    showToast(error.message || 'Struk gagal dibuka untuk dicetak.');
  }
}
function receiptPdfData(deposit) {
  const receipt = paymentReceiptData(deposit);
  if (!receipt) throw new Error('Struk hanya tersedia untuk pembayaran yang sudah berhasil dicatat.');
  const library = window.jspdf?.jsPDF;
  if (typeof library !== 'function') throw new Error('Library PDF belum termuat. Periksa koneksi internet lalu muat ulang aplikasi.');
  const pdf = new library({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const left = 18;
  const right = pageWidth - left;
  const clean = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '');
  const drawLabelValue = (label, value, x, y, width = 78) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(116, 109, 122);
    pdf.text(clean(label), x, y);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(48, 42, 55);
    const lines = pdf.splitTextToSize(clean(value || '-'), width);
    pdf.text(lines, x, y + 5);
    return y + Math.max(12, lines.length * 4 + 8);
  };
  pdf.setFillColor(241, 235, 247);
  pdf.rect(0, 0, pageWidth, 54, 'F');
  pdf.setFillColor(112, 84, 139);
  pdf.circle(26, 23, 8, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('times', 'bold');
  pdf.setFontSize(15);
  pdf.text('J', 26, 28, { align: 'center' });
  pdf.setTextColor(48, 42, 55);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.text(clean(STUDIO_PROFILE.name), 40, 20);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(pdf.splitTextToSize(clean(STUDIO_PROFILE.address), 145), 40, 27);
  pdf.text(pdf.splitTextToSize(`WA ${clean(STUDIO_PROFILE.whatsapp)} | ${clean(STUDIO_PROFILE.email)}`, 145), 40, 34);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(96, 71, 123);
  pdf.text('STRUK BUKTI PEMBAYARAN', left, 66);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(120, 112, 128);
  pdf.text('PAYMENT RECEIPT', left, 72);
  pdf.setDrawColor(229, 223, 234);
  pdf.line(left, 80, right, 80);
  const metadata = [
    ['NOMOR BUKTI BAYAR', receipt.receiptNumber],
    ['REFERENSI INVOICE', receipt.invoiceNumber],
    ['TANGGAL & WAKTU TRANSAKSI', receipt.transactionDate],
    ['NAMA KLIEN', receipt.clientName],
    ['NAMA EVENT', receipt.eventName],
    ['KONTAK KLIEN (TERSENSOR)', `${receipt.maskedPhone} | ${receipt.maskedEmail}`]
  ];
  metadata.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    drawLabelValue(label, value, left + column * 94, 84 + row * 17, 82);
  });
  let y = 133;
  pdf.setFillColor(248, 245, 251);
  pdf.roundedRect(left, y, right - left, 26, 3, 3, 'F');
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(116, 109, 122);
  pdf.text('NOMINAL DIBAYARKAN', left + 6, y + 8);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(17);
  pdf.setTextColor(96, 71, 123);
  pdf.text(clean(money(receipt.paidAmount)), right - 6, y + 19, { align: 'right' });
  drawLabelValue('JENIS TERMIN', receipt.installment, left, 168, 82);
  drawLabelValue('METODE PEMBAYARAN', receipt.paymentMethod, left + 94, 168, 82);
  drawLabelValue('STATUS PEMBAYARAN', 'BERHASIL / LUNAS (PAID)', left, 185, 170);
  pdf.setDrawColor(229, 223, 234);
  pdf.line(left, 201, right, 201);
  [
    ['TOTAL KONTRAK EVENT', money(receipt.contractTotal)],
    ['TOTAL PEMBAYARAN MASUK (AKUMULASI)', money(receipt.totalPaid)],
    ['STATUS INVOICE', receipt.invoiceStatus],
    ['SISA PIUTANG BELUM DIBAYAR', money(receipt.outstanding)]
  ].forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    drawLabelValue(label, value, left + column * 94, 208 + row * 18, 82);
  });
  pdf.setDrawColor(229, 223, 234);
  pdf.line(left, 244, right, 244);
  y = 251;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.setTextColor(98, 91, 105);
  const legalLines = pdf.splitTextToSize(clean('Struk ini merupakan bukti pembayaran sah yang diterbitkan oleh sistem Julieta Suite.'), right - left);
  pdf.text(legalLines, left, y);
  y += legalLines.length * 3 + 2;
  const privacyLines = pdf.splitTextToSize(clean('Data kontak disensor sebagai upaya perlindungan privasi sesuai UU No. 27 Tahun 2022 (UU PDP).'), right - left);
  pdf.text(privacyLines, left, y);
  const signatureY = y + privacyLines.length * 3 + 3;
  pdf.setTextColor(96, 71, 123);
  pdf.setFont('times', 'italic');
  pdf.setFontSize(12);
  pdf.text(clean(receipt.financeName), left + 4, signatureY + 4);
  pdf.setDrawColor(180, 168, 193);
  pdf.line(left, signatureY + 8, left + 67, signatureY + 8);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(70, 63, 76);
  pdf.text(clean(receipt.financeName), left, signatureY + 13);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text('Finance / Administrator', left, signatureY + 17);
  pdf.setDrawColor(154, 127, 174);
  pdf.setTextColor(112, 84, 139);
  pdf.circle(right - 23, signatureY + 6, 12, 'S');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('JULIETA', right - 23, signatureY + 4, { align: 'center' });
  pdf.setFontSize(5);
  pdf.text('EVENT & DECOR - PAID', right - 23, signatureY + 8, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.setTextColor(125, 118, 130);
  pdf.text('Penanda visual penerbit; bukan tanda tangan elektronik tersertifikasi.', left, signatureY + 28);
  return { pdf, receipt };
}
function downloadPaymentReceipt(depositId) {
  try {
    const deposit = useData().deposits.find(item => item.id === depositId);
    const { pdf, receipt } = receiptPdfData(deposit);
    pdf.save(`${receipt.receiptNumber}.pdf`);
    showToast(`Struk PDF ${receipt.receiptNumber} berhasil diunduh.`);
  } catch (error) {
    showToast(error.message || 'PDF struk gagal dibuat.');
  }
}
async function sharePaymentReceipt(depositId) {
  try {
    const deposit = useData().deposits.find(item => item.id === depositId);
    const { pdf, receipt } = receiptPdfData(deposit);
    const client = clientFor(eventFor(receivableFor(deposit)));
    const number = whatsappNumber(client?.phone);
    const message = `Pembayaran ${receipt.installment} untuk invoice ${receipt.invoiceNumber} telah diterima sebesar ${money(receipt.paidAmount)}. Terlampir struk bukti pembayaran ${receipt.receiptNumber}.`;
    const blob = pdf.output('blob');
    const file = new File([blob], `${receipt.receiptNumber}.pdf`, { type: 'application/pdf' });
    if (number && navigator.canShare?.({ files: [file] }) && navigator.share) {
      try {
        await navigator.share({ files: [file], title: receipt.receiptNumber, text: message });
        showToast('Pilih WhatsApp dan klien tujuan pada menu berbagi.');
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
        throw error;
      }
    }
    pdf.save(`${receipt.receiptNumber}.pdf`);
    if (number) window.open(`https://wa.me/${number}?text=${encodeURIComponent(`${message}\nLampirkan file ${receipt.receiptNumber}.pdf yang baru diunduh.`)}`, '_blank', 'noopener,noreferrer');
    showToast(number ? 'Struk diunduh dan chat dibuka. Lampirkan PDF sebelum mengirim.' : 'Struk diunduh; nomor WhatsApp klien belum tersedia.');
  } catch (error) {
    showToast(error.message || 'Struk gagal dibagikan.');
  }
}
async function invoiceLogoPng() {
  const source = document.querySelector('.brand-mark svg');
  if (!source) throw new Error('Logo Julieta Suite tidak ditemukan pada antarmuka.');
  const svg = source.cloneNode(true);
  svg.setAttribute('width', '144');
  svg.setAttribute('height', '144');
  svg.setAttribute('color', '#60477b');
  const svgUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.src = svgUrl;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 288;
    canvas.height = 288;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Logo tidak dapat disiapkan untuk PDF.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
async function createInvoicePdfBlob(receivable) {
  const library = window.jspdf?.jsPDF;
  if (typeof library !== 'function') throw new Error('Library PDF belum termuat. Periksa koneksi internet lalu muat ulang aplikasi.');
  const event = eventFor(receivable);
  const client = clientFor(event);
  if (!event || !client) throw new Error('Data event atau klien invoice tidak ditemukan.');
  const data = useData();
  const terms = sortByDate(data.deposits.filter(item => item.receivable_id === receivable.id && item.status !== 'Dibatalkan'), 'due_date');
  const paidTerms = terms.filter(depositPaid);
  const securityDeposit = securityDepositFor(event.id);
  const totalContract = Number(receivable.total_amount) || 0;
  const installmentsPaid = paidTerms.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const securityReceived = Number(securityDeposit?.amount) || 0;
  const totalReceived = installmentsPaid + securityReceived;
  const remaining = Number(receivable.remaining_amount ?? Math.max(0, totalContract - installmentsPaid));
  const lastPayment = [...paidTerms].sort((a, b) => String(b.paid_at || '').localeCompare(String(a.paid_at || '')))[0];
  const receiptNumber = lastPayment ? paymentReceiptData(lastPayment)?.receiptNumber : '';
  const issuedDate = receivable.issued_at ? dateLong(receivable.issued_at) : dateLong(new Date().toISOString());
  const clean = value => String(value ?? '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '');
  const pdf = new library({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const left = 18;
  const right = pageWidth - left;
  const ink = [48, 42, 55];
  const muted = [111, 102, 119];
  const purple = [96, 71, 123];
  const pale = [248, 244, 250];
  const green = [48, 132, 66];
  const red = [190, 58, 58];
  const logo = await invoiceLogoPng();
  const text = (value, x, y, size = 8, color = ink, bold = false, options = {}) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    pdf.text(clean(value), x, y, options);
  };
  const wrapped = (value, width, size = 8, bold = false) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    return pdf.splitTextToSize(clean(value), width);
  };
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  pdf.addImage(logo, 'PNG', left, 13, 14, 14);
  text('JULIETA SUITE', left + 18, 19, 17, purple, true);
  text('SMART ACCOUNTING & BILLING SYSTEM · JULIETA EVENT & DECOR', left + 18, 24, 6, [145, 113, 166], true);
  const studioContact = `${STUDIO_PROFILE.address} | WA: ${STUDIO_PROFILE.whatsapp} | Email: ${STUDIO_PROFILE.email}`;
  const contactLines = wrapped(studioContact, 108, 6);
  pdf.text(contactLines, left + 18, 28);
  pdf.setFillColor(...(receivable.status === 'Lunas' ? [232, 245, 234] : [246, 240, 250]));
  pdf.setDrawColor(...(receivable.status === 'Lunas' ? [181, 220, 187] : [224, 212, 235]));
  pdf.roundedRect(151, 12, 41, 12, 1.5, 1.5, 'FD');
  text(receivable.status === 'Lunas' ? 'INVOICE LUNAS' : 'INVOICE PEMBAYARAN', 171.5, 17, 7, receivable.status === 'Lunas' ? green : purple, true, { align: 'center' });
  text(receivable.status === 'Draft' ? 'STATUS: DRAFT' : `STATUS: ${receivable.status === 'Lunas' ? 'LUNAS / PAID' : String(receivable.status).toUpperCase()}`, 171.5, 22, 6, receivable.status === 'Lunas' ? green : muted, true, { align: 'center' });
  text(`No. Invoice: ${receivable.invoice_number}`, right, 30, 7, ink, true, { align: 'right' });
  text(`No. Bukti Bayar: ${receiptNumber || 'Belum ada pembayaran'}`, right, 34, 6, muted, false, { align: 'right' });

  const boxY = 40;
  const boxHeight = 38;
  const boxGap = 7;
  const boxWidth = (right - left - boxGap) / 2;
  const drawInfoBox = (x, title, rows) => {
    pdf.setFillColor(...pale);
    pdf.setDrawColor(229, 218, 237);
    pdf.rect(x, boxY, boxWidth, boxHeight, 'FD');
    text(title, x + 4, boxY + 6, 8, purple, true);
    pdf.setDrawColor(221, 209, 230);
    pdf.line(x + 4, boxY + 8, x + boxWidth - 4, boxY + 8);
    let y = boxY + 14;
    rows.forEach(([label, value]) => {
      text(label, x + 4, y, 7, muted);
      const lines = wrapped(value || '-', boxWidth - 35, 7, true);
      pdf.text(lines, x + 34, y);
      y += Math.max(5, lines.length * 3.2);
    });
  };
  drawInfoBox(left, 'INFORMASI PEMBAYAR (KLIEN)', [
    ['Nama Klien', client.name],
    ['Nama Event', event.name],
    ['Tanggal Acara', event.event_date ? dateLong(event.event_date) : '-'],
    ['Lokasi Venue', event.venue || '-']
  ]);
  const transactionDate = lastPayment?.paid_at
    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(lastPayment.paid_at))
    : issuedDate;
  drawInfoBox(left + boxWidth + boxGap, 'DETAIL PENERIMAAN TRANSAKSI', [
    ['Tgl. Transaksi', transactionDate],
    ['Jenis Pembayaran', lastPayment ? `${lastPayment.installment_type || lastPayment.label} + Deposit` : 'Invoice / Jadwal Termin'],
    ['Metode Bayar', lastPayment?.payment_method || '-'],
    ['No. Referensi', receiptNumber || receivable.invoice_number]
  ]);

  let y = boxY + boxHeight + 9;
  text('1. Rincian Penerimaan Pembayaran', left, y, 9, purple, true);
  y += 3;
  const columns = { number: left + 4, description: left + 13, status: 151, amount: right - 4 };
  const tableWidth = right - left;
  const rowHeightFor = (description, detail) => {
    const lineCount = wrapped(description, 112, 7, true).length + (detail ? wrapped(detail, 112, 6).length : 0);
    return Math.max(12, 5 + lineCount * 3);
  };
  const drawTableHeader = () => {
    pdf.setFillColor(...purple);
    pdf.rect(left, y, tableWidth, 8, 'F');
    text('No', columns.number, y + 5.3, 7, [255, 255, 255], true);
    text('Deskripsi Pembayaran / Alokasi Dana', columns.description, y + 5.3, 7, [255, 255, 255], true);
    text('Status', columns.status, y + 5.3, 7, [255, 255, 255], true, { align: 'center' });
    text('Nominal Diterima', columns.amount, y + 5.3, 7, [255, 255, 255], true, { align: 'right' });
    y += 8;
  };
  drawTableHeader();
  const rows = terms.map(term => ({
    description: `Pembayaran ${term.installment_type || term.label || 'Termin'}`,
    detail: term.status === 'Dibayar'
      ? `${term.paid_at ? dateLong(term.paid_at) : '-'} · ${term.payment_method || 'Metode tidak dicatat'}`
      : `Jatuh tempo ${term.due_date ? dateLong(term.due_date) : '-'} · ${term.status}`,
    status: term.status === 'Dibayar' ? 'LUNAS' : term.status === 'Terlambat' ? 'TERLAMBAT' : term.status.toUpperCase(),
    amount: Number(term.amount) || 0,
    paid: term.status === 'Dibayar',
    kind: 'term'
  }));
  if (securityDeposit) {
    const refunded = securityDeposit.status === 'Dikembalikan';
    const refundAmount = Math.max(0, Number(securityDeposit.amount) - Number(securityDeposit.damage_deduction || 0));
    rows.push({
      description: 'Setoran Smart Deposit (Jaminan Properti)',
      detail: refunded ? `Telah dikembalikan ${money(refundAmount)} setelah potongan kerusakan` : `Jaminan properti event · diterima ${securityDeposit.deposited_at ? dateLong(securityDeposit.deposited_at) : '-'}`,
      status: refunded ? 'DIKEMBALIKAN' : 'DITERIMA',
      amount: Number(securityDeposit.amount) || 0,
      paid: true,
      kind: 'security'
    });
  }
  if (!rows.length) rows.push({ description: 'Belum ada pembayaran yang dijadwalkan', detail: '', status: 'BELUM ADA', amount: 0, paid: false, kind: 'empty' });
  rows.forEach((row, index) => {
    const height = rowHeightFor(row.description, row.detail);
    if (y + height > 222) {
      pdf.addPage();
      y = 18;
      drawTableHeader();
    }
    if (index % 2 === 0) {
      pdf.setFillColor(250, 247, 252);
      pdf.rect(left, y, tableWidth, height, 'F');
    }
    pdf.setDrawColor(231, 223, 237);
    pdf.line(left, y + height, right, y + height);
    const descriptionLines = wrapped(row.description, 112, 7, true);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(...ink);
    pdf.text(descriptionLines, columns.description, y + 5);
    if (row.detail) {
      const detailLines = wrapped(row.detail, 112, 6);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6);
      pdf.setTextColor(...muted);
      pdf.text(detailLines, columns.description, y + 5 + descriptionLines.length * 3);
    }
    text(String(index + 1), columns.number, y + 6, 7, ink);
    const statusColor = row.paid ? green : row.status === 'TERLAMBAT' ? red : muted;
    text(row.status, columns.status, y + height / 2 + 1, 6, statusColor, true, { align: 'center' });
    text(money(row.amount), columns.amount, y + height / 2 + 1, 7, ink, false, { align: 'right' });
    y += height;
  });

  const summaryTop = y + 7;
  const summaryX = 105;
  const summaryWidth = right - summaryX;
  const summaryRows = [
    ['Total Nilai Kontrak Event', totalContract, ink, false],
    ['Pembayaran Termin Masuk', installmentsPaid, ink, false],
    ['Jaminan Properti Diterima', securityReceived, ink, false],
    ['TOTAL DANA DITERIMA', totalReceived, green, true],
    ['Sisa Tagihan Kontrak', remaining, remaining > 0 ? red : green, true]
  ];
  let summaryY = summaryTop;
  summaryRows.forEach(([label, amount, color, emphasize], index) => {
    if (emphasize) {
      pdf.setFillColor(...(label === 'TOTAL DANA DITERIMA' ? [244, 238, 248] : [255, 255, 255]));
      pdf.rect(summaryX, summaryY - 5, summaryWidth, 10, 'F');
      if (label === 'TOTAL DANA DITERIMA') {
        pdf.setDrawColor(...purple);
        pdf.setLineWidth(0.5);
        pdf.line(summaryX, summaryY + 5, right, summaryY + 5);
      }
    }
    text(label, summaryX + 2, summaryY, emphasize ? 7 : 7, emphasize && label === 'TOTAL DANA DITERIMA' ? purple : muted, emphasize);
    text(money(amount), right - 2, summaryY, emphasize ? 8 : 7, color, true, { align: 'right' });
    summaryY += emphasize ? 11 : 8;
  });

  let footerY = Math.max(summaryY + 5, 224);
  if (footerY + 48 > pageHeight - 12) {
    pdf.addPage();
    footerY = 20;
  }
  const noteWidth = 94;
  pdf.setFillColor(250, 247, 252);
  pdf.setDrawColor(229, 218, 237);
  pdf.rect(left, footerY, noteWidth, 38, 'FD');
  text('Ketentuan & Catatan Pembayaran', left + 4, footerY + 6, 8, purple, true);
  const noteLines = [
    'Pembayaran termin dicatat berdasarkan transaksi yang telah dikonfirmasi.',
    'Jaminan properti dicatat terpisah dari nilai kontrak dan dikembalikan sesuai hasil pemeriksaan barang.',
    receivable.notes ? `Catatan: ${String(receivable.notes).slice(0, 115)}` : ''
  ].filter(Boolean);
  let noteY = footerY + 12;
  noteLines.forEach(note => {
    const lines = wrapped(`- ${note}`, noteWidth - 8, 6);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    pdf.setTextColor(...muted);
    pdf.text(lines, left + 4, noteY);
    noteY += lines.length * 3 + 1;
  });
  const signX = 145;
  text(`Semarang, ${issuedDate}`, signX + 22, footerY + 5, 7, muted, false, { align: 'center' });
  text('Kasir / Finance Manager', signX + 22, footerY + 11, 7, purple, true, { align: 'center' });
  pdf.setDrawColor(...green);
  pdf.setLineWidth(0.6);
  pdf.ellipse(signX + 22, footerY + 23, 18, 6, 'S');
  text('JULIETA SUITE', signX + 22, footerY + 22, 7, green, true, { align: 'center' });
  text(receivable.status === 'Lunas' ? 'PAID / LUNAS' : 'INVOICE PEMBAYARAN', signX + 22, footerY + 26, 5, green, true, { align: 'center' });
  text(state.adminName || STUDIO_PROFILE.financeName, signX + 22, footerY + 36, 8, ink, true, { align: 'center' });
  pdf.setFontSize(6);
  pdf.setTextColor(...muted);
  pdf.text('Dokumen diterbitkan oleh sistem Julieta Suite.', left, pageHeight - 8);
  return pdf.output('blob');
}
function receiptDocumentLines(receivable) {
  const event = eventFor(receivable);
  const client = clientFor(event);
  const payments = useData().deposits.filter(item => item.receivable_id === receivable.id && depositPaid(item)).sort((a, b) => String(a.paid_at).localeCompare(String(b.paid_at)));
  return [
    'BUKTI PELUNASAN',
    'JULIETA SUITE BY JULIETA EVENT & DECOR',
    '',
    `Nomor invoice: ${receivable.invoice_number}`,
    `Klien: ${client?.name || '-'}`,
    `Nama acara: ${event?.name || '-'}`,
    `Venue: ${event?.venue || '-'}`,
    `Tanggal acara: ${event?.event_date ? dateLong(event.event_date) : '-'}`,
    '',
    `Total kontrak: ${money(receivable.total_amount)}`,
    `Total pembayaran diterima: ${money(receivable.amount_paid)}`,
    `Sisa piutang: ${money(receivable.remaining_amount)}`,
    '',
    'RINCIAN PEMBAYARAN',
    ...payments.map(item => `${item.paid_at ? String(item.paid_at).slice(0, 10) : '-'} | ${item.installment_type || item.label} | ${money(item.amount)} | ${item.payment_method || '-'}`),
    '',
    'Status: LUNAS',
    'Bukti ini diterbitkan oleh Julieta Suite.'
  ];
}
function createPdfBlob(lines) {
  const safeLines = lines.flatMap(line => {
    const ascii = String(line).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '');
    if (ascii.length <= 82) return [ascii];
    const parts = [];
    for (let offset = 0; offset < ascii.length; offset += 82) parts.push(ascii.slice(offset, offset + 82));
    return parts;
  });
  const pageLines = Array.from({ length: Math.ceil(safeLines.length / 43) || 1 }, (_, index) => safeLines.slice(index * 43, (index + 1) * 43));
  const escapePdfText = text => text.replace(/([\\()])/g, '\\$1');
  const pageObjectIds = pageLines.map((_, index) => 5 + index * 2);
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pageObjectIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageLines.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'
  ];
  pageLines.forEach((linesOnPage, index) => {
    const pageId = pageObjectIds[index];
    const contentId = pageId + 1;
    const text = linesOnPage.map((line, lineIndex) => {
      const fontSize = index === 0 && lineIndex === 0 ? 18 : 10;
      const move = lineIndex === 0 ? '' : '0 -17 Td\n';
      return `${move}/${index === 0 && lineIndex === 0 ? 'F2' : 'F1'} ${fontSize} Tf\n(${escapePdfText(line)}) Tj`;
    }).join('\n');
    const content = `BT\n50 790 Td\n${text}\nET`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}
function downloadPdf(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function shareClientPdf(receivableId, kind) {
  const receivable = useData().receivables.find(item => item.id === receivableId);
  const event = eventFor(receivable);
  const client = clientFor(event);
  const receipt = kind === 'receipt';
  if (!receivable || !event || !client || (receipt && receivable.status !== 'Lunas')) {
    showToast(receipt ? 'Bukti pelunasan hanya tersedia setelah seluruh invoice berstatus lunas.' : 'Data invoice atau klien tidak ditemukan.');
    return;
  }
  const label = receipt ? 'Bukti-Pelunasan' : 'Invoice';
  const fileName = `${label}-${String(receivable.invoice_number).replace(/[^a-zA-Z0-9-]/g, '-')}.pdf`;
  let blob;
  try {
    blob = receipt ? createPdfBlob(receiptDocumentLines(receivable)) : await createInvoicePdfBlob(receivable);
  } catch (error) {
    showToast(error.message || 'PDF invoice gagal dibuat.');
    return;
  }
  const file = new File([blob], fileName, { type: 'application/pdf' });
  const number = whatsappNumber(client.phone);
  const details = receipt
    ? `✅ *PELUNASAN DITERIMA*\n• *Total pembayaran:* ${money(receivable.amount_paid)}\n• *Sisa piutang:* ${money(receivable.remaining_amount)}\n\nTerlampir bukti pelunasan PDF untuk invoice *${receivable.invoice_number}*.`
    : `Terlampir invoice PDF *${receivable.invoice_number}* untuk acara ${event.name}.\n• Total tagihan: ${money(receivable.total_amount)}\n• Pembayaran diterima: ${money(receivable.amount_paid)}\n• Sisa piutang: ${money(receivable.remaining_amount)}`;
  const message = `${whatsappGreeting()}, Yth. Bapak/Ibu *${client.name}*.\n\n${details}\n\nSalam,\n*Julieta Suite by Julieta Event & Décor*`;
  const shareData = { files: [file], title: `${receipt ? 'Bukti pelunasan' : 'Invoice'} ${receivable.invoice_number}`, text: message };
  if (number && navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share(shareData);
      showToast('PDF dibagikan. Pilih WhatsApp dan klien tujuan pada menu berbagi.');
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
      downloadPdf(blob, fileName);
      window.open(`https://wa.me/${number}?text=${encodeURIComponent(`${message}\n\nSilakan lampirkan file PDF ${fileName} yang baru diunduh.`)}`, '_blank', 'noopener,noreferrer');
      showToast('Berbagi file tidak tersedia. PDF diunduh; lampirkan di WhatsApp yang terbuka.');
      return;
    }
  }
  downloadPdf(blob, fileName);
  if (!number) {
    showToast('PDF berhasil diunduh, tetapi nomor WhatsApp klien belum tersedia.');
    return;
  }
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(`${message}\n\nSilakan lampirkan file PDF ${fileName} yang baru diunduh.`)}`, '_blank', 'noopener,noreferrer');
  showToast('PDF diunduh dan chat klien dibuka. Lampirkan PDF sebelum mengirim pesan.');
}
function monthKey(value) { return String(value || '').slice(0, 7); }
function whatsappRefundButton(deposit) {
  const event = useData().events.find(item => item.id === deposit.event_id);
  const client = clientFor(event);
  if (!client || !event) return '<span class="cell-sub">Data klien belum tersedia</span>';
  const refund = Math.max(0, Number(deposit.amount) - Number(deposit.damage_deduction || 0));
  return whatsappLink(client, `Halo ${client.name}, pengembalian smart deposit event "${event.name}" telah diproses. Deposit awal ${money(deposit.amount)}, potongan kerusakan ${money(deposit.damage_deduction || 0)}, dan nilai refund ${money(refund)}. Dana dikirim ke rekening ${client.bank_name || ''} ${client.bank_account_number || ''}. Terima kasih.`, 'Konfirmasi refund');
}
function chartMarkup() {
  const data = useData();
  const months = Array.from({ length: 6 }, (_, index) => new Date(new Date().getFullYear(), new Date().getMonth() - 5 + index, 1));
  const keys = months.map(date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  const series = [
    { name: 'Piutang', className: 'receivable', values: keys.map(key => data.receivables.filter(item => item.status !== 'Draft' && monthKey(item.issued_at) === key).reduce((sum, item) => sum + Number(item.total_amount), 0) / 1000000) },
    { name: 'Pembayaran', className: 'payment', values: keys.map(key => data.deposits.filter(item => depositPaid(item) && monthKey(item.paid_at) === key).reduce((sum, item) => sum + Number(item.amount), 0) / 1000000) },
    { name: 'Kerusakan barang', className: 'damage', values: keys.map(key => data.securityDeposits.filter(item => monthKey(item.refunded_at || item.deposited_at) === key).reduce((sum, item) => sum + Number(item.damage_deduction || 0), 0) / 1000000) }
  ];
  const maxValue = Math.max(1, ...series.flatMap(item => item.values));
  const scale = Math.ceil(maxValue / 10) * 10 || 1;
  const pointsFor = values => values.map((value, index) => `${58 + index * 65},${145 - value / scale * 108}`).join(' ');
  const axisLabels = [scale, scale / 2, 0].map((value, index) => `<text class="chart-label" x="3" y="${40 + index * 53}">${Number.isInteger(value) ? value : value.toFixed(1)} jt</text>`).join('');
  const gridLines = [40, 93, 146].map(y => `<line class="chart-grid-line" x1="52" y1="${y}" x2="395" y2="${y}"/>`).join('');
  const lines = series.map(item => {
    const points = pointsFor(item.values);
    return `<polyline class="chart-line ${item.className}" points="${points}"/>${points.split(' ').map(point => { const [x, y] = point.split(','); return `<circle class="chart-dot ${item.className}" cx="${x}" cy="${y}" r="3"/>`; }).join('')}`;
  }).join('');
  const labels = months.map((date, index) => `<text class="chart-label" x="${52 + index * 65}" y="174">${new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(date).replace('.', '')}</text>`).join('');
  return `<svg viewBox="0 0 415 190" role="img" aria-label="Grafik piutang, pembayaran, dan kerusakan barang per bulan selama enam bulan terakhir">${gridLines}${axisLabels}${lines}${labels}</svg>`;
}
function dashboard() {
  const data = useData();
  const deposits = data.deposits;
  const paid = paidTotal();
  const open = outstandingTotal();
  const late = deposits.filter(item => item.status === 'Terlambat');
  const events = sortByDate(data.events.filter(item => item.status !== 'Selesai' && item.status !== 'Dibatalkan' && parseDate(item.event_date) >= new Date(new Date().toDateString())), 'event_date').slice(0, 4);
  const recentReceivables = [...data.receivables].sort((a, b) => parseDate(b.issued_at) - parseDate(a.issued_at)).slice(0, 4);
  const maxOutstanding = Math.max(open + paid, 1);
  const reminders = [...late, ...sortByDate(deposits.filter(item => item.status === 'Terjadwal' || item.status === 'Menunggu bayaran'), 'due_date')].slice(0, 3);
  const today = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()).toLocaleUpperCase('id-ID');
  return `${heading(today, `${greetingByTime()}, ${escapeHtml(state.adminName)}! ✿`, 'Ruang kendali kecil untuk arus kas dan momen-momen besar.', `${actionButton('Catat pembayaran', 'payment', false, '↗')}${actionButton('Buat invoice', 'receivable', true)}`)}
    <div class="stats-grid">${statCard('Total piutang', money(open), `${openCount().length} invoice belum lunas`, '▤')}${statCard('Sudah diterima', money(paid), '<span class="positive">Terverifikasi</span> · semua event', '↗', 'green')}${statCard('Deposit menunggu', `${deposits.filter(item => !depositPaid(item) && item.status !== 'Dibatalkan').length} termin`, `${late.length} membutuhkan tindak lanjut`, '◷', 'rose')}${statCard('Event mendatang', `${data.events.filter(event => event.status !== 'Selesai' && event.status !== 'Dibatalkan').length} event`, 'Dalam kalender studio', '✳', 'gold')}</div>
    <div class="dashboard-grid"><section class="panel"><div class="panel-header"><div><h2>Ringkasan keuangan bulanan</h2><p>Nilai dalam Rp juta · enam bulan terakhir</p></div><button class="text-link" data-view="deposits">Lihat detail →</button></div><div class="chart-wrap">${chartMarkup()}</div><div class="chart-legend"><span><i class="legend-mark receivable"></i>Piutang</span><span><i class="legend-mark payment"></i>Pembayaran</span><span><i class="legend-mark damage"></i>Kerusakan barang</span></div></section>
    <section class="panel deposit-panel"><div class="panel-header"><div><h2>Komposisi piutang</h2><p>Posisi seluruh termin pembayaran</p></div><span class="stat-icon">◌</span></div><div class="deposit-amount">${money(open)}</div><div class="deposit-sub">${money(paid)} sudah dibayarkan dari total invoice</div><div class="progress-track"><span style="width:${Math.min(100, paid / maxOutstanding * 100)}%"></span></div><div class="deposit-foot"><span>${Math.round(paid / maxOutstanding * 100)}% diterima</span><span>${Math.round(open / maxOutstanding * 100)}% tersisa</span></div><div class="deposit-list">${reminders.map(depositRow).join('') || '<div class="table-empty">Belum ada termin pembayaran.</div>'}</div></section></div>
    <div class="lower-grid"><section class="panel"><div class="panel-header"><div><h2>Invoice terbaru</h2><p>Piutang yang baru dicatat</p></div><button class="text-link" data-view="receivables">Semua invoice →</button></div>${recentReceivables.length ? `<div class="table-wrap"><table><thead><tr><th>NO. INVOICE</th><th>EVENT & KLIEN</th><th>SISA</th><th>STATUS</th></tr></thead><tbody>${recentReceivables.map(item => { const event = eventFor(item); return `<tr><td><strong>${escapeHtml(item.invoice_number)}</strong></td><td>${escapeHtml(event?.name || 'Event')}<br><span style="color:#97919d">${escapeHtml(clientFor(event)?.name || '')}</span></td><td>${money(item.remaining_amount ?? item.total_amount)}</td><td>${badge(item.status)}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="table-empty">Belum ada invoice.</div>'}</section>
    <section class="panel"><div class="panel-header"><div><h2>Agenda mendatang</h2><p>Event di kalender Julieta Suite</p></div><button class="text-link" data-view="events">Kalender →</button></div><div class="event-list">${events.map(event => eventRow(event, true)).join('') || '<div class="table-empty">Belum ada event mendatang.</div>'}</div></section></div>`;
}
function toolbar(filters = []) { return `<div class="toolbar"><label class="search-box"><span>⌕</span><input id="table-search" type="search" placeholder="Cari data..." value="${escapeHtml(state.search)}"></label>${filters.length ? `<select id="table-filter" class="filter-select"><option value="all">Semua status</option>${filters.map(filter => `<option ${state.filter === filter ? 'selected' : ''} value="${filter}">${filter}</option>`).join('')}</select>` : ''}</div>`; }
function tablePanel(headers, rows) { return `<section class="panel"><div class="table-wrap"><table><thead><tr>${headers.map(item => `<th>${item}</th>`).join('')}</tr></thead><tbody>${rows || `<tr><td class="table-empty" colspan="${headers.length}">Tidak ada data yang cocok.</td></tr>`}</tbody></table></div></section>`; }
function filtered(items, fields, statusField) { let result = items; if (state.search) { const search = state.search.toLocaleLowerCase('id'); result = result.filter(item => fields(item).some(value => String(value || '').toLocaleLowerCase('id').includes(search))); } if (state.filter !== 'all' && statusField) result = result.filter(item => statusField(item) === state.filter); return result; }
function clientsPage() {
  const data = useData();
  const clients = filtered(data.clients, client => [client.name, client.company_name, client.email, client.phone, client.bank_name, ...data.events.filter(event => event.client_id === client.id).map(event => event.name)], client => client.status);
  const rows = clients.map(client => {
    const history = sortByDate(data.events.filter(event => event.client_id === client.id), 'event_date');
    const bankDetails = [client.bank_name, client.bank_account_name, client.bank_account_number].filter(Boolean).join(' · ');
    return `<tr><td><strong>${escapeHtml(publicId('KLI', client.id))}</strong></td><td><div class="client-cell"><span class="client-avatar">${initials(client.name)}</span><strong>${escapeHtml(client.name)}</strong></div><small class="cell-sub">Ditambahkan ${dateLong(client.created_at)}</small></td><td>${escapeHtml(client.company_name || 'Individu')}<br><span class="cell-sub">${escapeHtml(client.email || '—')} · WA: ${escapeHtml(client.phone || '—')}</span></td><td>${history.map(event => `<div class="history-item"><strong>${escapeHtml(event.name)}</strong> ${badge(event.status)}<small>${dateShort(event.event_date)}${event.end_date ? ` – ${dateShort(event.end_date)}` : ''}</small></div>`).join('') || '<span class="cell-sub">Belum ada event</span>'}</td><td>${statusSelect('clients', client.id, client.status, ['Aktif', 'Nonaktif', 'Selesai'])}</td><td>${escapeHtml(bankDetails || '—')}</td><td><button class="button small" data-action="edit-client" data-id="${client.id}">Ubah kontak</button> ${deleteButton('clients', client.id)}</td></tr>`;
  }).join('');
  return `${heading('DATABASE STUDIO', 'Klien', 'Profil, status, rekening pengembalian, dan riwayat event.', actionButton('Tambah klien', 'client', true))}<div class="stats-grid" style="margin-bottom:15px">${statCard('Total klien', data.clients.length, 'Kontak terdaftar', '♧')}${statCard('Aktif', data.clients.filter(client => client.status === 'Aktif').length, 'Masih memiliki kegiatan', '✳', 'green')}${statCard('Selesai', data.clients.filter(client => client.status === 'Selesai').length, 'Seluruh event selesai', '✓', 'gold')}${statCard('Nonaktif', data.clients.filter(client => client.status === 'Nonaktif').length, 'Tidak aktif saat ini', '◌', 'rose')}</div>${toolbar(['Aktif', 'Nonaktif', 'Selesai'])}${tablePanel(['ID KLIEN', 'KLIEN & DITAMBAHKAN', 'KONTAK / WHATSAPP', 'RIWAYAT EVENT', 'STATUS', 'REKENING REFUND', 'AKSI'], rows)}`;
}
function eventsPage() {
  const data = useData();
  const events = filtered(data.events, event => [event.name, event.event_type, event.venue, event.pic_name, clientFor(event)?.name, ...(event.special_needs || [])], event => event.status);
  const rows = events.map(event => `<tr><td><strong>${escapeHtml(publicId('EVT', event.id))}</strong><br><span class="cell-sub">${escapeHtml(event.name)}</span></td><td>${escapeHtml(clientFor(event)?.name || '—')}</td><td>${dateLong(event.event_date)}${event.end_date ? `<br><span class="cell-sub">s/d ${dateLong(event.end_date)}</span>` : ''}<br><span class="cell-sub">${Number(event.duration_days) || 1} hari</span></td><td>${escapeHtml(event.venue || '—')}</td><td>${(event.services || []).map(service => escapeHtml(service.name)).join(', ') || event.special_needs?.map(escapeHtml).join(', ') || '—'}<br><span class="cell-sub">${escapeHtml(event.location_zone || 'Zona 1')} · biaya lokasi ${money(event.location_surcharge || 0)}</span></td><td>${escapeHtml(event.pic_name || '—')}</td><td>${money(event.budget)}</td><td>${statusSelect('events', event.id, event.status, ['Persiapan', 'Berlangsung', 'Selesai', 'Dibatalkan'])}</td><td>${deleteButton('events', event.id)}</td></tr>`).join('');
  return `${heading('KALENDER STUDIO', 'Event', 'Tanggal, layanan terpilih, zona lokasi, dan nilai kontrak.', actionButton('Tambah event', 'event', true))}<div class="stats-grid" style="margin-bottom:15px">${statCard('Seluruh event', data.events.length, 'Kontrak terdaftar', '✳')}${statCard('Persiapan', data.events.filter(event => event.status === 'Persiapan').length, 'Sedang disiapkan', '◷', 'gold')}${statCard('Berlangsung', data.events.filter(event => event.status === 'Berlangsung').length, 'Sedang berjalan', '⌕', 'rose')}${statCard('Selesai', data.events.filter(event => event.status === 'Selesai').length, 'Event terlaksana', '✓', 'green')}</div>${toolbar(['Persiapan', 'Berlangsung', 'Selesai', 'Dibatalkan'])}${tablePanel(['ID EVENT', 'NAMA EVENT', 'KLIEN', 'TANGGAL ACARA', 'VENUE', 'LAYANAN & ZONA', 'PIC', 'NILAI', 'STATUS', 'AKSI'], rows)}`;
}
function receivablesPage() {
  const data = useData();
  const items = filtered(data.receivables, item => [item.invoice_number, item.status, eventFor(item)?.name, clientFor(eventFor(item))?.name], item => item.status);
  const rows = items.map(item => {
    const event = eventFor(item);
    const nextInstallment = sortByDate(data.deposits.filter(deposit => deposit.receivable_id === item.id && !depositPaid(deposit) && deposit.status !== 'Dibatalkan'), 'due_date')[0];
    const reminder = nextInstallment ? dueReminder(nextInstallment) : '';
    return `<tr><td><strong>${escapeHtml(item.invoice_number)}</strong><br><span class="cell-sub">${dateShort(item.issued_at)}</span></td><td>${escapeHtml(event?.name || '—')}<br><span class="cell-sub">${escapeHtml(clientFor(event)?.name || '')}</span></td><td>${money(item.total_amount)}</td><td>${money(item.amount_paid)}</td><td><strong>${money(item.remaining_amount)}</strong></td><td>${badge(item.status)}${nextInstallment ? `<br><span class="cell-sub">${escapeHtml(nextInstallment.installment_type || nextInstallment.label)} · ${dateShort(nextInstallment.due_date)} ${reminder ? `<span class="due-marker ${reminder === 'TERLAMBAT' ? 'overdue' : ''}">${reminder}</span>` : ''}</span>` : ''}${item.status === 'Draft' ? `<br><button class="button small" data-action="publish-invoice" data-id="${item.id}">Terbitkan</button>` : ''}</td><td>${whatsappInvoiceButton(item)} ${deleteButton('receivables', item.id)}</td></tr>`;
  }).join('');
  return `${heading('ARUS KAS MASUK', 'Piutang', 'Saldo tersisa dan status invoice diperbarui dari pembayaran deposit.', actionButton('Buat invoice', 'receivable', true))}<div class="stats-grid" style="margin-bottom:15px">${statCard('Total invoice', data.receivables.length, 'Semua invoice dibuat', '▤')}${statCard('Nilai invoice', money(data.receivables.reduce((sum, item) => sum + Number(item.total_amount), 0)), 'Nilai kontrak terbit', '◌', 'gold')}${statCard('Sudah diterima', money(paidTotal()), 'Dari pembayaran tercatat', '↗', 'green')}${statCard('Sisa piutang', money(outstandingTotal()), `${openCount().length} invoice belum lunas`, '◷', 'rose')}</div>${toolbar(['Draft', 'Belum dibayar', 'Dibayar sebagian', 'Lunas', 'Terlambat'])}${tablePanel(['NO. INVOICE', 'EVENT & KLIEN', 'TOTAL', 'DIBAYAR', 'SISA PIUTANG', 'STATUS / TERMIN BERIKUTNYA', 'KIRIM INVOICE / AKSI'], rows)}`;
}
function damageNotesFor(deposit) {
  const items = Array.isArray(deposit.damage_items) ? deposit.damage_items : [];
  const details = items.map(item => `${item.name}: ${item.quantity} ${item.unit} × ${money(item.unit_price)} = ${money(item.total)}`);
  if (deposit.damage_notes) details.push(deposit.damage_notes);
  return details.join(' · ') || 'Tidak ada potongan';
}
function securityDepositPanel() {
  const data = useData();
  const rows = data.securityDeposits.map(deposit => {
    const event = data.events.find(item => item.id === deposit.event_id);
    const client = clientFor(event);
    const refund = Math.max(0, Number(deposit.amount) - Number(deposit.damage_deduction || 0));
    const bank = [client?.bank_name, client?.bank_account_name, client?.bank_account_number].filter(Boolean).join(' · ');
    return `<tr><td><strong>${escapeHtml(event?.name || 'Event')}</strong><br><span class="cell-sub">${escapeHtml(client?.name || 'Klien')} · ${dateLong(deposit.deposited_at)}</span></td><td>${money(deposit.amount)}</td><td>${money(deposit.damage_deduction || 0)}<br><span class="cell-sub">${escapeHtml(damageNotesFor(deposit))}</span></td><td><strong>${money(refund)}</strong></td><td>${escapeHtml(bank || 'Rekening refund belum diisi')}</td><td>${badge(deposit.status)}${deposit.refunded_at ? `<br><span class="cell-sub">${dateLong(deposit.refunded_at)}</span>` : ''}</td><td>${deposit.status === 'Dikembalikan' ? whatsappRefundButton(deposit) : `<button class="button small primary" data-action="process-refund" data-id="${deposit.id}">Hitung & refund</button>`}</td></tr>`;
  }).join('');
  return `<section class="panel deposit-ledger"><div class="panel-header"><div><h2>Jaminan properti & refund</h2><p>Catat uang jaminan event, potongan kerusakan secara transparan, dan sisa refund ke rekening klien.</p></div>${actionButton('Catat jaminan', 'security-deposit', true)}</div>${tablePanel(['EVENT & KLIEN', 'JAMINAN', 'POTONGAN & CATATAN', 'NILAI REFUND', 'REKENING KLIEN', 'STATUS', 'AKSI'], rows)}</section>`;
}
function depositsPage() {
  const data = useData();
  const items = filtered(data.deposits, deposit => [publicId('DEP', deposit.id), deposit.installment_type, eventFor(receivableFor(deposit))?.name, receivableFor(deposit)?.invoice_number, deposit.payment_method], deposit => deposit.status);
  const rows = items.map(deposit => { const receivable = receivableFor(deposit); const event = eventFor(receivable); const reminder = dueReminder(deposit); return `<tr><td><strong>${escapeHtml(publicId('DEP', deposit.id))}</strong><br><span class="cell-sub">${escapeHtml(deposit.installment_type)}</span></td><td>${escapeHtml(event?.name || '—')}<br><span class="cell-sub">${escapeHtml(clientFor(event)?.name || '')}</span></td><td>${dateLong(deposit.due_date)}${reminder ? `<br><span class="due-marker ${reminder === 'TERLAMBAT' ? 'overdue' : ''}">${reminder}</span>` : ''}</td><td>${money(deposit.amount)}</td><td>${escapeHtml(deposit.payment_method || '—')}</td><td>${depositPaid(deposit) ? dateLong(deposit.paid_at) : '—'}</td><td>${badge(deposit.status)}</td><td>${depositPaid(deposit) ? whatsappPaidButton(deposit) : `${whatsappReminderButton(deposit)} <button class="button small" data-action="mark-paid" data-id="${deposit.id}">Catat pembayaran</button>`} ${deleteButton('deposits', deposit.id)}</td></tr>`; }).join('');
  const overdue = data.deposits.filter(deposit => deposit.status === 'Terlambat').length;
  const upcoming = data.deposits.filter(item => ['Terjadwal', 'Menunggu bayaran'].includes(item.status) && parseDate(item.due_date) >= parseDate(new Date().toISOString().slice(0, 10)) && parseDate(item.due_date) <= new Date(Date.now() + 7 * 86400000));
  const reminders = [...data.deposits.filter(item => item.status === 'Terlambat'), ...sortByDate(upcoming, 'due_date')].slice(0, 6);
  return `${heading('JADWAL PEMBAYARAN', 'Smart deposit & Refund', 'Pantau piutang, uang jaminan properti, potongan kerusakan, dan pengembalian dana.', `${actionButton('Tambah termin', 'deposit', false)}${actionButton('Catat jaminan', 'security-deposit', false)}${actionButton('Catat pembayaran', 'payment', true)}`)}<div class="stats-grid" style="margin-bottom:15px">${statCard('Deposit diterima', money(paidTotal()), 'Pembayaran tervalidasi', '↗', 'green')}${statCard('Terjadwal', data.deposits.filter(deposit => deposit.status === 'Terjadwal').length, 'Jatuh tempo lebih dari 7 hari', '◷', 'gold')}${statCard('Menunggu bayaran', data.deposits.filter(deposit => deposit.status === 'Menunggu bayaran').length, 'Jatuh tempo dalam 7 hari', '⌕', 'rose')}${statCard('Terlambat', overdue, 'Butuh tindak lanjut', '!', 'rose')}</div>${toolbar(['Terjadwal', 'Menunggu bayaran', 'Terlambat', 'Dibayar', 'Dibatalkan'])}${tablePanel(['ID DEPOSIT', 'EVENT & KLIEN', 'JATUH TEMPO', 'NILAI', 'METODE BAYAR', 'TANGGAL DIBAYAR', 'STATUS', 'AKSI'], rows)}<section class="panel" style="margin-top:15px"><div class="panel-header"><div><h2>Pengingat pembayaran</h2><p>Termin terlambat dan jatuh tempo dalam 7 hari</p></div><span class="status scheduled">${upcoming.length} segera jatuh tempo</span></div><div class="reminder-list">${reminders.map(item => { const event = eventFor(receivableFor(item)); return `<div class="reminder-item"><span class="reminder-mark">◷</span><div><strong>${escapeHtml(item.installment_type)} · ${escapeHtml(event?.name || '')}</strong><small>${item.status === 'Terlambat' ? 'Terlambat' : 'Jatuh tempo'} ${dateLong(item.due_date)} · ${money(item.amount)}</small></div>${whatsappReminderButton(item)}</div>`; }).join('') || '<div class="table-empty">Belum ada pengingat jatuh tempo.</div>'}</div></section>${securityDepositPanel()}`;
}
function render() {
  const views = { dashboard, receivables: receivablesPage, deposits: depositsPage, events: eventsPage, clients: clientsPage };
  page.innerHTML = views[state.view]();
  document.querySelector('#admin-name').textContent = state.adminName;
  document.querySelector('#nav-receivables').textContent = openCount().length;
  document.querySelector('#nav-deposits').textContent = useData().deposits.filter(item => dueReminder(item)).length;
  document.querySelector('#today-label').textContent = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date());
  const search = document.querySelector('#table-search');
  if (search) search.addEventListener('input', event => { state.search = event.target.value; const position = event.target.selectionStart; render(); const nextInput = document.querySelector('#table-search'); nextInput.focus(); nextInput.setSelectionRange(position, position); });
  const filter = document.querySelector('#table-filter');
  if (filter) filter.addEventListener('change', event => { state.filter = event.target.value; render(); });
  page.querySelectorAll('.inline-status').forEach(control => control.addEventListener('change', async event => {
    const select = event.currentTarget;
    select.disabled = true;
    try {
      await supabaseRequest(select.dataset.table, `id=eq.${encodeURIComponent(select.dataset.id)}`, { method: 'PATCH', body: { status: select.value } });
      state.data = await loadData();
      showToast('Status berhasil diperbarui.');
      render();
    } catch (error) {
      select.value = select.dataset.current;
      select.disabled = false;
      showToast(error.message || 'Status gagal diperbarui.');
    }
  }));
}
function options(items, valueKey, labelFn, placeholder) { return `<option value="">${placeholder}</option>${items.map(item => `<option value="${escapeHtml(item[valueKey])}">${escapeHtml(labelFn(item))}</option>`).join('')}`; }
function field(label, name, type = 'text', required = true, full = false, extra = '') { return `<div class="form-field ${full ? 'full' : ''}"><label for="field-${name}">${label}${required ? ' *' : ''}</label><input id="field-${name}" name="${name}" type="${type}" ${required ? 'required' : ''} ${extra}></div>`; }
function showModal(title, subtitle, form, submitLabel) {
  modalLayer.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><div><h2 id="modal-title">${title}</h2><p>${subtitle}</p></div><button class="icon-button" data-action="close-modal" aria-label="Tutup">×</button></div><form id="data-form">${form}<div class="modal-actions"><button type="button" class="button" data-action="close-modal">Batal</button><button type="submit" class="button primary">${submitLabel}</button></div></form></section>`;
  modalLayer.hidden = false;
  document.querySelector('#field-name, #field-client_id, #field-receivable_id, #field-amount')?.focus();
}
function newClientForm(clientId = '') {
  const client = clientId ? useData().clients.find(item => item.id === clientId) : null;
  const editing = Boolean(client);
  const value = key => client?.[key] ? `value="${escapeHtml(client[key])}"` : '';
  const statusOptions = ['Aktif', 'Nonaktif', 'Selesai'].map(status => `<option ${client?.status === status ? 'selected' : ''}>${status}</option>`).join('');
  showModal(editing ? 'Ubah kontak klien' : 'Tambah klien', editing ? 'Perbarui nomor WhatsApp dan rekening refund klien.' : 'ID dan tanggal ditambahkan akan dibuat otomatis.', `${editing ? `<input type="hidden" name="client_id_update" value="${escapeHtml(client.id)}">` : ''}<div class="form-grid">${field('Nama lengkap', 'name', 'text', true, true, value('name'))}${field('Nama perusahaan', 'company_name', 'text', false, false, value('company_name'))}${field('Email', 'email', 'email', false, false, value('email'))}${field('Nomor WhatsApp', 'phone', 'tel', false, false, `autocomplete="tel" inputmode="tel" maxlength="20" placeholder="+62 812 3456 7890" ${value('phone')}`)}<div class="form-field"><label for="field-status">Status klien</label><select id="field-status" name="status">${statusOptions}</select></div><div class="form-field full"><span class="field-heading">Rekening untuk pengembalian deposit</span></div>${field('Nama bank', 'bank_name', 'text', false, false, value('bank_name'))}${field('Nama pemilik rekening', 'bank_account_name', 'text', false, false, value('bank_account_name'))}${field('Nomor rekening', 'bank_account_number', 'text', false, false, value('bank_account_number'))}</div>`, editing ? 'Simpan perubahan' : 'Simpan klien');
}
function newEventForm() {
  const needs = ['MC', 'Dekorasi', 'Penampilan sanggar', 'Wardrobe', 'Catering'];
  const services = SERVICE_OPTIONS.map(([id, name, basePrice]) => `<div class="service-card"><label class="service-card-head"><input type="checkbox" name="selected_services" value="${id}"><strong>${name}</strong></label><div class="service-base-price">Harga dasar / hari <strong>${money(basePrice)}</strong></div><label class="service-price"><span>Harga layanan per hari (Rp)</span><input type="number" name="price_${id}" min="0" step="1000" value="${basePrice}" disabled aria-label="Harga ${name} per hari"></label></div>`).join('');
  const zones = LOCATION_ZONES.map(([id, label, fee]) => `<option value="${id}" data-fee="${fee}">${id} · ${label} — ${money(fee)}</option>`).join('');
  const durationOptions = [1, 2, 3].map(days => `<option value="${days}">${days} hari</option>`).join('');
  showModal('Buat event & pilih jasa', 'Harga dasar jasa dihitung per hari. Pilih durasi dan layanan untuk melihat total otomatis.', `<div class="form-grid"><div class="form-field full"><label for="field-client_id">Klien *</label><select id="field-client_id" name="client_id" required>${options(useData().clients, 'id', client => `${publicId('KLI', client.id)} · ${client.name}`, 'Pilih klien')}</select></div>${field('Nama event', 'name', 'text', true, true)}<div class="form-field"><label for="field-event_type">Jenis event *</label><select id="field-event_type" name="event_type" required><option>Pernikahan</option><option>Korporat</option><option>Peluncuran produk</option><option>Private event</option><option>Lainnya</option></select></div>${field('Tanggal mulai', 'event_date', 'date')}${field('Tanggal berakhir', 'end_date', 'date', false)}<div class="form-field"><label for="field-duration_days">Durasi acara *</label><select id="field-duration_days" name="duration_days" required>${durationOptions}</select></div>${field('Venue', 'venue', 'text', false)}${field('PIC event', 'pic_name', 'text', true, false)}<div class="form-field"><label for="field-status">Status event</label><select id="field-status" name="status"><option>Persiapan</option><option>Berlangsung</option><option>Selesai</option><option>Dibatalkan</option></select></div><div class="form-field full"><span class="field-heading">Pilih layanan *</span><div class="service-grid">${services}</div></div><div class="form-field full"><label for="field-location_zone">Zona wilayah *</label><select id="field-location_zone" name="location_zone">${zones}</select></div><div class="form-field full"><section class="quote-summary" aria-live="polite"><div><span>Subtotal jasa × hari</span><strong id="service-subtotal">${money(0)}</strong></div><div><span>Biaya lokasi</span><strong id="location-total">${money(0)}</strong></div><div class="quote-grand-total"><span>Total kontrak</span><strong id="quote-total">${money(0)}</strong><input id="field-budget" name="budget" type="hidden" value="0"></div></section></div><div class="form-field full"><span class="field-heading">Kebutuhan khusus acara</span><div class="check-grid">${needs.map(need => `<label><input type="checkbox" name="special_needs" value="${need}">${need}</label>`).join('')}</div></div></div>`, 'Simpan event');
  modalLayer.querySelectorAll('.service-card').forEach(card => {
    const checkbox = card.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', () => {
      card.classList.toggle('selected', checkbox.checked);
      card.querySelector('.service-price input').disabled = !checkbox.checked;
      updateEventTotal();
    });
    card.addEventListener('click', event => {
      if (event.target.closest('label, input, button')) return;
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
  modalLayer.querySelectorAll('.service-price input').forEach(input => input.addEventListener('input', updateEventTotal));
  modalLayer.querySelector('#field-location_zone').addEventListener('change', updateEventTotal);
  modalLayer.querySelector('#field-duration_days').addEventListener('change', updateEventTotal);
  updateEventTotal();
}
function updateEventTotal() {
  const form = document.querySelector('#data-form');
  if (!form || !form.querySelector('.service-grid')) return;
  const dailySubtotal = [...form.querySelectorAll('.service-price input:not(:disabled)')].reduce((sum, input) => sum + Math.max(0, Number(input.value) || 0), 0);
  const durationDays = Number(form.querySelector('#field-duration_days').value);
  const subtotal = dailySubtotal * durationDays;
  const zone = form.querySelector('#field-location_zone');
  const surcharge = Number(zone.selectedOptions[0]?.dataset.fee || 0);
  form.querySelector('#service-subtotal').textContent = money(subtotal);
  form.querySelector('#location-total').textContent = money(surcharge);
  form.querySelector('#quote-total').textContent = money(subtotal + surcharge);
  form.querySelector('#field-budget').value = String(subtotal + surcharge);
}
function newReceivableForm() {
  showModal('Buat invoice', 'Nilai awal mengikuti kalkulasi jasa dan zona dari event yang dipilih.', `<div class="form-grid"><div class="form-field full"><label for="field-event_id">Event *</label><select id="field-event_id" name="event_id" required>${options(useData().events, 'id', event => `${publicId('EVT', event.id)} · ${event.name}`, 'Pilih event')}</select></div>${field('Nomor invoice', 'invoice_number', 'text', true, false, `value="JS-INV-${String(29 + useData().receivables.length).padStart(3, '0')}"`)}${field('Total invoice (Rp)', 'total_amount', 'number', true, false, 'min="1" step="1"')}${field('Tanggal diterbitkan', 'issued_at', 'date', true, false, `value="${new Date().toISOString().slice(0, 10)}"`)}<div class="form-field"><label for="field-status">Status invoice</label><select id="field-status" name="status"><option>Belum dibayar</option><option>Draft</option></select></div><div class="form-field full"><label for="field-notes">Catatan</label><textarea id="field-notes" name="notes" placeholder="Catatan tambahan untuk invoice"></textarea></div><div class="form-field full"><label for="field-first_deposit">DP pertama (Rp, opsional)</label><input id="field-first_deposit" name="first_deposit" type="number" min="0" step="1000" placeholder="Kosongkan jika belum dijadwalkan"></div><div class="form-field full"><label for="field-due_date">Jatuh tempo DP pertama</label><input id="field-due_date" name="due_date" type="date"></div></div>`, 'Simpan invoice');
  modalLayer.querySelector('#field-event_id').addEventListener('change', event => {
    const selectedEvent = useData().events.find(item => item.id === event.target.value);
    if (selectedEvent) modalLayer.querySelector('#field-total_amount').value = String(selectedEvent.budget);
  });
}
function newPaymentForm() {
  const deposits = useData().deposits.filter(item => !depositPaid(item) && item.status !== 'Dibatalkan');
  showModal('Catat pembayaran', 'Simpan metode dan tanggal pembayaran aktual.', `<div class="form-grid"><div class="form-field full"><label for="field-deposit_id">Termin pembayaran *</label><select id="field-deposit_id" name="deposit_id" required>${options(deposits, 'id', deposit => { const event = eventFor(receivableFor(deposit)); return `${publicId('DEP', deposit.id)} · ${deposit.installment_type || deposit.label} · ${event?.name || ''} · ${money(deposit.amount)}`; }, 'Pilih termin')}</select></div><div class="form-field"><label for="field-payment_method">Metode pembayaran *</label><select id="field-payment_method" name="payment_method" required><option>Transfer bank</option><option>Tunai</option><option>QRIS</option><option>Kartu</option><option>Lainnya</option></select></div>${field('Tanggal pembayaran aktual', 'paid_date', 'date', true, false, `value="${new Date().toISOString().slice(0, 10)}"`)}</div>`, 'Konfirmasi dibayar');
}
function newDepositForm() {
  const receivables = useData().receivables.filter(item => item.status !== 'Draft');
  showModal('Tambah termin', 'Jadwalkan DP, termin lanjutan, atau pelunasan invoice.', `<div class="form-grid"><div class="form-field full"><label for="field-receivable_id">Invoice *</label><select id="field-receivable_id" name="receivable_id" required>${options(receivables, 'id', receivable => `${receivable.invoice_number} · ${eventFor(receivable)?.name || ''} · sisa ${money(receivable.remaining_amount)}`, 'Pilih invoice')}</select></div><div class="form-field"><label for="field-installment_type">Jenis termin *</label><select id="field-installment_type" name="installment_type" required><option>DP</option><option>Termin 2</option><option>Termin 3</option><option>Pelunasan</option></select></div>${field('Nilai deposit (Rp)', 'amount', 'number', true, false, 'min="1000" step="1000"')}${field('Tanggal jatuh tempo', 'due_date', 'date', true, false, 'min="2020-01-01"')}</div>`, 'Jadwalkan termin');
}
function newSecurityDepositForm() {
  const events = useData().events.filter(event => !securityDepositFor(event.id) && event.status !== 'Dibatalkan');
  if (!events.length) { showToast('Setiap event aktif sudah memiliki catatan jaminan.'); return; }
  showModal('Catat jaminan properti', 'Simpan jumlah jaminan yang diterima setelah acara disepakati.', `<div class="form-grid"><div class="form-field full"><label for="field-security_event_id">Event *</label><select id="field-security_event_id" name="security_event_id" required>${options(events, 'id', event => `${event.name} · ${clientFor(event)?.name || ''}`, 'Pilih event')}</select></div>${field('Nominal jaminan (Rp)', 'security_amount', 'number', true, false, 'min="1" step="1"')}${field('Tanggal jaminan diterima', 'deposited_at', 'date', true, false, `value="${new Date().toISOString().slice(0, 10)}"`)}</div>`, 'Simpan jaminan');
}
function newRefundForm(id) {
  const deposit = useData().securityDeposits.find(item => item.id === id);
  if (!deposit || deposit.status === 'Dikembalikan') return;
  const savedItems = Array.isArray(deposit.damage_items) ? deposit.damage_items : [];
  const savedTotal = savedItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const extra = Math.max(0, Number(deposit.damage_deduction || 0) - savedTotal);
  const selectedIds = new Set(savedItems.map(item => item.id));
  const inventory = DAMAGE_INVENTORY.map((item, index) => {
    const saved = savedItems.find(existing => existing.id === item.id);
    const checkboxId = `damage-item-${index}`;
    return `<article class="damage-item"><label for="${checkboxId}"><input id="${checkboxId}" type="checkbox" name="selected_damage_items" value="${item.id}" ${selectedIds.has(item.id) ? 'checked' : ''}><span><strong>${escapeHtml(item.name)}</strong><small>${money(item.price)} / ${escapeHtml(item.unit)}</small></span></label><div class="damage-quantity"><label for="damage-qty-${item.id}">Jumlah (${escapeHtml(item.unit)})</label><input id="damage-qty-${item.id}" type="number" name="damage_qty_${item.id}" value="${saved ? Number(saved.quantity) : ''}" placeholder="0" min="${item.fractional ? '0.01' : '1'}" step="${item.fractional ? '0.01' : '1'}" ${selectedIds.has(item.id) ? '' : 'disabled'} aria-label="Jumlah ${escapeHtml(item.name)}"><strong id="damage-line-total-${item.id}">${money(Number(saved?.total) || 0)}</strong></div></article>`;
  }).join('');
  const available = Number(deposit.amount) - Number(deposit.damage_deduction || 0);
  const event = useData().events.find(item => item.id === deposit.event_id);
  const client = clientFor(event);
  const bank = [client?.bank_name, client?.bank_account_name, client?.bank_account_number].filter(Boolean).join(' · ');
  showModal('Perhitungan refund jaminan', `Saldo awal ${money(deposit.amount)}. Pilih barang rusak dan jumlahnya; denda dihitung otomatis.`, `<input type="hidden" name="security_deposit_id" value="${escapeHtml(id)}"><div class="form-grid"><div class="form-field full refund-bank"><strong>Saldo jaminan awal</strong><span>${money(deposit.amount)} · Rekening refund: ${escapeHtml(bank || 'Belum diisi — lengkapi rekening klien sebelum konfirmasi.')}</span></div><div class="form-field full"><span class="field-heading">Inventaris rusak · centang barang dan isi jumlah</span><div class="damage-grid">${inventory}</div></div>${field('Potongan tambahan (Rp)', 'damage_extra', 'number', false, false, `min="0" max="${Number(deposit.amount)}" step="1000" value="${extra}"`)}<div class="form-field full"><label for="field-damage_notes">Catatan kerusakan tambahan</label><textarea id="field-damage_notes" name="damage_notes" maxlength="1000" placeholder="Keterangan kondisi barang atau catatan tambahan.">${escapeHtml(deposit.damage_notes || '')}</textarea></div><input id="field-damage_deduction" name="damage_deduction" type="hidden" value="${Number(deposit.damage_deduction || 0)}"><div class="form-field full quote-summary damage-summary"><div><span>Total denda inventaris</span><strong id="damage-items-total">${money(savedTotal)}</strong></div><div><span>Potongan tambahan</span><strong id="damage-extra-total">${money(extra)}</strong></div><div><span>Saldo jaminan awal</span><strong>${money(deposit.amount)}</strong></div><div class="quote-grand-total"><span>Total potongan</span><strong id="damage-total">${money(Number(deposit.damage_deduction || 0))}</strong></div><div class="quote-grand-total"><span>Sisa refund ke klien</span><strong id="refund-total">${money(available)}</strong></div><p id="damage-warning" hidden></p><p>Nilai potongan tidak dapat melebihi saldo jaminan. Konfirmasi setelah transfer refund benar-benar dilakukan.</p></div></div>`, 'Konfirmasi refund ditransfer');
  modalLayer.querySelector('.modal').classList.add('wide');
  modalLayer.querySelectorAll('[name="selected_damage_items"]').forEach(checkbox => checkbox.addEventListener('change', () => {
    const quantity = modalLayer.querySelector(`[name="damage_qty_${checkbox.value}"]`);
    quantity.disabled = !checkbox.checked;
    quantity.required = checkbox.checked;
    updateRefundTotal();
  }));
  modalLayer.querySelectorAll('[name="selected_damage_items"]:checked').forEach(checkbox => {
    modalLayer.querySelector(`[name="damage_qty_${checkbox.value}"]`).required = true;
  });
  modalLayer.querySelectorAll('.damage-quantity input, #field-damage_extra').forEach(input => input.addEventListener('input', updateRefundTotal));
  updateRefundTotal();
}
function updateRefundTotal() {
  const deposit = useData().securityDeposits.find(item => item.id === document.querySelector('[name="security_deposit_id"]')?.value);
  if (!deposit) return;
  const itemTotal = [...modalLayer.querySelectorAll('[name="selected_damage_items"]:checked')].reduce((sum, checkbox) => {
    const item = DAMAGE_INVENTORY.find(inventoryItem => inventoryItem.id === checkbox.value);
    const quantity = Number(modalLayer.querySelector(`[name="damage_qty_${checkbox.value}"]`).value);
    const lineTotal = item && Number.isFinite(quantity) && quantity > 0 ? item.price * quantity : 0;
    modalLayer.querySelector(`#damage-line-total-${checkbox.value}`).textContent = money(lineTotal);
    return sum + lineTotal;
  }, 0);
  modalLayer.querySelectorAll('[name="selected_damage_items"]:not(:checked)').forEach(checkbox => {
    modalLayer.querySelector(`#damage-line-total-${checkbox.value}`).textContent = money(0);
  });
  const extra = Math.max(0, Number(modalLayer.querySelector('#field-damage_extra').value) || 0);
  const total = itemTotal + extra;
  modalLayer.querySelector('#field-damage_deduction').value = String(total);
  modalLayer.querySelector('#damage-items-total').textContent = money(itemTotal);
  modalLayer.querySelector('#damage-extra-total').textContent = money(extra);
  modalLayer.querySelector('#damage-total').textContent = money(total);
  modalLayer.querySelector('#refund-total').textContent = money(Math.max(0, Number(deposit.amount) - total));
  const warning = modalLayer.querySelector('#damage-warning');
  warning.hidden = total <= Number(deposit.amount);
  warning.textContent = total > Number(deposit.amount) ? `Potongan melebihi saldo jaminan sebesar ${money(total - Number(deposit.amount))}. Kurangi jumlah sebelum melanjutkan.` : '';
}
async function submitForm(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  const paidDepositId = payload.deposit_id ? String(payload.deposit_id) : '';
  if (form.querySelector('[name="special_needs"]')) payload.special_needs = formData.getAll('special_needs');
  if (form.querySelector('[name="selected_services"]')) payload.selected_services = formData.getAll('selected_services');
  if (form.querySelector('[name="selected_damage_items"]')) {
    payload.damage_items = formData.getAll('selected_damage_items').map(id => {
      const item = DAMAGE_INVENTORY.find(inventoryItem => inventoryItem.id === id);
      const quantity = Number(form.querySelector(`[name="damage_qty_${id}"]`).value);
      return item ? { id: item.id, name: item.name, quantity, unit: item.unit, unit_price: item.price, total: item.price * quantity } : null;
    }).filter(Boolean);
  }
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = 'Menyimpan...';
  try {
    await saveFormData(payload);
    state.data = await loadData();
    modalLayer.hidden = true;
    render();
    if (paidDepositId) {
      showPaymentReceiptModal(paidDepositId);
      showToast('Pembayaran berhasil dicatat. Struk siap dicetak atau dikirim ke klien.');
    } else {
      showToast('Data berhasil disimpan ke Supabase.');
    }
  } catch (error) {
    showToast(error.message || 'Tidak dapat menyimpan data.');
    button.disabled = false;
    button.textContent = 'Coba lagi';
  }
}
async function supabaseRequest(table, query = '', options = {}) {
  const { body, ...requestOptions } = options;
  const session = await ensureFreshAuthSession();
  const response = await fetch(`${SUPABASE_API_URL}/${table}${query ? `?${query}` : ''}`, {
    ...requestOptions,
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation',
      ...options.headers
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let result = null;
  if (text) { try { result = JSON.parse(text); } catch { result = { message: text }; } }
  if (!response.ok) {
    const error = new Error(result?.message || result?.details || result?.hint || `Supabase mengembalikan status ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return result;
}
async function deleteRecord(table, id) {
  const record = state.data[table].find(item => item.id === id);
  if (!record) return;
  const title = record.name || record.invoice_number || record.installment_type || record.label || 'data ini';
  const extra = table === 'receivables' ? '\nSemua termin deposit yang terhubung juga akan dihapus.' : '';
  if (!window.confirm(`Hapus ${title}? Tindakan ini tidak dapat dibatalkan.${extra}`)) return;
  try {
    await supabaseRequest(table, `id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', prefer: 'return=representation' });
    state.data = await loadData();
    render();
    showToast('Data berhasil dihapus.');
  } catch (error) {
    const message = error.message.includes('foreign key') || error.message.includes('violates')
      ? 'Data ini masih dipakai oleh entitas lain. Hapus relasi terkait terlebih dahulu.'
      : error.message || 'Data gagal dihapus.';
    showToast(message);
  }
}
async function saveFormData(payload) {
  if (payload.client_id_update) {
    await supabaseRequest('clients', `id=eq.${encodeURIComponent(payload.client_id_update)}`, { method: 'PATCH', body: { name: payload.name, company_name: payload.company_name || null, email: payload.email || null, phone: payload.phone || null, status: payload.status, bank_name: payload.bank_name || null, bank_account_name: payload.bank_account_name || null, bank_account_number: payload.bank_account_number || null } });
    return;
  }
  if (payload.security_deposit_id) {
    const deposit = useData().securityDeposits.find(item => item.id === payload.security_deposit_id);
    const deduction = Number(payload.damage_deduction);
    if (!deposit) throw new Error('Data jaminan tidak ditemukan.');
    if (!Number.isFinite(deduction) || deduction < 0 || deduction > Number(deposit.amount)) throw new Error('Potongan harus berada antara Rp 0 dan nominal jaminan.');
    const extra = Number(payload.damage_extra || 0);
    const calculated = payload.damage_items.reduce((sum, item) => sum + item.total, 0) + extra;
    const invalidItem = payload.damage_items.some(item => !Number.isFinite(item.quantity) || item.quantity <= 0 || (!DAMAGE_INVENTORY.find(inventoryItem => inventoryItem.id === item.id)?.fractional && !Number.isInteger(item.quantity)));
    if (!Number.isFinite(extra) || extra < 0 || !Number.isFinite(calculated) || invalidItem || Math.abs(calculated - deduction) > 0.01) throw new Error('Perhitungan potongan inventaris tidak valid. Periksa kembali jumlah barang.');
    if (deduction > 0 && !payload.damage_notes.trim() && !payload.damage_items.length && extra === 0) throw new Error('Pilih inventaris yang rusak atau isi catatan potongan.');
    const client = clientFor(useData().events.find(event => event.id === deposit.event_id));
    if (!client?.bank_account_number) throw new Error('Lengkapi nomor rekening bank klien sebelum memproses refund.');
    const damageNotes = [payload.damage_notes.trim(), extra > 0 ? `Potongan tambahan: ${money(extra)}` : ''].filter(Boolean).join(' · ');
    await supabaseRequest('security_deposits', `id=eq.${encodeURIComponent(deposit.id)}`, { method: 'PATCH', body: { damage_deduction: deduction, damage_items: payload.damage_items, damage_notes: damageNotes || null, status: 'Dikembalikan', refunded_at: new Date().toISOString().slice(0, 10) } });
    return;
  }
  if (payload.security_event_id) {
    const amount = Number(payload.security_amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Nominal jaminan harus lebih besar dari nol.');
    await supabaseRequest('security_deposits', '', { method: 'POST', body: { event_id: payload.security_event_id, amount, deposited_at: payload.deposited_at } });
    return;
  }
  if (payload.deposit_id) {
    const paidAt = new Date(`${payload.paid_date}T12:00:00`).toISOString();
    await supabaseRequest('deposits', `id=eq.${encodeURIComponent(payload.deposit_id)}`, { method: 'PATCH', body: { status: 'Dibayar', payment_method: payload.payment_method, paid_at: paidAt } });
    return;
  }
  if (payload.receivable_id) {
    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Nilai deposit harus lebih besar dari nol.');
    const [receivable] = await supabaseRequest('receivables', `id=eq.${encodeURIComponent(payload.receivable_id)}&select=id,total_amount`);
    if (!receivable) throw new Error('Invoice tidak ditemukan.');
    const deposits = await supabaseRequest('deposits', `receivable_id=eq.${encodeURIComponent(payload.receivable_id)}&select=amount&status=neq.Dibatalkan`);
    const scheduled = deposits.reduce((sum, deposit) => sum + Number(deposit.amount), 0);
    if (scheduled + amount > Number(receivable.total_amount)) throw new Error('Total termin melebihi nilai invoice.');
    await supabaseRequest('deposits', '', { method: 'POST', body: { receivable_id: payload.receivable_id, installment_type: payload.installment_type, label: payload.installment_type, amount, due_date: payload.due_date } });
    return;
  }
  if (payload.event_id && payload.total_amount) {
    const total = Number(payload.total_amount);
    const firstDeposit = Number(payload.first_deposit || 0);
    if (!Number.isFinite(total) || total <= 0) throw new Error('Nilai invoice harus lebih besar dari nol.');
    if (firstDeposit > total) throw new Error('Termin pertama tidak boleh melebihi nilai invoice.');
    if (firstDeposit > 0 && !payload.due_date) throw new Error('Tanggal jatuh tempo termin pertama wajib diisi.');
    if (payload.status === 'Draft' && firstDeposit > 0) throw new Error('Invoice draft belum dapat memiliki termin pembayaran.');
    const [receivable] = await supabaseRequest('receivables', '', { method: 'POST', body: { event_id: payload.event_id, invoice_number: payload.invoice_number, total_amount: total, issued_at: payload.issued_at, notes: payload.notes || null, status: payload.status || 'Belum dibayar' } });
    if (firstDeposit > 0) await supabaseRequest('deposits', '', { method: 'POST', body: { receivable_id: receivable.id, installment_type: 'DP', label: 'DP', amount: firstDeposit, due_date: payload.due_date } });
    return;
  }
  if (payload.client_id) {
    if (payload.end_date && payload.end_date < payload.event_date) throw new Error('Tanggal akhir tidak boleh sebelum tanggal mulai.');
    const durationDays = Number(payload.duration_days);
    if (![1, 2, 3].includes(durationDays)) throw new Error('Durasi acara harus 1, 2, atau 3 hari.');
    const selected = new Set(payload.selected_services || []);
    if (!selected.size) throw new Error('Pilih setidaknya satu layanan untuk event ini.');
    const services = SERVICE_OPTIONS.filter(([id]) => selected.has(id)).map(([id, name]) => {
      const amount = Number(payload[`price_${id}`]);
      if (!Number.isFinite(amount) || amount < 0) throw new Error(`Harga ${name} tidak valid.`);
      return { id, name, amount };
    });
    const zone = LOCATION_ZONES.find(([id]) => id === payload.location_zone);
    if (!zone) throw new Error('Zona wilayah tidak valid.');
    const locationSurcharge = zone[2];
    const total = services.reduce((sum, service) => sum + service.amount, 0) * durationDays + locationSurcharge;
    await supabaseRequest('events', '', { method: 'POST', body: { client_id: payload.client_id, name: payload.name, event_type: payload.event_type, event_date: payload.event_date, end_date: payload.end_date || null, duration_days: durationDays, venue: payload.venue || null, special_needs: payload.special_needs || [], services, location_zone: zone[0], location_surcharge: locationSurcharge, pic_name: payload.pic_name, budget: total, status: payload.status || 'Persiapan' } });
    return;
  }
  if (payload.name) {
    await supabaseRequest('clients', '', { method: 'POST', body: { name: payload.name, company_name: payload.company_name || null, email: payload.email || null, phone: payload.phone || null, status: payload.status || 'Aktif', bank_name: payload.bank_name || null, bank_account_name: payload.bank_account_name || null, bank_account_number: payload.bank_account_number || null } });
    return;
  }
  throw new Error('Jenis data tidak dikenali.');
}
async function loadData() {
  const today = new Date().toISOString().slice(0, 10);
  const reminderEnd = new Date();
  reminderEnd.setDate(reminderEnd.getDate() + 7);
  const reminderEndDate = reminderEnd.toISOString().slice(0, 10);
  await supabaseRequest('events', `status=in.(Persiapan,Berlangsung)&end_date=lt.${today}`, { method: 'PATCH', body: { status: 'Selesai' }, prefer: 'return=minimal' });
  await supabaseRequest('deposits', `status=in.(Terjadwal,Menunggu%20bayaran)&due_date=lt.${today}`, { method: 'PATCH', body: { status: 'Terlambat' }, prefer: 'return=minimal' });
  await supabaseRequest('deposits', `status=eq.Terjadwal&and=(due_date.gte.${today},due_date.lte.${reminderEndDate})`, { method: 'PATCH', body: { status: 'Menunggu bayaran' }, prefer: 'return=minimal' });
  const [clients, events, receivables, deposits, securityDeposits] = await Promise.all([
    supabaseRequest('clients', 'select=*&order=created_at.desc'),
    supabaseRequest('events', 'select=*&order=event_date.asc'),
    supabaseRequest('receivables', 'select=*&order=issued_at.desc'),
    supabaseRequest('deposits', 'select=*&order=due_date.asc'),
    supabaseRequest('security_deposits', 'select=*&order=created_at.desc')
  ]);
  return { clients, events, receivables, deposits, securityDeposits };
}
function showToast(message) { const toast = document.querySelector('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 3800); }
async function publishInvoice(id) {
  try {
    await supabaseRequest('receivables', `id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: { status: 'Belum dibayar' } });
    state.data = await loadData();
    render();
    showToast('Invoice berhasil diterbitkan.');
  } catch (error) { showToast(error.message || 'Invoice gagal diterbitkan.'); }
}
function renderConnectionError(message) {
  page.innerHTML = `<section class="connection-state"><span class="brand-mark" aria-hidden="true">✿</span><div class="eyebrow">KONEKSI SUPABASE</div><h1>Dashboard belum terhubung</h1><p>${escapeHtml(message)}</p><button class="button primary" data-action="retry-connection">Coba lagi</button></section>`;
}
async function connectDashboard() {
  if (!state.session) { showLogin(); return; }
  try {
    state.data = await loadData();
    setAuthenticatedView(true);
    render();
  } catch (error) {
    if (!state.session || error.status === 401 || error.status === 403) { showLogin('Sesi login tidak berlaku atau akun tidak memiliki akses. Silakan masuk kembali.'); return; }
    setAuthenticatedView(true);
    renderConnectionError(error instanceof TypeError ? 'Tidak dapat menghubungi Supabase. Periksa koneksi internet dan pengaturan project.' : error.message);
  }
}
async function submitLogin(event) {
  event.preventDefault();
  const form = event.target;
  const button = form.querySelector('button[type="submit"]');
  const error = document.querySelector('#auth-error');
  error.hidden = true;
  button.disabled = true;
  button.textContent = 'Memverifikasi...';
  try {
    const session = await authRequest('/token?grant_type=password', {
      email: new FormData(form).get('email').trim(),
      password: new FormData(form).get('password')
    });
    saveAuthSession(session);
    await connectDashboard();
  } catch (failure) {
    error.textContent = failure.message || 'Login gagal. Periksa email dan password.';
    error.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = 'Masuk ke workspace';
  }
}
function actionClick(action, id, table) {
  if (action === 'client') newClientForm();
  if (action === 'event') newEventForm();
  if (action === 'receivable') newReceivableForm();
  if (action === 'payment') newPaymentForm();
  if (action === 'deposit') newDepositForm();
  if (action === 'security-deposit') newSecurityDepositForm();
  if (action === 'process-refund') newRefundForm(id);
  if (action === 'edit-client') newClientForm(id);
  if (action === 'logout') signOut();
  if (action === 'retry-connection') connectDashboard();
  if (action === 'publish-invoice') publishInvoice(id);
  if (action === 'delete-row') deleteRecord(table, id);
  if (action === 'share-invoice') shareClientPdf(id, 'invoice');
  if (action === 'share-receipt') shareClientPdf(id, 'receipt');
  if (action === 'payment-receipt') showPaymentReceiptModal(id);
  if (action === 'download-payment-receipt') downloadPaymentReceipt(id);
  if (action === 'share-payment-receipt') sharePaymentReceipt(id);
  if (action === 'print-payment-receipt') printPaymentReceipt(id);
  if (action === 'close-modal') modalLayer.hidden = true;
  if (action === 'mark-paid') { const deposit = useData().deposits.find(item => item.id === id); if (deposit) { state.view = 'deposits'; newPaymentForm(); document.querySelector('#field-deposit_id').value = deposit.id; } }
}
document.addEventListener('click', event => {
  const viewButton = event.target.closest('[data-view]');
  const action = event.target.closest('[data-action]');
  if (viewButton) { setView(viewButton.dataset.view); return; }
  if (action) { actionClick(action.dataset.action, action.dataset.id, action.dataset.table); return; }
  if (event.target === modalLayer) modalLayer.hidden = true;
});
document.addEventListener('submit', event => { if (event.target.id === 'data-form') submitForm(event); if (event.target.id === 'login-form') submitLogin(event); });
document.querySelector('#mobile-menu').addEventListener('click', () => document.querySelector('#sidebar').classList.toggle('open'));
document.addEventListener('keydown', event => { if (event.key === 'Escape') modalLayer.hidden = true; });
(async function init() {
  document.querySelector('#today-label').textContent = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date());
  if (state.session) await connectDashboard();
  else showLogin();
})();
