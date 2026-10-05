import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Field, EyeToggle, inputCls, errorsToMap, usePasswordToggle } from '../components/AuthForm.jsx';
import Logo from '../components/Logo.jsx';

/**
 * Login — centered card per SDD §7.2.
 * Server's generic 401 message ("Invalid email or password") is preserved
 * on purpose: it never reveals which field was wrong (SDD TC-03).
 */
export default function Login() {
  const { isAuthenticated, initialising, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, togglePw] = usePasswordToggle();
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!initialising && isAuthenticated) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setFormError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      const map = errorsToMap(err.errors);
      if (Object.keys(map).length > 0) setFieldErrors(map);
      else setFormError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-7 py-14">
      <div className="w-full max-w-[440px]">
        <div className="text-center mb-8">
          <div className="inline-flex mb-4"><Logo size={44} /></div>
          <h1 className="font-serif text-[32px] font-semibold">Welcome back</h1>
          <p className="text-muted text-[14.5px] mt-2">Log in to continue your care journey.</p>
        </div>

        <form
          onSubmit={submit}
          noValidate
          className="bg-white border border-line rounded-[14px] p-[30px] shadow-card"
        >
          {formError && (
            <div
              role="alert"
              className="bg-[#FDECEA] border border-[#F0B3AC] text-[#7A2E26] text-[13.5px] font-semibold rounded-[10px] px-4 py-3 mb-6"
            >
              {formError}
            </div>
          )}

          <Field label="Email address" htmlFor="login-email" error={fieldErrors.email}>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputCls(fieldErrors.email)}
            />
          </Field>

          <Field label="Password" htmlFor="login-password" error={fieldErrors.password}>
            <div className="relative">
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className={`${inputCls(fieldErrors.password)} pr-11`}
              />
              <EyeToggle show={showPw} onToggle={togglePw} />
            </div>
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="mc-btn w-full bg-ink text-paper rounded-[10px] py-[14px] text-[15px] font-bold hover:bg-ink-deep disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <span><span className="mc-spinner" aria-hidden="true" /> Logging in…</span>
            ) : (
              'Login'
            )}
          </button>

          <p className="text-center text-[13.5px] text-muted mt-6">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="mc-link font-bold text-amber hover:underline">
              Register here
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
