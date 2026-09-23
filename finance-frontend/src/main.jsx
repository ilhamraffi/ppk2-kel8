import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const THEME_COOKIE = 'theme';

function getCookie(name) {
  const match = document.cookie.split('; ').find(row => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
}
function setCookie(name, value, days = 365) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${days * 86400}; Path=/; SameSite=Lax`;
}
function deleteCookie(name) { document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`; }

async function api(path, options = {}) {
  const headers = { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
  const response = await fetch(`${API_BASE_URL}${path}`, { credentials: 'include', ...options, headers });
  let data = null;
  const text = await response.text();
  if (text) { try { data = JSON.parse(text); } catch { data = { message: text }; } }
  if (!response.ok) {
    const error = new Error(data?.message || data?.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

const money = n => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n) || 0);
const dateLabel = value => value ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`)) : '-';

function useHashRoute() {
  const [route, setRoute] = useState(window.location.hash.replace('#', '') || 'dashboard');
  useEffect(() => { const onChange = () => setRoute(window.location.hash.replace('#', '') || 'dashboard'); window.addEventListener('hashchange', onChange); return () => window.removeEventListener('hashchange', onChange); }, []);
  return route;
}
function navigate(route) { window.location.hash = route; }

function App() {
  const route = useHashRoute();
  const [theme, setTheme] = useState(getCookie(THEME_COOKIE) || 'light');
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => { document.documentElement.dataset.theme = theme; setCookie(THEME_COOKIE, theme); }, [theme]);
  useEffect(() => {
    // The contract exposes no current-user endpoint, so session validity is checked by protected dashboard data.
    api('/api/dashboard').then(() => setUser({ authenticated: true })).catch(() => setUser(null)).finally(() => setCheckingSession(false));
  }, []);

  if (checkingSession) return <LoadingScreen />;
  if (!user || route === 'login' || route === 'register') {
    return route === 'register' ? <AuthPage mode="register" onAuthenticated={() => { setUser({ authenticated: true }); navigate('dashboard'); }} /> : <AuthPage mode="login" onAuthenticated={() => { setUser({ authenticated: true }); navigate('dashboard'); }} />;
  }
  return <Shell theme={theme} onTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} onLogout={async () => { try { await api('/api/auth/logout', { method: 'POST' }); } finally { setUser(null); navigate('login'); } }}><Page route={route} /></Shell>;
}

function LoadingScreen() { return <div className="center-screen"><div className="spinner"/><span>Checking session…</span></div>; }

function AuthPage({ mode, onAuthenticated }) {
  const isRegister = mode === 'register';
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const submit = async e => {
    e.preventDefault(); setError('');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('Please enter a valid email address.');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    if (isRegister && form.password !== form.confirmPassword) return setError('Passwords do not match.');
    setLoading(true);
    try {
      const payload = { email: form.email.trim(), password: form.password };
      await api(isRegister ? '/api/auth/register' : '/api/auth/login', { method: 'POST', body: JSON.stringify(payload) });
      if (isRegister) navigate('login'); else onAuthenticated();
    } catch (err) { setError(err.data?.errors ? Object.values(err.data.errors).flat().join(' ') : err.message); } finally { setLoading(false); }
  };
  return <main className="auth-layout"><section className="auth-brand"><div className="brand-mark">F</div><h1>FinTrack</h1><p>Simple, clear control over your personal finances.</p></section><section className="auth-card"><div className="eyebrow">WELCOME</div><h2>{isRegister ? 'Create your account' : 'Welcome back'}</h2><p className="muted">{isRegister ? 'Start tracking your money in one place.' : 'Sign in to continue to your dashboard.'}</p>{error && <div className="alert error">{error}</div>}<form onSubmit={submit} noValidate><Field label="Email"><input type="email" value={form.email} onChange={e => setForm({...form, email:e.target.value})} required autoComplete="email" /></Field><Field label="Password"><input type="password" value={form.password} onChange={e => setForm({...form, password:e.target.value})} required minLength="8" autoComplete={isRegister ? 'new-password' : 'current-password'} /></Field>{isRegister && <Field label="Confirm password"><input type="password" value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword:e.target.value})} required autoComplete="new-password" /></Field>}<button className="btn primary full" disabled={loading}>{loading ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}</button></form><p className="switch-auth">{isRegister ? 'Already have an account?' : 'New to FinTrack?'} <button className="link-button" onClick={() => navigate(isRegister ? 'login' : 'register')}>{isRegister ? 'Sign in' : 'Create account'}</button></p></section></main>;
}
function Field({label, children}) { return <label className="field"><span>{label}</span>{children}</label>; }

function Shell({ children, theme, onTheme, onLogout }) { const route = useHashRoute(); return <div className="app-shell"><aside className="sidebar"><div className="brand"><div className="brand-mark small">F</div><span>FinTrack</span></div><nav><NavItem href="dashboard" active={route === 'dashboard'} icon="▦">Dashboard</NavItem><NavItem href="transactions" active={route === 'transactions'} icon="↔">Transactions</NavItem></nav><div className="sidebar-bottom"><button className="nav-item" onClick={onTheme}><span className="nav-icon">{theme === 'dark' ? '☀' : '☾'}</span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</button><button className="nav-item" onClick={onLogout}><span className="nav-icon">↪</span>Logout</button></div></aside><main className="main-content">{children}</main></div> }
function NavItem({href, active, icon, children}) { return <button className={`nav-item ${active ? 'active' : ''}`} onClick={() => navigate(href)}><span className="nav-icon">{icon}</span>{children}</button> }

function Page({route}) { if (route === 'transactions') return <TransactionsPage />; return <DashboardPage />; }

function DashboardPage() {
  const [dashboard, setDashboard] = useState(null); const [transactions, setTransactions] = useState([]); const [error, setError] = useState('');
  const load = async () => { try { setError(''); const [d, t] = await Promise.all([api('/api/dashboard'), api('/api/transactions')]); setDashboard(d); setTransactions(normalizeTransactions(t).slice(0, 5)); } catch (e) { setError(e.message); } };
  useEffect(() => { load(); }, []);
  if (error) return <ErrorState message={error} onRetry={load}/>;
  return <><Header title="Dashboard" subtitle="Your financial overview"/><section className="content"><div className="cards"><StatCard label="Current balance" value={money(dashboard?.balance)} accent="balance"/><StatCard label="Total income" value={money(dashboard?.total_income)} accent="income"/><StatCard label="Total expenses" value={money(dashboard?.total_expense)} accent="expense"/></div><div className="section-heading"><div><h3>Recent transactions</h3><p className="muted">Your latest activity</p></div><button className="btn secondary" onClick={() => navigate('transactions')}>View all</button></div><TransactionTable transactions={transactions} compact emptyText="No transactions yet."/></section></>;
}
function StatCard({label,value,accent}) { return <article className={`stat-card ${accent}`}><div className="stat-icon">{accent === 'balance' ? '◈' : accent === 'income' ? '↑' : '↓'}</div><div><span>{label}</span><strong>{value || '—'}</strong></div></article> }
function Header({title,subtitle}) { return <header className="page-header"><div><div className="eyebrow">OVERVIEW</div><h1>{title}</h1><p className="muted">{subtitle}</p></div><div className="avatar">U</div></header> }

function TransactionsPage() {
  const [transactions, setTransactions] = useState([]); const [filter, setFilter] = useState('all'); const [modal, setModal] = useState(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  const load = async selected => { setLoading(true); try { setError(''); const q = selected === 'all' ? '' : `?type=${selected}`; setTransactions(normalizeTransactions(await api(`/api/transactions${q}`))); } catch (e) { setError(e.message); } finally { setLoading(false); } };
  useEffect(() => { load(filter); }, [filter]);
  const remove = async id => { if (!window.confirm('Delete this transaction?')) return; try { await api(`/api/transactions/${id}`, {method:'DELETE'}); await load(filter); } catch(e) { setError(e.message); } };
  return <><Header title="Transactions" subtitle="Manage your income and expenses"/><section className="content"><div className="toolbar"><div className="filter-group">{['all','income','expense'].map(x => <button key={x} className={`filter-btn ${filter===x?'selected':''}`} onClick={() => setFilter(x)}>{x[0].toUpperCase()+x.slice(1)}</button>)}</div><button className="btn primary" onClick={() => setModal({type:'create'})}>+ Add transaction</button></div>{error && <div className="alert error">{error}</div>}{loading ? <LoadingPanel/> : <TransactionTable transactions={transactions} onEdit={t => setModal({type:'edit', transaction:t})} onDelete={remove} emptyText={`No ${filter === 'all' ? '' : filter + ' '}transactions found.`}/>}</section>{modal && <TransactionModal mode={modal.type} transaction={modal.transaction} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(filter); }}/>}</>;
}
function normalizeTransactions(data) { const rows = Array.isArray(data) ? data : data?.transactions || data?.data || []; return rows.map(t => ({...t, id:t.id ?? t.transaction_id})); }
function TransactionTable({transactions, onEdit, onDelete, compact=false, emptyText}) { if (!transactions.length) return <div className="empty"><div className="empty-icon">◎</div><strong>{emptyText}</strong><span className="muted">Add a transaction to start building your history.</span></div>; return <div className="table-wrap"><table><thead><tr><th>Type</th><th>Description</th><th>Date</th><th className="amount-col">Amount</th>{!compact && <th></th>}</tr></thead><tbody>{transactions.map(t => <tr key={t.id}><td><span className={`badge ${t.type}`}>{t.type}</span></td><td>{t.description || '—'}</td><td>{dateLabel(t.date)}</td><td className={`amount ${t.type}`}>{t.type === 'income' ? '+' : '-'}{money(t.amount)}</td>{!compact && <td className="actions"><button onClick={() => onEdit(t)} aria-label="Edit">Edit</button><button className="danger-text" onClick={() => onDelete(t.id)} aria-label="Delete">Delete</button></td>}</tr>)}</tbody></table></div> }
function TransactionModal({mode, transaction, onClose, onSaved}) { const [form, setForm] = useState({type:transaction?.type || 'expense', amount:transaction?.amount ?? '', description:transaction?.description || '', date:transaction?.date || new Date().toISOString().slice(0,10)}); const [error,setError]=useState(''); const [loading,setLoading]=useState(false);
  const submit=async e=>{e.preventDefault();setError('');const amount=Number(form.amount);if(!Number.isFinite(amount)||amount<=0)return setError('Amount must be greater than 0.');if(!form.description.trim())return setError('Description is required.');if(!form.date)return setError('Date is required.');setLoading(true);try{const payload={type:form.type,amount,description:form.description.trim(),date:form.date};await api(mode==='edit'?`/api/transactions/${transaction.id}`:'/api/transactions',{method:mode==='edit'?'PUT':'POST',body:JSON.stringify(payload)});onSaved();}catch(e){setError(e.data?.errors?Object.values(e.data.errors).flat().join(' '):e.message)}finally{setLoading(false)}};
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className="modal"><div className="modal-head"><div><div className="eyebrow">TRANSACTION</div><h2>{mode==='edit'?'Edit transaction':'Add transaction'}</h2></div><button className="icon-btn" onClick={onClose}>×</button></div>{error&&<div className="alert error">{error}</div>}<form onSubmit={submit}><Field label="Type"><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="expense">Expense</option><option value="income">Income</option></select></Field><Field label="Amount"><input type="number" min="1" step="1" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="50000" /></Field><Field label="Description"><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Lunch" /></Field><Field label="Date"><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></Field><div className="modal-actions"><button type="button" className="btn secondary" onClick={onClose}>Cancel</button><button className="btn primary" disabled={loading}>{loading?'Saving…':mode==='edit'?'Save changes':'Add transaction'}</button></div></form></div></div>
}
function LoadingPanel(){return <div className="loading-panel"><div className="spinner"/>Loading transactions…</div>}
function ErrorState({message,onRetry}){return <section className="content"><div className="empty"><strong>Something went wrong</strong><span className="muted">{message}</span><button className="btn primary" onClick={onRetry}>Retry</button></div></section>}

createRoot(document.getElementById('root')).render(<App />);
