import { useState } from 'react';

/** Show/hide password eye — inline SVG, no emoji. */
export function EyeToggle({ show, onToggle, label }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label || (show ? 'Hide password' : 'Show password')}
      className="mc-btn absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-ink p-1"
    >
      {show ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}

/**
 * Labelled form field with hint + per-field server error.
 */
export function Field({ label, error, hint, children, htmlFor }) {
  return (
    <div className="mb-5">
      <label htmlFor={htmlFor} className="block text-[13.5px] font-bold text-ink mb-2">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-[12px] text-faint mt-[6px]">{hint}</p>}
      {error && (
        <p className="text-urgency-red text-[12.5px] font-semibold mt-[6px]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputCls = (hasError) =>
  `w-full border-[1.5px] rounded-[10px] px-[15px] py-[12px] text-[14.5px] bg-[#FDFCF9] text-ink outline-none placeholder:text-faint/70 transition-colors duration-200 focus:border-ink ${
    hasError ? 'border-urgency-red' : 'border-[#D8CFB8]'
  }`;

/** Map [{field, message}] → { field: message } for easy lookup. */
export function errorsToMap(errors) {
  const map = {};
  if (Array.isArray(errors)) {
    for (const e of errors) {
      if (e?.field && !map[e.field]) map[e.field] = e.message;
    }
  }
  return map;
}

export function usePasswordToggle() {
  const [show, setShow] = useState(false);
  return [show, () => setShow((s) => !s)];
}
