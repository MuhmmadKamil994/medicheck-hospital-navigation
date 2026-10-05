import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext.jsx';
import { parseApiError } from '../../api/adminClient.js';
import Logo from '../../components/Logo.jsx';

// Separate admin sign-in (SDD 1.5: no self-registration — accounts are
// created manually). The admin token is stored apart from the user token.
export default function AdminLogin() {
  const { isAdminAuthenticated, login } = useAdmin();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAdminAuthenticated) return <Navigate to="/admin" replace />;

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate('/admin', { replace: true });
    } catch (err) {
      const { message, status } = parseApiError(err, 'Login failed. Please try again.');
      // Never reveal which field was wrong (same discipline as user login).
      setError(status === 401 ? 'Invalid email or password.' : message);
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    'w-full bg-white/10 border-[1.5px] border-white/15 rounded-[10px] px-4 py-3 text-[15px] text-paper placeholder-[#8E9BB8] outline-none focus:border-amber-bright transition-colors duration-200';

  return (
    <div className="min-h-screen bg-ink-deep flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <Logo light />
          <span className="font-serif text-2xl font-bold text-paper">MediCheck</span>
          <span className="text-[10.5px] font-extrabold tracking-[2px] text-ink-deep bg-amber-bright rounded-full px-2.5 py-1">
            ADMIN
          </span>
        </div>
        <div className="bg-ink border border-ink-slate rounded-2xl p-7">
          <h1 className="font-serif text-2xl font-bold text-paper mb-1.5">Console sign-in</h1>
          <p className="text-[13px] text-[#8E9BB8] mb-6">Restricted to authorised administrators.</p>
          <form onSubmit={submit}>
            <label className="block text-[12px] font-bold tracking-[1px] text-[#8E9BB8] mb-2" htmlFor="ad-email">
              EMAIL
            </label>
            <input
              id="ad-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              placeholder="admin@medicheck.pk"
              className={`${inputCls} mb-4`}
            />
            <label className="block text-[12px] font-bold tracking-[1px] text-[#8E9BB8] mb-2" htmlFor="ad-pass">
              PASSWORD
            </label>
            <div className="relative mb-5">
              <input
                id="ad-pass"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className={`${inputCls} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#8E9BB8] hover:text-paper transition-colors"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
            {error && (
              <p className="text-[13px] text-[#FF9D94] bg-[#B91C1C]/20 border border-[#B91C1C]/50 rounded-lg px-4 py-3 mb-4">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-amber-bright text-ink-deep font-bold text-[15px] rounded-[10px] py-3.5 hover:bg-amber transition-colors duration-200 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {busy && <span className="mc-spinner !w-4 !h-4 !border-ink-deep/30 !border-t-ink-deep" />}
              {busy ? 'Signing in…' : 'Sign in to console'}
            </button>
          </form>
        </div>
        <p className="text-center text-[12px] text-[#5C6B84] mt-6">
          Patient account?{' '}
          <a href="/login" className="text-amber-bright font-semibold hover:underline">
            Go to user login →
          </a>
        </p>
      </div>
    </div>
  );
}
