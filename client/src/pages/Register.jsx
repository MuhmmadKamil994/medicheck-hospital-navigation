import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Field, EyeToggle, inputCls, errorsToMap, usePasswordToggle } from '../components/AuthForm.jsx';
import Logo from '../components/Logo.jsx';

/**
 * Register — centered card per SDD §7.2 + test case TC-02.
 * Fields: full name, email, password (min 8, show/hide), confirm password
 * (client-side match check), phone (Pakistani 03XX format), date of birth,
 * insurance provider (optional). Success → auto-login → /dashboard.
 */
export default function Register() {
  const { isAuthenticated, initialising, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    dateOfBirth: '',
    insuranceProvider: '',
  });
  const [showPw, togglePw] = usePasswordToggle();
  const [showPw2, togglePw2] = usePasswordToggle();
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!initialising && isAuthenticated) return <Navigate to="/dashboard" replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setFormError('');

    // Client-side checks before hitting the server (server re-validates too).
    const local = {};
    if (form.password && form.password.length < 8)
      local.password = 'Password must be at least 8 characters.';
    if (form.confirmPassword !== form.password)
      local.confirmPassword = 'Passwords do not match.';
    if (Object.keys(local).length > 0) {
      setFieldErrors(local);
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword: _drop, ...payload } = form;
      const clean = {
        fullName: payload.fullName.trim(),
        email: payload.email.trim(),
        password: payload.password,
        phoneNumber: payload.phoneNumber.trim(),
      };
      if (payload.dateOfBirth) clean.dateOfBirth = payload.dateOfBirth;
      if (payload.insuranceProvider.trim()) clean.insuranceProvider = payload.insuranceProvider.trim();
      await register(clean);
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
      <div className="w-full max-w-[520px]">
        <div className="text-center mb-8">
          <div className="inline-flex mb-4"><Logo size={44} /></div>
          <h1 className="font-serif text-[32px] font-semibold">Create your account</h1>
          <p className="text-muted text-[14.5px] mt-2">
            Free forever. Your symptom history stays private to you.
          </p>
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

          <Field label="Full name" htmlFor="reg-name" error={fieldErrors.fullName}>
            <input
              id="reg-name"
              type="text"
              autoComplete="name"
              value={form.fullName}
              onChange={set('fullName')}
              placeholder="e.g. Muhammad Kamil"
              className={inputCls(fieldErrors.fullName)}
            />
          </Field>

          <Field label="Email address" htmlFor="reg-email" error={fieldErrors.email}>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={set('email')}
              placeholder="you@example.com"
              className={inputCls(fieldErrors.email)}
            />
          </Field>

          <div className="grid grid-cols-1 min-[520px]:grid-cols-2 gap-x-4">
            <Field label="Password" htmlFor="reg-password" error={fieldErrors.password} hint="Minimum 8 characters.">
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={set('password')}
                  placeholder="Choose a password"
                  className={`${inputCls(fieldErrors.password)} pr-11`}
                />
                <EyeToggle show={showPw} onToggle={togglePw} />
              </div>
            </Field>

            <Field label="Confirm password" htmlFor="reg-confirm" error={fieldErrors.confirmPassword}>
              <div className="relative">
                <input
                  id="reg-confirm"
                  type={showPw2 ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={set('confirmPassword')}
                  placeholder="Repeat it"
                  className={`${inputCls(fieldErrors.confirmPassword)} pr-11`}
                />
                <EyeToggle show={showPw2} onToggle={togglePw2} />
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-1 min-[520px]:grid-cols-2 gap-x-4">
            <Field
              label="Mobile number"
              htmlFor="reg-phone"
              error={fieldErrors.phoneNumber}
              hint="Pakistani format: 03XX-XXXXXXX"
            >
              <input
                id="reg-phone"
                type="tel"
                autoComplete="tel"
                value={form.phoneNumber}
                onChange={set('phoneNumber')}
                placeholder="03001234567"
                className={inputCls(fieldErrors.phoneNumber)}
              />
            </Field>

            <Field label="Date of birth" htmlFor="reg-dob" error={fieldErrors.dateOfBirth} hint="Optional, but helps us serve you better.">
              <input
                id="reg-dob"
                type="date"
                value={form.dateOfBirth}
                onChange={set('dateOfBirth')}
                className={inputCls(fieldErrors.dateOfBirth)}
              />
            </Field>
          </div>

          <Field
            label="Insurance provider"
            htmlFor="reg-insurance"
            error={fieldErrors.insuranceProvider}
            hint="Optional — e.g. Sehat Sahulat, Jubilee, EFU. Used to match hospitals."
          >
            <input
              id="reg-insurance"
              type="text"
              value={form.insuranceProvider}
              onChange={set('insuranceProvider')}
              placeholder="e.g. Sehat Sahulat"
              className={inputCls(fieldErrors.insuranceProvider)}
            />
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="mc-btn w-full bg-ink text-paper rounded-[10px] py-[14px] text-[15px] font-bold hover:bg-ink-deep disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <span><span className="mc-spinner" aria-hidden="true" /> Creating your account…</span>
            ) : (
              'Create account'
            )}
          </button>

          <p className="text-center text-[13.5px] text-muted mt-6">
            Already have an account?{' '}
            <Link to="/login" className="mc-link font-bold text-amber hover:underline">
              Login here
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
