import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { parseApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import TriageSlip from '../components/TriageSlip.jsx';
import UrgencyBadge, { urgencyDot } from '../components/UrgencyBadge.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { formatDate, friendlyDay, firstName } from '../utils/format.js';

function StatCard({ icon, big, label }) {
  return (
    <div className="bg-white border border-line rounded-[14px] p-5 flex items-center gap-4">
      <div className="w-[46px] h-[46px] min-w-[46px] rounded-xl bg-sand flex items-center justify-center">{icon}</div>
      <div>
        <div className="font-serif text-[30px] font-bold leading-none">{big}</div>
        <div className="text-[11px] font-bold tracking-[1px] text-faint mt-1.5">{label}</div>
      </div>
    </div>
  );
}

function AppointmentToken({ appt, onCancel, cancelling }) {
  const h = appt.hospital || {};
  return (
    <div className="bg-ink text-paper rounded-2xl p-6 relative overflow-hidden mb-4">
      <div className="text-[10.5px] font-extrabold tracking-[2.2px] text-amber-bright mb-3.5">
        APPOINTMENT TOKEN · #{String(appt.appointmentId).slice(-6).toUpperCase()}
      </div>
      <div className="font-serif text-[28px] font-bold leading-tight">{friendlyDay(appt.appointmentDate)}</div>
      <div className="text-[14px] text-[#B9C2D4] font-semibold mt-1 mb-3">{appt.appointmentTime}</div>
      <div className="text-[14px] font-bold">{h.name}</div>
      <div className="text-[12.5px] text-[#8E9BB8] mt-1 mb-4">{h.address}</div>
      <div className="border-t-2 border-dashed border-white/25 -mx-6 mb-4 relative">
        <span className="absolute -left-[11px] -top-[11px] w-5 h-5 rounded-full bg-paper" />
        <span className="absolute -right-[11px] -top-[11px] w-5 h-5 rounded-full bg-paper" />
      </div>
      <div className="flex gap-2.5">
        <Link to="/hospitals" className="flex-1 text-center bg-amber-bright text-ink text-[13px] font-bold rounded-[9px] py-3 hover:bg-amber transition-colors duration-200">
          Get directions
        </Link>
        <button
          type="button"
          onClick={() => onCancel(appt)}
          disabled={cancelling}
          className="flex-1 text-[13px] font-bold text-[#B9C2D4] border-[1.5px] border-ink-slate rounded-[9px] py-3 hover:border-[#B9C2D4] transition-colors duration-200 disabled:opacity-50"
        >
          {cancelling ? 'Cancelling…' : 'Cancel'}
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, isAuthenticated, initialising } = useAuth();
  const [records, setRecords] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelError, setCancelError] = useState('');
  const [reportRecord, setReportRecord] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const [hRes, aRes] = await Promise.all([
        api.get('/api/symptoms/history'),
        api.get('/api/appointments'),
      ]);
      setRecords(hRes.data.records || []);
      setAppointments(aRes.data.appointments || []);
    } catch (err) {
      const { message, status } = parseApiError(err, 'Could not load your dashboard.');
      setApiError({ message, status });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchAll();
  }, [isAuthenticated, fetchAll]);

  const upcoming = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return appointments
      .filter((a) => a.status !== 'cancelled' && new Date(a.appointmentDate) >= startOfToday)
      .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate));
  }, [appointments]);

  const emergencyFlags = useMemo(
    () => records.filter((r) => r.urgencyLevel === 'emergency').length,
    [records]
  );
  const nextAppt = upcoming[0] || null;
  const lastRecord = records[0] || null;

  const cancelAppointment = useCallback(async (appt) => {
    if (!window.confirm(`Cancel your appointment at ${appt.hospital?.name || 'this hospital'}?`)) return;
    setCancellingId(appt.appointmentId);
    setCancelError('');
    try {
      await api.delete(`/api/appointments/${appt.appointmentId}`);
      setAppointments((prev) =>
        prev.map((a) => (a.appointmentId === appt.appointmentId ? { ...a, status: 'cancelled' } : a))
      );
    } catch (err) {
      const { message } = parseApiError(err, 'Could not cancel the appointment.');
      setCancelError(message);
    } finally {
      setCancellingId(null);
    }
  }, []);

  if (initialising || (isAuthenticated && loading)) {
    return (
      <div className="px-7 py-10">
        <div className="mc-shimmer h-8 w-56 mb-6" />
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="mc-shimmer h-24 rounded-[14px]" />
          <div className="mc-shimmer h-24 rounded-[14px]" />
          <div className="mc-shimmer h-24 rounded-[14px]" />
        </div>
        <div className="grid md:grid-cols-[1.55fr_1fr] gap-4">
          <div className="mc-shimmer h-80 rounded-[14px]" />
          <div className="mc-shimmer h-80 rounded-[14px]" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="px-7 py-16 text-center">
        <div className="kicker" style={{ justifyContent: 'center' }}>
          MY DASHBOARD
        </div>
        <h1 className="font-serif text-3xl font-semibold mb-3">Your health hub awaits</h1>
        <p className="text-muted text-[15px] max-w-md mx-auto mb-7 leading-relaxed">
          Log in to see your symptom timeline, appointment tokens and history.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/login" className="mc-btn">
            Log in
          </Link>
          <Link to="/register" className="mc-btn-ghost">
            Create account
          </Link>
        </div>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="px-7 py-10">
        <div className="bg-white border border-line rounded-[14px]">
          <ErrorState status={apiError.status} message={apiError.message} onRetry={fetchAll} />
        </div>
      </div>
    );
  }

  const nudge = lastRecord
    ? lastRecord.urgencyLevel === 'emergency'
      ? {
          title: 'Please act on your last check',
          body: 'Your most recent triage was flagged EMERGENCY. If you have not seen a doctor yet, find the nearest emergency department now.',
          link: '/hospitals',
          linkText: 'Find emergency care →',
        }
      : lastRecord.urgencyLevel === 'semi-urgent'
        ? {
            title: 'Suggested next step',
            body: 'Your last check advised a doctor visit within 24 hours. Book a slot before the day ends.',
            link: '/hospitals',
            linkText: 'Find hospitals →',
          }
        : {
            title: 'All clear for now',
            body: 'Your last check was routine. Keep an eye on symptoms — a new check takes under a minute.',
            link: '/',
            linkText: 'New symptom check →',
          }
    : null;

  return (
    <div className="px-7 py-10">
      <div className="kicker">MY DASHBOARD</div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-[32px] font-semibold mb-1.5">Welcome back, {firstName(user?.fullName)}</h1>
          <p className="text-muted text-[14px]">
            {formatDate(new Date())}
            {lastRecord ? ` · Last check ${formatDate(lastRecord.createdAt)}` : ' · No checks yet'}
          </p>
        </div>
        <Link to="/" className="mc-btn">
          + New symptom check
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <StatCard
          big={records.length}
          label="SYMPTOM CHECKS"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B07818" strokeWidth="2.2" strokeLinecap="round">
              <path d="M9 3h6v4l4 11a2.4 2.4 0 0 1-2.2 3H7.2A2.4 2.4 0 0 1 5 18L9 7V3z" />
              <path d="M7.5 14h9" />
            </svg>
          }
        />
        <StatCard
          big={upcoming.length}
          label="UPCOMING VISITS"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2E7D62" strokeWidth="2.2" strokeLinecap="round">
              <rect x="3" y="5" width="18" height="16" rx="2.5" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
          }
        />
        <StatCard
          big={emergencyFlags}
          label="EMERGENCY FLAGS"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B91C1C" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            </svg>
          }
        />
      </div>

      {cancelError && (
        <div className="text-[13px] text-urgency-red bg-[#FDECEA] border border-[#F0B3AC] rounded-xl px-4 py-3 mb-5">
          {cancelError}
        </div>
      )}

      <div className="grid md:grid-cols-[1.55fr_1fr] gap-5 items-start">
        {/* Health timeline */}
        <div className="bg-white border border-line rounded-[14px] p-6">
          <h3 className="font-serif text-[19px] font-bold mb-5">Your health timeline</h3>
          {records.length === 0 ? (
            <div className="text-center py-10">
              <p className="font-serif text-lg font-bold mb-2">No checks yet</p>
              <p className="text-[13.5px] text-muted mb-5 max-w-xs mx-auto leading-relaxed">
                Run your first triage — it takes under a minute and your history starts building here.
              </p>
              <Link to="/" className="mc-btn">
                Check my symptoms
              </Link>
            </div>
          ) : (
            <div className="relative pl-8">
              <span className="absolute left-[8px] top-2.5 bottom-2.5 w-[2px] bg-[#E8E0CC] rounded" aria-hidden="true" />
              {records.map((r) => (
                <div key={r.recordId} className="relative pb-6 last:pb-1">
                  <span
                    className={`absolute -left-8 top-[3px] w-[18px] h-[18px] rounded-full border-[3.5px] border-white shadow-[0_0_0_2px_#E8E0CC] ${urgencyDot(r.urgencyLevel)}`}
                    aria-hidden="true"
                  />
                  <div className="text-[11.5px] text-faint font-bold tracking-[0.6px] mb-1.5">
                    {formatDate(r.createdAt).toUpperCase()}
                  </div>
                  <div className="text-[14.5px] font-bold mb-1.5">{(r.symptomsEntered || []).join(', ')}</div>
                  <p className="text-[12.5px] text-muted leading-relaxed mb-2.5 line-clamp-2">
                    {r.conditionDescription}
                  </p>
                  <UrgencyBadge level={r.urgencyLevel} />
                  <span className="mx-2 text-line">|</span>
                  <button
                    type="button"
                    onClick={() => setReportRecord(r)}
                    className="mc-link text-[12.5px]"
                  >
                    View report →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right rail: token + nudge */}
        <div>
          {nextAppt ? (
            <AppointmentToken
              appt={nextAppt}
              onCancel={cancelAppointment}
              cancelling={cancellingId === nextAppt.appointmentId}
            />
          ) : (
            <div className="bg-white border border-line rounded-2xl p-6 mb-4 text-center">
              <p className="font-serif text-lg font-bold mb-2">No upcoming visits</p>
              <p className="text-[13px] text-muted mb-4 leading-relaxed">
                When you book an appointment, your token will appear here.
              </p>
              <Link to="/hospitals" className="mc-btn w-full block text-center">
                Find hospitals
              </Link>
            </div>
          )}
          {nudge && (
            <div className="bg-amber-wash border-[1.5px] border-amber-line rounded-[14px] p-5">
              <h4 className="font-serif text-[16px] font-bold mb-2">{nudge.title}</h4>
              <p className="text-[13px] text-[#6B5A2E] leading-relaxed mb-3">{nudge.body}</p>
              <Link to={nudge.link} className="text-[13px] font-bold text-amber hover:text-[#9A6514] transition-colors">
                {nudge.linkText}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Report modal — reuses the exact triage slip chrome */}
      {reportRecord && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-ink/60"
          role="dialog"
          aria-modal="true"
          aria-label="Symptom report"
          onClick={(e) => {
            if (e.target === e.currentTarget) setReportRecord(null);
          }}
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
            <button
              type="button"
              onClick={() => setReportRecord(null)}
              aria-label="Close report"
              className="no-print absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-ink text-paper text-[15px] hover:bg-ink-slate transition-colors"
            >
              ✕
            </button>
            <TriageSlip
              state="result"
              result={{
                urgencyLevel: reportRecord.urgencyLevel,
                recordId: reportRecord.recordId,
                createdAt: reportRecord.createdAt,
                symptoms: reportRecord.symptomsEntered || [],
                severity: 'Not recorded',
                duration: 'Not recorded',
                conditionDescription: reportRecord.conditionDescription,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
