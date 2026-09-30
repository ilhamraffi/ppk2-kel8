# PROMPT_GUIDE.md — Panduan Prompt Eksekusi AI Agent & Developer

**Proyek:** SakuGue (ppk2-kel8 — Expense Tracker & Monthly Budget)  
**Format Pemanggilan Standar:**
> *"Baca semua isi md di folder docs, baca semua aturannya, kerjakan bagian [A/B/C]"*

Dokumen ini memuat format prompt tunggal yang dapat langsung disalin ke chat AI Coding Assistant (Cursor, Claude, Copilot, ChatGPT) agar AI bekerja secara disiplin, tidak keluar dari batasan file, dan tidak memicu konflik.

---

## 1. Format Prompt Eksekusi Cepat (Direct Execution Prompts)

### A. Prompt untuk Programmer 1 (Database Core & Skema)
```text
Baca semua isi md di folder docs, baca semua aturannya, kerjakan bagian Programmer 1.
- Batasan: Hanya sentuh src/db/initDb.js dan pastikan skema tabel `budgets` terpasang dengan UNIQUE(user_id, month) dan index.
- Dilarang membuat file migrasi baru atau database baru.
- Jalankan npm test untuk memastikan 21 test lama tetap lulus.
- Setelah selesai, siapkan branch feat/p1-budget-db untuk langsung dimerge ke main.
```

---

### B. Prompt untuk Programmer 2 (Backend Budget API & Aggregation)
```text
Baca semua isi md di folder docs, baca semua aturannya, kerjakan bagian Programmer 2.
- Batasan: Buat src/controllers/budgetController.js, src/routes/budgetRoutes.js, dan daftarkan di src/app.js.
- Implementasikan Set/Update Budget (POST /api/budgets), Monthly Summary & Indicator (GET /api/budgets?month=YYYY-MM), dan History (GET /api/budgets/history).
- Pastikan query memfilter WHERE user_id = req.session.userId (Anti-IDOR).
- Tulis test suite di tests/budget.test.js dan pastikan seluruh test lulus (npm test).
- Setelah selesai, siapkan branch feat/p2-budget-api untuk langsung dimerge ke main.
```

---

### C. Prompt untuk Programmer 3 (Frontend React UI & Indicator)
```text
Baca semua isi md di folder docs, baca semua aturannya, kerjakan bagian Programmer 3.
- Batasan: Hanya bekerja di folder finance-frontend/ (main.jsx & styles.css).
- Buat halaman/view Monthly Budget:
  1. Monthly Budget Picker (input type="month" untuk memilih bulan).
  2. Budget Summary (kartu Target Anggaran, Pengeluaran Bulan Ini, Sisa Anggaran).
  3. Budget Indicator (Progress bar visual: hijau <80%, kuning 80-100%, merah >100% overbudget).
  4. Set Budget Modal (form pop-up untuk simpan/ubah anggaran bulanan).
- Gunakan AJAX fetch dengan credentials: 'include' ke endpoint /api/budgets.
- Setelah selesai, siapkan branch feat/p3-budget-ui untuk langsung dimerge ke main.
```

---

## 2. Aturan Emas Respons AI Agent

Saat AI Assistant menerima prompt di atas, AI wajib:
1. Membaca `docs/DB_CONTRACT.md`, `docs/AGENT_RULES.md`, dan `docs/MODEL_GUIDE.md` terlebih dahulu.
2. Tidak membuat file di luar matriks file yang diizinkan untuk rolenya.
3. Tidak mengubah konfigurasi database port atau koneksi PostgreSQL.
4. Menjalankan verifikasi lokal (`npm test` untuk backend, build check untuk frontend) sebelum mengembalikan jawaban.
