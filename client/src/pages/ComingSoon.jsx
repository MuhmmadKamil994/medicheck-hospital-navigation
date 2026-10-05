import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';

/**
 * Honest placeholder for Phase 4b routes (/hospitals, /dashboard).
 * Keeps every nav link alive — no dead buttons anywhere.
 */
export default function ComingSoon({ title, blurb }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-7 py-16 text-center">
      <div className="max-w-[460px]">
        <div className="inline-flex mb-6 opacity-90"><Logo size={52} /></div>
        <div className="text-[11px] font-extrabold tracking-[2.6px] text-amber mb-3">PHASE 4B — UNDER CONSTRUCTION</div>
        <h1 className="font-serif text-[34px] font-semibold mb-4">{title}</h1>
        <p className="text-muted text-[14.5px] leading-relaxed mb-8">{blurb}</p>
        <Link
          to="/"
          className="mc-btn inline-block bg-ink text-paper font-bold text-sm px-10 py-[14px] rounded-[10px] hover:bg-ink-deep"
        >
          Back to symptom checker
        </Link>
      </div>
    </div>
  );
}
