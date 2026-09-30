# PROGRAMMER_1.md — Database Core & Schema Integrity

**Programmer:** Programmer 1  
**Modul:** Database Schema & Migration Core  
**Branch Resmi:** `feat/p1-budget-db`  
**Ketergantungan:** Independent (Bisa langsung dikerjakan sekarang tanpa nunggu P2/P3)  

---

## 1. Wilayah File yang Boleh Disentuh
- `src/db/initDb.js`
- `tests/auth.test.js`

> ⚠️ **DILARANG** menyentuh controller transaksi/budget atau file frontend!

---

## 2. Tugas Utama Minggu Ini (Fitur Budget Database)

1. **Tambahkan DDL Tabel `budgets` di `src/db/initDb.js`:**
   Pastikan tabel `budgets` dibuat dengan constraint berikut:
   - Primary Key: `id SERIAL`
   - Foreign Key: `user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE`
   - `month VARCHAR(7) NOT NULL` (Menyimpan format `YYYY-MM`)
   - `amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0)`
   - `created_at` dan `updated_at` bertipe `TIMESTAMP WITH TIME ZONE`
   - **Constraint Unik:** `CONSTRAINT unique_user_monthly_budget UNIQUE (user_id, month)` agar seorang pengguna tidak memiliki 2 budget di bulan yang sama.
   - **Index:** `CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month);`

2. **Implementasi Idempotent di `src/db/initDb.js`:**
   ```javascript
   // src/db/initDb.js
   const { query } = require('../config/db');

   const initDb = async () => {
     // users table
     await query(`
       CREATE TABLE IF NOT EXISTS users (
         id SERIAL PRIMARY KEY,
         name VARCHAR(255) NOT NULL,
         email VARCHAR(255) UNIQUE NOT NULL,
         password VARCHAR(255) NOT NULL,
         created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
       );
     `);

     // transactions table
     await query(`
       CREATE TABLE IF NOT EXISTS transactions (
         id SERIAL PRIMARY KEY,
         user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
         type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
         amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
         category VARCHAR(100),
         description TEXT,
         date DATE NOT NULL,
         created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
         updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
       );
       CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
       CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date);
     `);

     // budgets table (NEW)
     await query(`
       CREATE TABLE IF NOT EXISTS budgets (
         id SERIAL PRIMARY KEY,
         user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
         month VARCHAR(7) NOT NULL,
         amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
         created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
         updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
         CONSTRAINT unique_user_monthly_budget UNIQUE (user_id, month)
       );
       CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month);
     `);
   };

   module.exports = { initDb };
   ```

3. **Verifikasi:**
   Jalankan:
   ```bash
   npm test
   ```
   Pastikan seluruh test tetap 100% lulus.

---

## 3. Alur Push & Merge
```bash
git checkout -b feat/p1-budget-db
git add src/db/initDb.js
git commit -m "[P1] Add budgets table schema and index"
git push origin feat/p1-budget-db

# LANGSUNG MERGE KE MAIN
git checkout main
git merge feat/p1-budget-db
git push origin main
```
