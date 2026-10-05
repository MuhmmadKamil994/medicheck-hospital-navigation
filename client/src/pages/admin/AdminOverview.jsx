import { useCallback, useEffect, useMemo, useState } from 'react';
import adminApi, { parseApiError } from '../../api/adminClient.js';
import ErrorState from '../../components/ErrorState.jsx';
import UrgencyBadge from '../../components/UrgencyBadge.jsx';
import HospitalModal from './HospitalModal.jsx';
import { formatDate } from '../../utils/format.js';

const BAHAWALPUR = { lat: 29.3956, lng: 71.6722 };

function Kpi({ label, value, sub, warn }) {
  return (
    <div className="bg-white border border-line rounded-xl p-[18px]">
      <div className="text-[10.5px] font-extrabold tracking-[1.4px] text-faint mb-2">{label}</div>
      <div className={`font-serif text-[30px] font-bold ${warn ? 'text-urgency-amber' : ''}`}>{value}</div>
      {sub && <div className={`text-[11.5px] font-bold mt-1 ${warn ? 'text-urgency-amber' : 'text-urgency-green'}`}>{sub}</div>}
    </div>
  );
}

function StatusPill({ status }) {
  const cls =
    status === 'confirmed' || status === true
      ? 'bg-[#DDF0E6] text-urgency-green'
      : status === 'pending'
        ? 'bg-amber-wash text-urgency-amber'
        : status === 'cancelled' || status === false
          ? 'bg-sand text-faint'
          : 'bg-[#DDF0E6] text-urgency-green';
  const label =
    status === true ? 'ACTIVE' : status === false ? 'INACTIVE' : String(status).toUpperCase();
  return (
    <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full tracking-[0.5px] whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

const rowBtn =
  'text-[12px] font-bold rounded-[7px] px-3 py-[7px] mr-1.5 border border-line bg-white text-ink hover:border-ink transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
const rowBtnDanger =
  'text-[12px] font-bold rounded-[7px] px-3 py-[7px] mr-1.5 border border-[#F0B3AC] bg-white text-urgency-red hover:bg-[#FDECEA] transition-colors duration-200 disabled:opacity-50';

export default function AdminOverview({ tab, setTab, search, setSearch }) {
  const [hospitals, setHospitals] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [users, setUsers] = useState([]);
  const [usersPage, setUsersPage] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [apptStatusFilter, setApptStatusFilter] = useState('');
  const [banner, setBanner] = useState({ type: '', text: '' });
  const [modal, setModal] = useState(null); // null | {mode:'add'} | {mode:'edit', hospital}
  const [busyId, setBusyId] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const [hRes, aRes, uRes] = await Promise.all([
        adminApi.get('/api/hospitals/nearby', {
          params: { lat: BAHAWALPUR.lat, lng: BAHAWALPUR.lng, radiusKm: 50 },
        }),
        adminApi.get('/api/admin/appointments'),
        adminApi.get('/api/admin/users', { params: { page: 1, limit: 20 } }),
      ]);
      setHospitals(hRes.data.hospitals || []);
      setAppointments(aRes.data.appointments || []);
      setUsers(uRes.data.users || []);
      setUsersPage({ page: uRes.data.page || 1, totalPages: uRes.data.totalPages || 1, total: uRes.data.total || 0 });
    } catch (err) {
      const { message, status } = parseApiError(err, 'Could not load admin data.');
      setApiError({ message, status });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const refreshAppointments = useCallback(async () => {
    try {
      const { data } = await adminApi.get('/api/admin/appointments', {
        params: apptStatusFilter ? { status: apptStatusFilter } : {},
      });
      setAppointments(data.appointments || []);
    } catch (err) {
      const { message } = parseApiError(err);
      setBanner({ type: 'error', text: message });
    }
  }, [apptStatusFilter]);

  useEffect(() => {
    if (!loading) refreshAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apptStatusFilter]);

  const loadUsersPage = useCallback(async (page) => {
    try {
      const { data } = await adminApi.get('/api/admin/users', { params: { page, limit: 20 } });
      setUsers(data.users || []);
      setUsersPage({ page: data.page, totalPages: data.totalPages, total: data.total });
    } catch (err) {
      const { message } = parseApiError(err);
      setBanner({ type: 'error', text: message });
    }
  }, []);

  // ---- actions -----------------------------------------------------------
  async function patchAppointment(id, status) {
    setBusyId(id);
    setBanner({ type: '', text: '' });
    try {
      await adminApi.patch(`/api/admin/appointments/${id}`, { status });
      setAppointments((prev) => prev.map((a) => (a.appointmentId === id ? { ...a, status } : a)));
      setBanner({ type: 'ok', text: `Appointment ${status}.` });
    } catch (err) {
      // Surface the backend's 400 transition message verbatim, e.g.
      // "Cannot change status from 'cancelled' to 'confirmed'".
      const { message } = parseApiError(err, 'Could not update the appointment.');
      setBanner({ type: 'error', text: message });
    } finally {
      setBusyId(null);
    }
  }

  async function toggleUser(u) {
    setBusyId(u._id);
    setBanner({ type: '', text: '' });
    try {
      await adminApi.patch(`/api/admin/users/${u._id}`, { isActive: !u.isActive });
      setUsers((prev) => prev.map((x) => (x._id === u._id ? { ...x, isActive: !x.isActive } : x)));
      setBanner({ type: 'ok', text: `${u.fullName} ${u.isActive ? 'deactivated' : 'reactivated'}.` });
    } catch (err) {
      const { message } = parseApiError(err, 'Could not update the user.');
      setBanner({ type: 'error', text: message });
    } finally {
      setBusyId(null);
    }
  }

  async function deleteHospital(h) {
    if (!window.confirm(`Delete "${h.name}"? This cannot be undone.`)) return;
    setBusyId(h._id);
    setBanner({ type: '', text: '' });
    try {
      await adminApi.delete(`/api/admin/hospitals/${h._id}`);
      setHospitals((prev) => prev.filter((x) => x._id !== h._id));
      setBanner({ type: 'ok', text: `"${h.name}" deleted.` });
    } catch (err) {
      const { message } = parseApiError(err, 'Could not delete the hospital.');
      setBanner({ type: 'error', text: message });
    } finally {
      setBusyId(null);
    }
  }

  // ---- derived -----------------------------------------------------------
  const pendingAppts = useMemo(() => appointments.filter((a) => a.status === 'pending'), [appointments]);
  const inactiveHospitals = useMemo(() => hospitals.filter((h) => !h.availabilityStatus), [hospitals]);
  const todayCount = useMemo(() => {
    const t = formatDate(new Date());
    return appointments.filter((a) => formatDate(a.appointmentDate) === t).length;
  }, [appointments]);

  const q = search.trim().toLowerCase();
  const filteredHospitals = hospitals.filter(
    (h) => !q || h.name.toLowerCase().includes(q) || (h.address || '').toLowerCase().includes(q)
  );
  const filteredAppointments = appointments.filter(
    (a) =>
      !q ||
      (a.user?.fullName || '').toLowerCase().includes(q) ||
      (a.hospital?.name || '').toLowerCase().includes(q)
  );
  const filteredUsers = users.filter(
    (u) => !q || (u.fullName || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
  );

  if (loading) {
    return (
      <main className="p-[30px]">
        <div className="mc-shimmer h-10 w-72 mb-6" />
        <div className="grid md:grid-cols-4 gap-3.5 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="mc-shimmer h-24 rounded-xl" />
          ))}
        </div>
        <div className="mc-shimmer h-80 rounded-[14px]" />
      </main>
    );
  }

  if (apiError) {
    return (
      <main className="p-[30px]">
        <div className="bg-white border border-line rounded-[14px]">
          <ErrorState status={apiError.status} message={apiError.message} onRetry={loadAll} />
        </div>
      </main>
    );
  }

  const tabs = [
    { id: 'hospitals', label: 'Hospitals' },
    { id: 'appointments', label: 'Appointments', count: pendingAppts.length },
    { id: 'users', label: 'Users' },
  ];

  return (
    <main className="min-w-0">
      {/* Top bar: search + add */}
      <div className="flex items-center gap-3.5 px-[30px] py-[18px] border-b border-line bg-white sticky top-0 z-30">
        <div className="flex-1 flex items-center gap-2.5 bg-[#F4F0E6] border border-line rounded-[10px] px-4 py-2.5 text-[13.5px] text-faint">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search hospitals, patients, appointments…"
            className="bg-transparent outline-none flex-1 text-ink placeholder-faint"
            aria-label="Search"
          />
        </div>
        <button type="button" onClick={() => setModal({ mode: 'add' })} className="mc-btn !bg-amber hover:!bg-[#9A6514] whitespace-nowrap">
          + Add hospital
        </button>
        <div className="w-9 h-9 rounded-full bg-ink text-paper flex items-center justify-center font-bold text-[13px]">
          AD
        </div>
      </div>

      <div className="p-[30px]">
        <div className="kicker">ADMIN PANEL</div>
        <h1 className="font-serif text-[30px] font-semibold mb-1.5">Overview</h1>
        <p className="text-muted text-[14px] mb-[22px]">
          {formatDate(new Date())} — here is what needs you today.
        </p>

        <div className="grid md:grid-cols-4 gap-3.5 mb-5">
          <Kpi label="TOTAL USERS" value={usersPage.total} sub="registered patients" />
          <Kpi label="HOSPITALS" value={hospitals.length} sub="in directory" />
          <Kpi label="APPOINTMENTS TODAY" value={todayCount} sub="on schedule" />
          <Kpi label="PENDING REVIEW" value={pendingAppts.length + inactiveHospitals.length} sub="needs attention" warn={pendingAppts.length + inactiveHospitals.length > 0} />
        </div>

        {(pendingAppts.length > 0 || inactiveHospitals.length > 0) && (
          <div className="grid md:grid-cols-2 gap-3.5 mb-[22px]">
            {inactiveHospitals.length > 0 && (
              <div className="flex items-center gap-3.5 bg-amber-wash border-[1.5px] border-amber-line rounded-xl px-[18px] py-4">
                <div>
                  <div className="font-bold text-[13.5px]">{inactiveHospitals.length} hospital{inactiveHospitals.length === 1 ? '' : 's'} marked inactive</div>
                  <div className="text-muted text-[12.5px] mt-[3px]">Hidden from the patient map until reactivated.</div>
                </div>
                <button type="button" onClick={() => setTab('hospitals')} className="ml-auto font-extrabold text-[12.5px] text-amber whitespace-nowrap">
                  Review →
                </button>
              </div>
            )}
            {pendingAppts.length > 0 && (
              <div className="flex items-center gap-3.5 bg-[#FDECEA] border-[1.5px] border-[#F0B3AC] rounded-xl px-[18px] py-4">
                <div>
                  <div className="font-bold text-[13.5px]">{pendingAppts.length} appointment{pendingAppts.length === 1 ? '' : 's'} awaiting confirmation</div>
                  <div className="text-muted text-[12.5px] mt-[3px]">Patients are waiting for hospital confirmation.</div>
                </div>
                <button type="button" onClick={() => setTab('appointments')} className="ml-auto font-extrabold text-[12.5px] text-urgency-red whitespace-nowrap">
                  View →
                </button>
              </div>
            )}
          </div>
        )}

        {banner.text && (
          <div
            className={`text-[13px] font-semibold rounded-xl px-4 py-3 mb-5 ${
              banner.type === 'error'
                ? 'text-urgency-red bg-[#FDECEA] border border-[#F0B3AC]'
                : 'text-urgency-green bg-[#DDF0E6] border border-[#B9E2C9]'
            }`}
          >
            {banner.text}
          </div>
        )}

        {/* Tabs */}
        <div id="admin-tabs" className="flex gap-1.5 border-b-2 border-line mb-0 scroll-mt-24">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`text-[13.5px] font-bold px-5 py-3 -mb-[2px] border-b-[3px] transition-colors duration-200 ${
                tab === t.id ? 'text-ink border-amber' : 'text-faint border-transparent hover:text-ink'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className="bg-sand text-muted rounded-full text-[11px] px-2 py-0.5 ml-1.5">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="bg-white border border-line border-t-0 rounded-b-[14px] overflow-hidden">
          {tab === 'hospitals' && (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[720px]">
                <thead>
                  <tr className="bg-[#FDFCF9]">
                    {['NAME', 'SPECIALIZATIONS', 'STATUS', 'ACTIONS'].map((h) => (
                      <th key={h} className="text-left text-[11px] font-extrabold tracking-[1px] text-faint px-[22px] py-3 border-b border-line">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredHospitals.map((h) => (
                    <tr key={h._id} className="hover:bg-[#FDFCF9] transition-colors">
                      <td className="px-[22px] py-3.5 border-b border-[#F1ECE0]">
                        <div className="font-bold">{h.name}</div>
                        <div className="text-[12px] text-faint">{h.address}</div>
                      </td>
                      <td className="px-[22px] py-3.5 border-b border-[#F1ECE0]">
                        {(h.specializations || []).slice(0, 3).map((s) => (
                          <span key={s} className="text-[11.5px] bg-sand rounded-md px-2 py-[3px] mr-1.5 text-muted font-semibold whitespace-nowrap">
                            {s}
                          </span>
                        ))}
                      </td>
                      <td className="px-[22px] py-3.5 border-b border-[#F1ECE0]">
                        <StatusPill status={h.availabilityStatus} />
                      </td>
                      <td className="px-[22px] py-3.5 border-b border-[#F1ECE0] whitespace-nowrap">
                        <button type="button" className={rowBtn} onClick={() => setModal({ mode: 'edit', hospital: h })}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className={rowBtnDanger}
                          disabled={busyId === h._id}
                          onClick={() => deleteHospital(h)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredHospitals.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-[22px] py-10 text-center text-muted text-[13.5px]">
                        No hospitals match{q ? ` “${search}”` : ''}.{' '}
                        <button type="button" className="mc-link" onClick={() => setModal({ mode: 'add' })}>
                          Add the first one →
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'appointments' && (
            <div>
              <div className="flex items-center gap-3 px-[22px] py-3.5 border-b border-line bg-[#FDFCF9]">
                <label className="text-[12px] font-bold text-faint tracking-[0.5px]" htmlFor="appt-filter">
                  STATUS
                </label>
                <select
                  id="appt-filter"
                  value={apptStatusFilter}
                  onChange={(e) => setApptStatusFilter(e.target.value)}
                  className="border-[1.5px] border-line rounded-lg px-3 py-2 text-[13px] bg-white outline-none focus:border-ink"
                >
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] min-w-[760px]">
                  <thead>
                    <tr className="bg-[#FDFCF9]">
                      {['PATIENT', 'HOSPITAL', 'SCHEDULE', 'STATUS', 'ACTIONS'].map((h) => (
                        <th key={h} className="text-left text-[11px] font-extrabold tracking-[1px] text-faint px-[22px] py-3 border-b border-line">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAppointments.map((a) => (
                      <tr key={a.appointmentId} className="hover:bg-[#FDFCF9] transition-colors">
                        <td className="px-[22px] py-3.5 border-b border-[#F1ECE0]">
                          <div className="font-bold">{a.user?.fullName || '—'}</div>
                          <div className="text-[12px] text-faint">{a.user?.email}</div>
                        </td>
                        <td className="px-[22px] py-3.5 border-b border-[#F1ECE0]">{a.hospital?.name || '—'}</td>
                        <td className="px-[22px] py-3.5 border-b border-[#F1ECE0] whitespace-nowrap">
                          {formatDate(a.appointmentDate)} · {a.appointmentTime}
                        </td>
                        <td className="px-[22px] py-3.5 border-b border-[#F1ECE0]">
                          <StatusPill status={a.status} />
                        </td>
                        <td className="px-[22px] py-3.5 border-b border-[#F1ECE0] whitespace-nowrap">
                          {a.status === 'pending' && (
                            <button type="button" className={rowBtn} disabled={busyId === a.appointmentId} onClick={() => patchAppointment(a.appointmentId, 'confirmed')}>
                              Confirm
                            </button>
                          )}
                          {(a.status === 'pending' || a.status === 'confirmed') && (
                            <button type="button" className={rowBtnDanger} disabled={busyId === a.appointmentId} onClick={() => patchAppointment(a.appointmentId, 'cancelled')}>
                              Cancel
                            </button>
                          )}
                          {a.status === 'cancelled' && <span className="text-[12px] text-faint">No actions</span>}
                        </td>
                      </tr>
                    ))}
                    {filteredAppointments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-[22px] py-10 text-center text-muted text-[13.5px]">
                          No appointments{apptStatusFilter ? ` with status “${apptStatusFilter}”` : ''}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] min-w-[680px]">
                  <thead>
                    <tr className="bg-[#FDFCF9]">
                      {['NAME', 'PHONE', 'JOINED', 'STATUS', 'ACTIONS'].map((h) => (
                        <th key={h} className="text-left text-[11px] font-extrabold tracking-[1px] text-faint px-[22px] py-3 border-b border-line">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u._id} className="hover:bg-[#FDFCF9] transition-colors">
                        <td className="px-[22px] py-3.5 border-b border-[#F1ECE0]">
                          <div className="font-bold">{u.fullName}</div>
                          <div className="text-[12px] text-faint">{u.email}</div>
                        </td>
                        <td className="px-[22px] py-3.5 border-b border-[#F1ECE0]">{u.phoneNumber || '—'}</td>
                        <td className="px-[22px] py-3.5 border-b border-[#F1ECE0] whitespace-nowrap">{formatDate(u.createdAt)}</td>
                        <td className="px-[22px] py-3.5 border-b border-[#F1ECE0]">
                          <StatusPill status={u.isActive !== false} />
                        </td>
                        <td className="px-[22px] py-3.5 border-b border-[#F1ECE0] whitespace-nowrap">
                          <button
                            type="button"
                            className={u.isActive !== false ? rowBtnDanger : rowBtn}
                            disabled={busyId === u._id}
                            onClick={() => toggleUser(u)}
                          >
                            {u.isActive !== false ? 'Deactivate' : 'Reactivate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-[22px] py-10 text-center text-muted text-[13.5px]">
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between px-[22px] py-4 border-t border-line bg-[#FDFCF9]">
                <span className="text-[12.5px] text-faint">
                  Page {usersPage.page} of {usersPage.totalPages} · {usersPage.total} users
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={rowBtn}
                    disabled={usersPage.page <= 1}
                    onClick={() => loadUsersPage(usersPage.page - 1)}
                  >
                    ← Prev
                  </button>
                  <button
                    type="button"
                    className={rowBtn}
                    disabled={usersPage.page >= usersPage.totalPages}
                    onClick={() => loadUsersPage(usersPage.page + 1)}
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <HospitalModal
          initial={modal.mode === 'edit' ? modal.hospital : null}
          onClose={() => setModal(null)}
          onSaved={(saved, mode) => {
            setModal(null);
            setBanner({
              type: 'ok',
              text: mode === 'add' ? `"${saved.name}" added to the directory.` : `"${saved.name}" updated.`,
            });
            // Re-pull the directory so distances/order stay correct.
            loadAll();
          }}
        />
      )}
    </main>
  );
}
