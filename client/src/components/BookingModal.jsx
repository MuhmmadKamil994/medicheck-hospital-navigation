import { useMemo, useState } from 'react';
import api, { parseApiError } from '../api/client.js';
import { toISODate } from '../utils/format.js';

// Booking modal: pick a future date + time slot, confirm, and show a
// token-style confirmation built from the `appointment` object — the SMS
// result (sent/demo) never gates the confirmation (SDD 4.3: SMS is best-effort).
const SLOT_START = 9; // 09:00
const SLOT_END = 17; // 17:00

function buildSlots() {
  const slots = [];
  for (let h = SLOT_START; h <= SLOT_END; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    if (h < SLOT_END) slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
}

export default function BookingModal({ hospital, onClose, onBooked }) {
  const today = useMemo(() => toISODate(new Date()), []);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('10:00');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(null);
  const slots = useMemo(buildSlots, []);

  async function confirm() {
    setSaving(true);
    setErrors({});
    try {
      const { data } = await api.post('/api/appointments/book', {
        hospitalId: hospital._id,
        appointmentDate: date,
        appointmentTime: time,
      });
      setDone(data);
      if (onBooked) onBooked(data.appointment);
    } catch (err) {
      const { message, errors: fieldErrors } = parseApiError(err, 'Booking failed. Please try again.');
      const mapped = {};
      (fieldErrors || []).forEach((e) => {
        if (e.field) mapped[e.field] = e.message;
      });
      if (!Object.keys(mapped).length) mapped._form = message;
      setErrors(mapped);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-ink/60"
      role="dialog"
      aria-modal="true"
      aria-label={`Book appointment at ${hospital.name}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-paper rounded-2xl border border-line shadow-page max-h-[90vh] overflow-y-auto">
        {!done ? (
          <div className="p-6 md:p-7">
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-serif text-2xl font-bold">Book appointment</h3>
              <button type="button" onClick={onClose} className="mc-link text-sm" aria-label="Close">
                ✕
              </button>
            </div>
            <p className="text-sm text-muted mb-6">
              {hospital.name} · {hospital.address}
            </p>

            <label className="block text-sm font-bold mb-2" htmlFor="bk-date">
              Choose a date
            </label>
            <input
              id="bk-date"
              type="date"
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border-[1.5px] border-line rounded-[10px] px-4 py-3 text-[15px] bg-white outline-none focus:border-ink transition-colors duration-200 mb-1"
            />
            {errors.appointmentDate && <p className="text-[13px] text-urgency-red mb-3">{errors.appointmentDate}</p>}

            <p className="text-sm font-bold mt-5 mb-2">Choose a time slot</p>
            <div className="flex flex-wrap gap-2 mb-1 max-h-40 overflow-y-auto pr-1">
              {slots.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTime(s)}
                  className={`text-[13px] font-semibold px-3.5 py-2 rounded-lg border-[1.5px] transition-all duration-200 ${
                    time === s
                      ? 'bg-ink text-paper border-ink'
                      : 'bg-white text-ink-slate border-line hover:border-ink'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {errors.appointmentTime && <p className="text-[13px] text-urgency-red mb-3">{errors.appointmentTime}</p>}
            {errors._form && (
              <p className="text-[13px] text-urgency-red bg-[#FDECEA] border border-[#F0B3AC] rounded-lg px-4 py-3 mt-4">
                {errors._form}
              </p>
            )}

            <button
              type="button"
              onClick={confirm}
              disabled={saving}
              className="mc-btn w-full mt-6 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving && <span className="mc-spinner !w-4 !h-4 !border-paper/30 !border-t-paper" />}
              {saving ? 'Booking…' : 'Confirm booking'}
            </button>
            <p className="text-[12px] text-faint text-center mt-3">
              Free to book · cancel anytime from your dashboard
            </p>
          </div>
        ) : (
          <div className="p-6 md:p-7">
            <div className="bg-ink text-paper rounded-2xl p-6 relative overflow-hidden">
              <div className="text-[10.5px] font-extrabold tracking-[2.2px] text-amber-bright mb-4">
                BOOKING CONFIRMED
              </div>
              <div className="font-serif text-2xl font-bold leading-tight">
                {new Date(done.appointment.appointmentDate).toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </div>
              <div className="text-[15px] text-[#B9C2D4] font-semibold mt-1 mb-4">
                {done.appointment.appointmentTime} · {done.appointment.hospital?.name}
              </div>
              <div className="border-t-2 border-dashed border-white/25 my-4 -mx-6 relative">
                <span className="absolute -left-3 -top-[11px] w-5 h-5 rounded-full bg-paper" />
                <span className="absolute -right-3 -top-[11px] w-5 h-5 rounded-full bg-paper" />
              </div>
              <p className="text-[12.5px] text-[#B9C2D4] leading-relaxed">
                {done.sms && done.sms.mode === 'demo'
                  ? 'SMS confirmation logged in demo mode — no real SMS was sent.'
                  : done.sms && done.sms.sent
                    ? 'A confirmation SMS is on its way to your phone.'
                    : 'Show this screen at the hospital reception.'}
              </p>
              <p className="text-[12.5px] text-[#8E9BB8] mt-2">
                Status: <span className="font-bold text-paper">{done.appointment.status}</span> ·
                Token <span className="font-bold text-paper">#{String(done.appointment.appointmentId).slice(-6).toUpperCase()}</span>
              </p>
            </div>
            <button type="button" onClick={onClose} className="mc-btn w-full mt-5">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
