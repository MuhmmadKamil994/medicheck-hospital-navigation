import { useState } from 'react';
import adminApi, { parseApiError } from '../../api/adminClient.js';

// Add / edit hospital. The address field has a "Find coordinates" helper
// that calls POST /api/hospitals/geocode (Nominatim) so the admin never has
// to look coordinates up by hand.
const inputCls =
  'w-full border-[1.5px] border-line rounded-[10px] px-4 py-2.5 text-[14px] bg-white outline-none focus:border-ink transition-colors duration-200';

function toForm(h) {
  const coords = h?.location?.coordinates || [];
  return {
    name: h?.name || '',
    address: h?.address || '',
    latitude: coords.length === 2 ? String(coords[1]) : '',
    longitude: coords.length === 2 ? String(coords[0]) : '',
    specializations: (h?.specializations || []).join(', '),
    operatingHours: h?.operatingHours || '',
    insuranceAccepted: (h?.insuranceAccepted || []).join(', '),
    availabilityStatus: h?.availabilityStatus !== false,
    contactNumber: h?.contactNumber || '',
  };
}

export default function HospitalModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(() => toForm(initial));
  const [geo, setGeo] = useState({ loading: false, note: '', error: '' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function geocodeAddress() {
    if (!form.address.trim()) {
      setGeo({ loading: false, note: '', error: 'Type an address first.' });
      return;
    }
    setGeo({ loading: true, note: '', error: '' });
    try {
      const { data } = await adminApi.post('/api/hospitals/geocode', { address: form.address.trim() });
      setForm((f) => ({ ...f, latitude: String(data.lat), longitude: String(data.lng) }));
      setGeo({ loading: false, note: data.displayName || 'Coordinates found.', error: '' });
    } catch (err) {
      const { message, status } = parseApiError(err, 'Geocoding failed.');
      setGeo({
        loading: false,
        note: '',
        error: status === 404 ? 'No coordinates found for this address — try adding the city.' : message,
      });
    }
  }

  async function save() {
    setSaving(true);
    setErrors({});
    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      specializations: form.specializations.split(',').map((s) => s.trim()).filter(Boolean),
      operatingHours: form.operatingHours.trim(),
      insuranceAccepted: form.insuranceAccepted.split(',').map((s) => s.trim()).filter(Boolean),
      availabilityStatus: form.availabilityStatus,
      contactNumber: form.contactNumber.trim(),
    };
    try {
      const { data } = isEdit
        ? await adminApi.patch(`/api/admin/hospitals/${initial._id}`, payload)
        : await adminApi.post('/api/admin/hospitals', payload);
      onSaved(data.hospital, isEdit ? 'edit' : 'add');
    } catch (err) {
      const { message, errors: fieldErrors } = parseApiError(err, 'Could not save the hospital.');
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
      aria-label={isEdit ? 'Edit hospital' : 'Add hospital'}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-paper rounded-2xl border border-line shadow-page max-h-[90vh] overflow-y-auto p-6 md:p-7">
        <div className="flex items-start justify-between mb-5">
          <h3 className="font-serif text-2xl font-bold">{isEdit ? 'Edit hospital' : 'Add hospital'}</h3>
          <button type="button" onClick={onClose} className="mc-link text-sm" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-bold mb-1.5" htmlFor="hm-name">Hospital name *</label>
            <input id="hm-name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Bahawal Victoria Hospital" className={inputCls} />
            {errors.name && <p className="text-[12.5px] text-urgency-red mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-[13px] font-bold mb-1.5" htmlFor="hm-address">Address</label>
            <div className="flex gap-2">
              <input
                id="hm-address"
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="Circular Road, Bahawalpur"
                className={inputCls}
              />
              <button
                type="button"
                onClick={geocodeAddress}
                disabled={geo.loading}
                className="whitespace-nowrap text-[13px] font-bold px-4 rounded-[10px] border-[1.5px] border-amber text-amber hover:bg-amber hover:text-white transition-colors duration-200 disabled:opacity-50"
              >
                {geo.loading ? 'Locating…' : 'Find coordinates'}
              </button>
            </div>
            {geo.note && <p className="text-[12px] text-urgency-green font-semibold mt-1.5">✓ {geo.note}</p>}
            {geo.error && <p className="text-[12.5px] text-urgency-red mt-1.5">{geo.error}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-bold mb-1.5" htmlFor="hm-lat">Latitude *</label>
              <input id="hm-lat" value={form.latitude} onChange={(e) => set('latitude', e.target.value)} placeholder="29.3956" inputMode="decimal" className={inputCls} />
            </div>
            <div>
              <label className="block text-[13px] font-bold mb-1.5" htmlFor="hm-lng">Longitude *</label>
              <input id="hm-lng" value={form.longitude} onChange={(e) => set('longitude', e.target.value)} placeholder="71.6722" inputMode="decimal" className={inputCls} />
            </div>
          </div>
          {(errors.latitude || errors.longitude) && (
            <p className="text-[12.5px] text-urgency-red -mt-2">{errors.latitude || errors.longitude}</p>
          )}

          <div>
            <label className="block text-[13px] font-bold mb-1.5" htmlFor="hm-spec">Specializations <span className="font-normal text-faint">(comma separated)</span></label>
            <input id="hm-spec" value={form.specializations} onChange={(e) => set('specializations', e.target.value)} placeholder="Cardiology, Emergency, Orthopedics" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-bold mb-1.5" htmlFor="hm-hours">Operating hours</label>
              <input id="hm-hours" value={form.operatingHours} onChange={(e) => set('operatingHours', e.target.value)} placeholder="Mon–Sat, 9am–9pm" className={inputCls} />
            </div>
            <div>
              <label className="block text-[13px] font-bold mb-1.5" htmlFor="hm-phone">Contact number</label>
              <input id="hm-phone" value={form.contactNumber} onChange={(e) => set('contactNumber', e.target.value)} placeholder="062-9250061" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-bold mb-1.5" htmlFor="hm-ins">Insurance accepted <span className="font-normal text-faint">(comma separated)</span></label>
            <input id="hm-ins" value={form.insuranceAccepted} onChange={(e) => set('insuranceAccepted', e.target.value)} placeholder="Sehat Sahulat, Jubilee" className={inputCls} />
          </div>

          <label className="flex items-center gap-2.5 text-[13.5px] font-semibold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.availabilityStatus}
              onChange={(e) => set('availabilityStatus', e.target.checked)}
              className="w-[18px] h-[18px] accent-[#B07818]"
            />
            Active — visible on the patient map
          </label>

          {errors._form && (
            <p className="text-[13px] text-urgency-red bg-[#FDECEA] border border-[#F0B3AC] rounded-lg px-4 py-3">
              {errors._form}
            </p>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose} className="mc-btn-ghost flex-1">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={saving} className="mc-btn flex-1 disabled:opacity-60 flex items-center justify-center gap-2">
            {saving && <span className="mc-spinner !w-4 !h-4 !border-paper/30 !border-t-paper" />}
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add hospital'}
          </button>
        </div>
      </div>
    </div>
  );
}
