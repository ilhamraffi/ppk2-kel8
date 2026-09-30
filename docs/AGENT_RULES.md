# AGENT_RULES.md — Aturan & Batasan Kerja AI Agent & Developer

**Proyek:** SakuGue (ppk2-kel8 — Expense Tracker & Monthly Budget)  
**Role:** AI Coding Assistant & Developer Rules  
**Status:** Mandatory & Strictly Enforced  

---

## 1. Batasan Keras AI Agent (Strict Agent Guardrails)

Seluruh AI Agent (Cursor, Claude, Copilot, ChatGPT, Antigravity) yang bekerja pada repositori ini **WAJIB** mematuhi batasan mutlak berikut:

1. **DILARANG MEMBUAT DATABASE BARU / CLUSTER BARU ❌**
   - Database PostgreSQL lokal sudah aktif di port `5432` dengan database `sakugue`.
   - Dilarang membuat konfigurasi database SQLite, MySQL, atau mengganti `pg_data` baru.
   - Perubahan skema **hanya boleh** ditambahkan di `src/db/initDb.js` melalui tabel `budgets`.

2. **DILARANG MEMBUAT BRANCH ACAK YANG TIDAK PERLU ❌**
   - Gunakan branch spesifik yang sudah ditentukan:
     - `feat/p1-budget-db` (Programmer 1)
     - `feat/p2-budget-api` (Programmer 2)
     - `feat/p3-budget-ui` (Programmer 3)
   - Jangan membuat nama branch sembarangan yang membingungkan tim.

3. **PRINSIP MERGE CEPAT (ABIS PUSH LANGSUNG MERGE) ⚡**
   - Setelah pekerjaan per bagian selesai diuji dan dipush ke branch fitur, segera lakukan merge ke `main` agar tidak terjadi divergence cabang.
   - Urutan merge yang direkomendasikan: **P1 (DB) ➔ P2 (API) ➔ P3 (UI)**. Karena wilayah file terpisah 100%, proses merge dapat dilakukan secara instan tanpa merge conflict!

4. **DILARANG MENYENTUH FILE DI LUAR WILAYAH TUGAS ❌**
   - P1 dilarang menyentuh `transactionController.js` atau folder `finance-frontend/`.
   - P2 dilarang menyentuh `finance-frontend/` atau mengubah konfigurasi core auth.
   - P3 fokus 100% di folder `finance-frontend/`.

5. **MEMPERTAHANKAN GREEN TESTS (`npm test`) 🟢**
   - Backend sudah memiliki 21 automated tests yang 100% lulus.
   - Setiap penambahan fitur budget wajib menambahkan test baru tanpa merusak 21 test sebelumnya.

---

## 2. Standar Arsitektur & Format Kode

- **Runtime:** Node.js CommonJS (`require` / `module.exports`) untuk backend, ES Module (`import` / `export`) untuk React frontend.
- **SQL Execution:** Gunakan fungsi `query(text, params)` dari `src/config/db.js` dengan parameterized values (`$1, $2`).
- **Penanganan Tanggal & Bulan:**
  - Format bulan standar adalah `'YYYY-MM'` (string 7 karakter, contoh: `'2026-10'`).
  - Validasi regex bulan: `/^\d{4}-(0[1-9]|1[0-2])$/`.
- **Standar Format Response:**
  - Sukses: Selalu sertakan `{ success: true, ... }` dengan status HTTP yang tepat (`200` atau `201`).
  - Gagal: Selalu sertakan `{ success: false, error: '...', code: '...' }` dengan status HTTP `400/401/404/500`.

---

## 3. Matriks Kepemilikan File (File Boundaries)

```
ppk2-kel8/
├── src/
│   ├── config/db.js                       [LOCKED - PM Only]
│   ├── db/initDb.js                       [PROGRAMMER 1]
│   ├── middleware/auth.js                 [PROGRAMMER 1]
│   ├── controllers/
│   │   ├── authController.js              [PROGRAMMER 1]
│   │   ├── transactionController.js       [PROGRAMMER 2]
│   │   ├── dashboardController.js         [PROGRAMMER 2]
│   │   └── budgetController.js            [PROGRAMMER 2 - NEW]
│   ├── routes/
│   │   ├── authRoutes.js                  [PROGRAMMER 1]
│   │   ├── transactionRoutes.js           [PROGRAMMER 2]
│   │   ├── dashboardRoutes.js             [PROGRAMMER 2]
│   │   └── budgetRoutes.js                [PROGRAMMER 2 - NEW]
│   ├── app.js                             [PROGRAMMER 2 - Mendaftarkan budgetRoutes]
│   └── server.js                          [LOCKED]
├── finance-frontend/                      [PROGRAMMER 3 - 100% Bebas]
│   ├── src/
│   │   ├── main.jsx                       [PROGRAMMER 3]
│   │   └── styles.css                     [PROGRAMMER 3]
│   └── package.json                       [PROGRAMMER 3]
└── tests/
    ├── auth.test.js                       [PROGRAMMER 1]
    ├── transaction.test.js                [PROGRAMMER 2]
    └── budget.test.js                     [PROGRAMMER 2 - NEW]
```

---

## 4. Checklist Kualitas Sebelum Merge

- [ ] Kode bebas dari `console.log` debug yang berlebihan.
- [ ] Query database menggunakan parameterized query `$1, $2` (No SQL injection).
- [ ] Otorisasi dipastikan aman (`WHERE user_id = req.session.userId`).
- [ ] Test suite lulus (`npm test`).
- [ ] Tidak ada konflik git saat merge ke `main`.
