// SDD urgency enum -> on-brand badge. Shared by the triage slip, the user
// dashboard timeline and admin tables so the meaning is identical everywhere.
const MAP = {
  emergency: {
    label: 'EMERGENCY',
    cls: 'bg-[#FDECEA] text-urgency-red border-[#F0B3AC]',
  },
  'semi-urgent': {
    label: 'WITHIN 24 HOURS',
    cls: 'bg-amber-wash text-urgency-amber border-amber-line',
  },
  routine: {
    label: 'ROUTINE',
    cls: 'bg-[#DDF0E6] text-urgency-green border-[#B9E2C9]',
  },
};

export default function UrgencyBadge({ level, className = '' }) {
  const m = MAP[level] || MAP.routine;
  return (
    <span
      className={`inline-block text-[10.5px] font-extrabold tracking-[1px] px-3 py-1.5 rounded-full border ${m.cls} ${className}`}
    >
      {m.label}
    </span>
  );
}

export function urgencyDot(level) {
  return level === 'emergency'
    ? 'bg-urgency-red'
    : level === 'semi-urgent'
      ? 'bg-urgency-amber'
      : 'bg-urgency-green';
}
