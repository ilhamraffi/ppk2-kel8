# MODEL_GUIDE.md — Panduan Model, Response Format Standard & Protokol Otorisasi

**Proyek:** SakuGue (ppk2-kel8 — Expense Tracker & Monthly Budget)  
**Status:** Mandatory Contract  

Dokumen ini menjadi acuan seragam mengenai penamaan model/entitas, struktur JSON payload response API, serta protokol pemeriksaan otorisasi (*authorization check*) untuk mencegah akses lintas pengguna (*data leakage / IDOR*).

---

## 1. Definisi & Penamaan Model (Entity & DTO)

Semua nama properti, variabel objek, dan key JSON harus konsisten menggunakan penamaan berikut:

### A. Model `User`
- **Database Table:** `users`
- **Properties:**
  - `id`: `number` (integer)
  - `name`: `string`
  - `email`: `string`
  - `password`: `string` (hanya ada di internal server, **DILARANG** dikembalikan di API)
  - `created_at`: `string` (ISO Timestamp)

### B. Model `Transaction`
- **Database Table:** `transactions`
- **Properties:**
  - `id`: `number` (integer)
  - `user_id`: `number` (integer)
  - `type`: `'income' | 'expense'` (string lowercase)
  - `amount`: `number` (numeric / float)
  - `category`: `string | null`
  - `description`: `string | null`
  - `date`: `string` (Format: `'YYYY-MM-DD'`)
  - `created_at`: `string` (ISO Timestamp)
  - `updated_at`: `string` (ISO Timestamp)

### C. Model `Budget`
- **Database Table:** `budgets`
- **Properties:**
  - `id`: `number` (integer)
  - `user_id`: `number` (integer)
  - `month`: `string` (Format: `'YYYY-MM'`, contoh: `'2026-10'`)
  - `amount`: `number` (numeric / float)
  - `created_at`: `string` (ISO Timestamp)
  - `updated_at`: `string` (ISO Timestamp)

### D. Model Kalkulasi `BudgetSummary` (Response DTO)
Objek ini dikembalikan saat client memanggil endpoint `GET /api/budgets?month=YYYY-MM`:
- `id`: `number | null` (ID budget jika sudah diset, null jika belum)
- `month`: `string` (Format `'YYYY-MM'`)
- `budget_amount`: `number` (Nilai anggaran yang diset, 0 jika belum diset)
- `total_expense`: `number` (Total pengeluaran riil bulan tersebut dari transaksi `type = 'expense'`)
- `remaining_budget`: `number` (`budget_amount - total_expense`)
- `percentage_used`: `number` (Persentase penggunaan, misal: `65.5` untuk 65.5%)
- `status`: `'normal' | 'warning' | 'exceeded'`
  - `'normal'`: Pengeluaran `< 80%` dari budget (Indikator Hijau)
  - `'warning'`: Pengeluaran `>= 80%` dan `<= 100%` dari budget (Indikator Kuning)
  - `'exceeded'`: Pengeluaran `> 100%` dari budget (Indikator Merah)

---

## 2. Standar Response Format API

Semua endpoint backend Express harus mengembalikan format payload JSON berikut:

### A. Format Response Sukses (200 OK, 201 Created)

#### 1. Set / Update Budget (`POST /api/budgets`) ➔ `200 OK` atau `201 Created`
```json
{
  "success": true,
  "message": "Budget set successfully",
  "budget": {
    "id": 1,
    "user_id": 4,
    "month": "2026-10",
    "amount": "2000000.00",
    "created_at": "2026-09-30T12:00:00.000Z",
    "updated_at": "2026-09-30T12:00:00.000Z"
  }
}
```

#### 2. Get Budget Summary & Indicator (`GET /api/budgets?month=2026-10`) ➔ `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "month": "2026-10",
    "budget_amount": 2000000,
    "total_expense": 1450000,
    "remaining_budget": 550000,
    "percentage_used": 72.5,
    "status": "normal"
  }
}
```

#### 3. Get All Monthly Budgets History (`GET /api/budgets/history`) ➔ `200 OK`
```json
{
  "success": true,
  "budgets": [
    {
      "id": 1,
      "month": "2026-10",
      "budget_amount": 2000000,
      "total_expense": 1450000,
      "remaining_budget": 550000,
      "percentage_used": 72.5,
      "status": "normal"
    },
    {
      "id": 2,
      "month": "2026-09",
      "budget_amount": 1800000,
      "total_expense": 1950000,
      "remaining_budget": -150000,
      "percentage_used": 108.33,
      "status": "exceeded"
    }
  ]
}
```

### B. Format Response Error (400, 401, 404, 500)
```json
{
  "success": false,
  "error": "Pesan deskripsi kesalahan yang mudah dipahami",
  "code": "ERROR_CODE_UPPERCASE"
}
```
**Daftar Error Code Standar:**
- `401 Unauthorized` ➔ Code: `UNAUTHORIZED` (Belum login / sesi tidak valid)
- `400 Bad Request` ➔ Code: `INVALID_INPUT` (Format bulan bukan YYYY-MM atau nominal <= 0)
- `404 Not Found` ➔ Code: `BUDGET_NOT_FOUND`
- `500 Internal Error` ➔ Code: `INTERNAL_SERVER_ERROR`

---

## 3. Protokol Otorisasi & Pencegahan IDOR

Untuk memastikan kepatuhan pada aturan **"Pengguna hanya dapat mengakses dan mengelola anggarannya sendiri"**:

1. **Wajib Memasang Middleware `requireAuth`:**
   ```javascript
   // src/routes/budgetRoutes.js
   const express = require('express');
   const router = express.Router();
   const budgetController = require('../controllers/budgetController');
   const { requireAuth } = require('../middleware/auth');

   // Seluruh endpoint budget WAJIB dilindungi
   router.use(requireAuth);

   router.get('/', budgetController.getMonthlyBudget);
   router.post('/', budgetController.setBudget);
   router.get('/history', budgetController.getBudgetHistory);

   module.exports = router;
   ```

2. **Dilarang Menerima `user_id` dari Request Client:**
   ```javascript
   // BENAR (Aman):
   const userId = req.session.userId;

   // SALAH BESAR (Rentan IDOR):
   const userId = req.body.user_id; // DILARANG!
   ```

3. **Query Database Wajib Memfilter `WHERE user_id = $1`:**
   Setiap operasi query `SELECT`, `INSERT ... ON CONFLICT`, `UPDATE`, atau `DELETE` pada tabel `budgets` **WAJIB** menyertakan parameter `user_id = $1` yang berasal dari sesi pengguna.
