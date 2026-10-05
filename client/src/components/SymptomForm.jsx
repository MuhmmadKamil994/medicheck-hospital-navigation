import { useState } from 'react';

const QUICK_CHIPS = ['Fever', 'Body aches', 'Sore throat', 'Chest pain', 'Dizziness', 'Headache'];
const SEVERITIES = ['mild', 'moderate', 'severe'];
const DURATIONS = ['Today', '2–3 days', 'A week+'];

const splitSymptoms = (text) =>
  text.split(',').map((s) => s.trim()).filter(Boolean);

/**
 * Left panel of the triage console: free-text symptoms + quick chips,
 * severity segmented control, duration pills, and the Analyze button.
 * Calls onAnalyze({ symptoms, severity, duration }) — parent owns the API call.
 */
export default function SymptomForm({ onAnalyze, loading }) {
  const [text, setText] = useState('');
  const [severity, setSeverity] = useState('moderate');
  const [duration, setDuration] = useState('2–3 days');
  const [touched, setTouched] = useState(false);

  const current = splitSymptoms(text).map((s) => s.toLowerCase());

  const toggleChip = (chip) => {
    const list = splitSymptoms(text);
    const idx = list.findIndex((s) => s.toLowerCase() === chip.toLowerCase());
    if (idx >= 0) list.splice(idx, 1);
    else list.push(chip);
    setText(list.join(', '));
  };

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    const symptoms = splitSymptoms(text);
    if (symptoms.length === 0) return;
    onAnalyze({ symptoms, severity, duration });
  };

  const showEmptyError = touched && splitSymptoms(text).length === 0;

  return (
    <form
      onSubmit={submit}
      className="bg-white border border-line rounded-[14px] p-[26px]"
      noValidate
    >
      <div className="text-[11px] font-extrabold tracking-[1.8px] text-faint mb-[10px]">
        STEP 1 — SYMPTOMS
      </div>
      <label htmlFor="symptoms-input" className="text-sm font-bold block mb-[10px]">
        Describe what you&apos;re feeling
      </label>
      <textarea
        id="symptoms-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. fever, chest pain, dizziness"
        rows={3}
        className={`w-full border-[1.5px] rounded-[10px] px-[15px] py-[13px] text-[14.5px] bg-[#FDFCF9] text-ink outline-none resize-none placeholder:text-faint/70 focus:border-ink transition-colors duration-200 ${
          showEmptyError ? 'border-urgency-red' : 'border-[#D8CFB8]'
        }`}
      />
      {showEmptyError && (
        <p className="text-urgency-red text-[12.5px] font-semibold mt-2">
          Please describe at least one symptom, or tap a quick chip below.
        </p>
      )}

      <div className="flex flex-wrap gap-2 my-[14px]" role="group" aria-label="Quick symptoms">
        {QUICK_CHIPS.map((chip) => {
          const on = current.includes(chip.toLowerCase());
          return (
            <button
              key={chip}
              type="button"
              onClick={() => toggleChip(chip)}
              aria-pressed={on}
              className={`mc-btn text-[12.5px] font-semibold px-[15px] py-2 rounded-full border-[1.5px] ${
                on
                  ? 'bg-ink text-white border-ink'
                  : 'border-[#D8CFB8] bg-white text-[#3D4C66] hover:border-ink'
              }`}
            >
              {chip}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => document.getElementById('symptoms-input')?.focus()}
          className="mc-btn text-[12.5px] font-semibold px-[15px] py-2 rounded-full border-[1.5px] border-dashed border-[#D8CFB8] text-muted hover:border-ink hover:text-ink"
        >
          + Add
        </button>
      </div>

      <div className="text-[11px] font-extrabold tracking-[1.8px] text-faint mb-[10px]">
        STEP 2 — TWO QUICK QUESTIONS
      </div>
      <span className="text-sm font-bold block mb-[10px]" id="severity-label">
        How bad is it?
      </span>
      <div
        className="flex bg-sand rounded-[10px] p-1 gap-1 mb-5"
        role="group"
        aria-labelledby="severity-label"
      >
        {SEVERITIES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSeverity(s)}
            aria-pressed={severity === s}
            className={`mc-btn flex-1 text-center text-[13px] font-semibold py-[9px] rounded-[7px] capitalize ${
              severity === s
                ? 'bg-white text-ink shadow-card'
                : 'text-muted hover:text-ink'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <span className="text-sm font-bold block mb-[10px]" id="duration-label">
        Since when?
      </span>
      <div className="flex flex-wrap gap-2 mb-6" role="group" aria-labelledby="duration-label">
        {DURATIONS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDuration(d)}
            aria-pressed={duration === d}
            className={`mc-btn text-[12.5px] font-semibold px-[14px] py-2 rounded-lg border-[1.5px] ${
              duration === d
                ? 'border-amber text-amber bg-amber-wash'
                : 'border-[#D8CFB8] text-[#3D4C66] hover:border-ink'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mc-btn w-full bg-ink text-paper rounded-[10px] p-[15px] text-[15px] font-bold hover:bg-ink-deep disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span>
            <span className="mc-spinner" aria-hidden="true" />{' '}
            Analyzing…
          </span>
        ) : (
          'Analyze my symptoms'
        )}
        <small className="block font-normal text-[11.5px] text-[#B9C2D4] mt-1">
          AI triage · takes about 5 seconds
        </small>
      </button>
    </form>
  );
}
