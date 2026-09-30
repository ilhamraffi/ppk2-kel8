# PROGRAMMER_3.md — Frontend Developer (Budget UI/UX & Integration)

**Programmer:** Programmer 3  
**Modul:** Antarmuka Pengguna & Integrasi AJAX Budget Bulanan  
**Branch Resmi:** `feat/p3-budget-ui`  
**Ketergantungan:** Independent (Gunakan contract JSON di `docs/MODEL_GUIDE.md`, tidak perlu menunggu P1/P2 selesai backend)  

---

## 1. Wilayah File yang Boleh Disentuh
- `finance-frontend/src/main.jsx`
- `finance-frontend/src/styles.css`
- `finance-frontend/index.html`

> ⚠️ **DILARANG** menyentuh backend di folder `src/`!

---

## 2. Fitur Frontend yang Wajib Dibuat

1. **Monthly Budget Selector:**
   - Input/Dropdown pemilih bulan (`<input type="month">`), default bernilai bulan ini (misal: `'2026-10'`).
   - Saat bulan diubah, otomatis lakukan request AJAX (`fetch`) ke `/api/budgets?month=${selectedMonth}` tanpa reload halaman.

2. **Budget Summary Cards:**
   - **Kartu 1 (Anggaran):** Menampilkan nominal anggaran yang diset (format Rupiah `Rp ...`).
   - **Kartu 2 (Total Pengeluaran):** Menampilkan total pengeluaran transaksi bulan tersebut.
   - **Kartu 3 (Sisa Anggaran):** Menampilkan sisa anggaran (`budget - expense`). Beri warna merah jika bernilai minus.

3. **Budget Indicator (Visual Progress Bar):**
   - Menampilkan bar persentase penggunaan budget.
   - **Indikator Warna Status:**
     - `< 80%` ➔ Bar Hijau (Status: *Aman / Normal*)
     - `80% - 100%` ➔ Bar Kuning (Status: *Peringatan: Mendekati Limit*)
     - `> 100%` ➔ Bar Merah + Badge Alert (Status: *Anggaran Terlampaui / Overbudget*)

4. **Set Budget Modal (Form Atur Anggaran):**
   - Tombol "Atur Anggaran" / "Ubah Anggaran".
   - Modal input nominal anggaran (`amount`) untuk bulan yang sedang dipilih.
   - Saat submit, kirim request `POST /api/budgets` via AJAX dengan body `{ month, amount }`.
   - Setelah sukses, tutup modal dan otomatis refresh data summary.

---

## 3. Contoh Cuplikan Kode Komponen React (`BudgetPage`)

```jsx
function BudgetPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadBudget = async (targetMonth) => {
    setLoading(true);
    try {
      setError('');
      const res = await api(`/api/budgets?month=${targetMonth}`);
      setSummary(res.data);
      if (res.data?.budget_amount) setAmountInput(res.data.budget_amount);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBudget(month);
  }, [month]);

  const handleSaveBudget = async (e) => {
    e.preventDefault();
    try {
      await api('/api/budgets', {
        method: 'POST',
        body: JSON.stringify({ month, amount: parseFloat(amountInput) })
      });
      setModalOpen(false);
      loadBudget(month);
    } catch (err) {
      alert(err.message);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'exceeded') return 'var(--danger, #ef4444)';
    if (status === 'warning') return 'var(--warning, #f59e0b)';
    return 'var(--success, #10b981)';
  };

  return (
    <>
      <Header title="Monthly Budget" subtitle="Monitor and control your monthly spending" />
      <section className="content">
        <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <label style={{ marginRight: '8px', fontWeight: 'bold' }}>Pilih Bulan:</label>
            <input 
              type="month" 
              value={month} 
              onChange={(e) => setMonth(e.target.value)} 
              className="month-picker"
            />
          </div>
          <button className="btn primary" onClick={() => setModalOpen(true)}>
            {summary?.budget_amount > 0 ? '✎ Ubah Anggaran' : '+ Atur Anggaran'}
          </button>
        </div>

        {error && <div className="alert error">{error}</div>}

        {/* 1. Summary Cards */}
        <div className="cards" style={{ marginTop: '16px' }}>
          <StatCard label="Target Anggaran" value={money(summary?.budget_amount)} accent="balance" />
          <StatCard label="Pengeluaran Bulan Ini" value={money(summary?.total_expense)} accent="expense" />
          <StatCard 
            label="Sisa Anggaran" 
            value={money(summary?.remaining_budget)} 
            accent={summary?.remaining_budget < 0 ? 'expense' : 'income'} 
          />
        </div>

        {/* 2. Budget Indicator Bar */}
        <div className="budget-indicator-card" style={{ marginTop: '24px', padding: '20px', background: 'var(--card-bg, #fff)', borderRadius: '8px', border: '1px solid var(--border, #e5e7eb)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span><strong>Penggunaan Anggaran:</strong> {summary?.percentage_used || 0}%</span>
            <span style={{ color: getStatusColor(summary?.status), fontWeight: 'bold' }}>
              {summary?.status === 'exceeded' ? '⚠️ Melebihi Anggaran' : summary?.status === 'warning' ? '⚡ Mendekati Batas' : '✔ Normal / Aman'}
            </span>
          </div>
          <div style={{ width: '100%', height: '14px', background: '#e5e7eb', borderRadius: '7px', overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(summary?.percentage_used || 0, 100)}%`,
              height: '100%',
              backgroundColor: getStatusColor(summary?.status),
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>
      </section>

      {/* 3. Modal Set Budget */}
      {modalOpen && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <div className="modal-head">
              <h2>Atur Anggaran ({month})</h2>
              <button className="icon-btn" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSaveBudget}>
              <Field label="Nominal Anggaran (Rp)">
                <input 
                  type="number" 
                  min="1" 
                  step="1" 
                  value={amountInput} 
                  onChange={(e) => setAmountInput(e.target.value)} 
                  required 
                  placeholder="Contoh: 2000000"
                />
              </Field>
              <div className="modal-actions" style={{ marginTop: '16px' }}>
                <button type="button" className="btn secondary" onClick={() => setModalOpen(false)}>Batal</button>
                <button type="submit" className="btn primary">Simpan Anggaran</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
```

---

## 4. Alur Push & Merge
```bash
git checkout -b feat/p3-budget-ui
# Kerjakan komponen React & Styling
git add finance-frontend/
git commit -m "[P3] Implement Monthly Budget UI, indicator bar, and summary modal"
git push origin feat/p3-budget-ui

# LANGSUNG MERGE KE MAIN
git checkout main
git merge feat/p3-budget-ui
git push origin main
```
