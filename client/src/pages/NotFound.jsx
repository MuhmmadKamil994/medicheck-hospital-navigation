import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';

/** On-brand 404 — no dead ends, always a way home. */
export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-7 py-16 text-center">
      <div className="max-w-[460px]">
        <div className="inline-flex mb-6 opacity-90"><Logo size={52} /></div>
        <div className="text-[11px] font-extrabold tracking-[2.6px] text-amber mb-3">404 — LOST SLIP</div>
        <h1 className="font-serif text-[38px] font-semibold mb-4">
          This page took a wrong turn at the hospital.
        </h1>
        <p className="text-muted text-[14.5px] leading-relaxed mb-8">
          The page you&apos;re looking for doesn&apos;t exist or was moved.
          Let&apos;s get you back to care.
        </p>
        <Link
          to="/"
          className="mc-btn inline-block bg-ink text-paper font-bold text-sm px-10 py-[14px] rounded-[10px] hover:bg-ink-deep"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
