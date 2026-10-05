/**
 * Thin top strip — the medical-safety banner from the mockup.
 * Present on every page: emergencies must never wait for triage.
 */
export default function EmergencyStrip() {
  return (
    <div className="no-print bg-ink text-[#F3EFE6] text-[12.5px] px-7 py-[9px] flex justify-center items-center gap-2 text-center">
      <span>
        Medical emergency? Call{' '}
        <a href="tel:1122" className="mc-link font-extrabold text-sm text-[#FF6B5E] hover:underline">
          1122
        </a>{' '}
        <b className="text-white">now</b> — this tool gives guidance only, never a diagnosis.
      </span>
    </div>
  );
}
