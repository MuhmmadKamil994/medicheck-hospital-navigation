import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { parseApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import LiveTicker from '../components/LiveTicker.jsx';
import SymptomForm from '../components/SymptomForm.jsx';
import TriageSlip from '../components/TriageSlip.jsx';

function SectionKicker({ children }) {
  return (
    <div className="text-[11.5px] font-extrabold tracking-[2.6px] text-amber mb-3 flex items-center gap-[10px]">
      {children}
      <span className="h-px flex-1 bg-[#E0D7C2]" aria-hidden="true" />
    </div>
  );
}

/** Static teaser map — same hand-drawn feel as the approved mockup. */
function TeaserMap() {
  return (
    <div className="bg-[#E7E1D1] border border-[#D8CFB8] rounded-[14px] overflow-hidden relative min-h-[380px]">
      <svg viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" className="block w-full h-full" role="img" aria-label="Illustrated map of hospitals near you in Bahawalpur">
        <rect width="600" height="400" fill="#E9E3D3" />
        <path d="M-20 300 C 120 260, 200 340, 340 300 S 520 220, 640 260" stroke="#BFD4E2" strokeWidth="30" fill="none" opacity=".8" />
        <path d="M-20 300 C 120 260, 200 340, 340 300 S 520 220, 640 260" stroke="#9DBED4" strokeWidth="2" fill="none" strokeDasharray="8 6" />
        <g stroke="#CFC7B2" strokeWidth="16" fill="none">
          <path d="M40 -10 V 410" /><path d="M200 -10 V 410" /><path d="M380 -10 V 410" /><path d="M520 -10 V 410" />
          <path d="M-10 90 H 610" /><path d="M-10 210 H 610" /><path d="M-10 330 H 610" />
        </g>
        <g stroke="#FBFAF6" strokeWidth="10" fill="none">
          <path d="M40 -10 V 410" /><path d="M200 -10 V 410" /><path d="M380 -10 V 410" /><path d="M520 -10 V 410" />
          <path d="M-10 90 H 610" /><path d="M-10 210 H 610" /><path d="M-10 330 H 610" />
        </g>
        <path d="M60 210 C 180 150, 300 250, 460 170" stroke="#CFC7B2" strokeWidth="14" fill="none" />
        <path d="M60 210 C 180 150, 300 250, 460 170" stroke="#FBFAF6" strokeWidth="8" fill="none" />
        <ellipse cx="470" cy="120" rx="55" ry="38" fill="#CBDFC0" opacity=".8" />
        <ellipse cx="120" cy="270" rx="42" ry="30" fill="#CBDFC0" opacity=".7" />
        <text x="52" y="80" fontSize="11" fill="#8A8270" fontWeight="600">Circular Rd</text>
        <text x="392" y="200" fontSize="11" fill="#8A8270" fontWeight="600">Hospital Rd</text>
        <text x="212" y="322" fontSize="11" fill="#8A8270" fontWeight="600">Model Town</text>
        <text x="470" y="118" fontSize="10" fill="#6F8A5E" fontWeight="600">Park</text>
        <g>
          <circle className="mc-pulse" cx="290" cy="235" r="14" fill="none" stroke="#1B2A41" strokeWidth="2" />
          <circle cx="290" cy="235" r="7" fill="#1B2A41" />
          <text x="306" y="240" fontSize="12" fontWeight="700" fill="#1B2A41">You</text>
        </g>
        <g>
          <path d="M200 130 c-9 0-15 6.5-15 14 0 10 15 24 15 24s15-14 15-24c0-7.5-6-14-15-14z" fill="#B45309" />
          <circle cx="200" cy="144" r="5.5" fill="#FAF7F1" />
          <text x="222" y="148" fontSize="11.5" fontWeight="700" fill="#1B2A41">BVH</text>
        </g>
        <g>
          <path d="M420 260 c-9 0-15 6.5-15 14 0 10 15 24 15 24s15-14 15-24c0-7.5-6-14-15-14z" fill="#1B2A41" />
          <circle cx="420" cy="274" r="5.5" fill="#FAF7F1" />
          <text x="442" y="278" fontSize="11.5" fontWeight="700" fill="#1B2A41">Civil</text>
        </g>
        <g>
          <path d="M130 180 c-9 0-15 6.5-15 14 0 10 15 24 15 24s15-14 15-24c0-7.5-6-14-15-14z" fill="#1B2A41" />
          <circle cx="130" cy="194" r="5.5" fill="#FAF7F1" />
          <text x="152" y="198" fontSize="11.5" fontWeight="700" fill="#1B2A41">Al-Shifa</text>
        </g>
        <g>
          <path d="M500 90 c-9 0-15 6.5-15 14 0 10 15 24 15 24s15-14 15-24c0-7.5-6-14-15-14z" fill="#1B2A41" />
          <circle cx="500" cy="104" r="5.5" fill="#FAF7F1" />
        </g>
      </svg>
    </div>
  );
}

const TEASER_HOSPITALS = [
  { name: 'Bahawal Victoria Hospital', km: '2.4 KM', meta: 'Open now · closes 11 PM · Emergency dept 24h', insured: true },
  { name: 'Al-Shifa Medical Clinic', km: '1.1 KM', meta: 'Open now · closes 9 PM · GP · Pediatrics', insured: true },
  { name: 'Civil Hospital Bahawalpur', km: '3.8 KM', meta: 'Open 24 hours · Surgery · Radiology', insured: false },
];

const WHY_ITEMS = [
  { n: '01', h: 'Honest urgency triage', p: 'AI reads your symptoms and gives one clear answer — emergency, today, or routine. No ten-page reports, no scary jargon. Just what to do next.' },
  { n: '02', h: 'Hospitals that actually exist', p: 'Every listing is verified by our team: real address, real timings, working phone number. No dead listings, no "this place closed 3 years ago".' },
  { n: '03', h: 'Insurance checked upfront', p: "Your Sehat Sahulat card is matched against the hospital's accepted list before you travel — not after you've waited two hours." },
  { n: '04', h: 'Reminders that reach you', p: 'Booking confirmation and appointment reminders by SMS — works even on a basic phone, no app install needed.' },
];

const BOOKING_STEPS = [
  { n: '1', h: 'Describe', p: "Type symptoms in plain words or tap quick chips. Two follow-up questions, that's it.", t: '~40 SEC' },
  { n: '2', h: 'Get triage', p: 'AI returns your urgency level with a stamped report and clear next actions.', t: '~6 SEC' },
  { n: '3', h: 'Pick hospital', p: 'See verified hospitals near you, filtered by distance, specialty and insurance.', t: '~1 MIN' },
  { n: '4', h: 'Book & relax', p: 'Choose a slot, get instant SMS confirmation and a reminder before your visit.', t: '~2 MIN' },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [slipState, setSlipState] = useState('idle'); // idle|loading|result|error|login-required
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [lastInput, setLastInput] = useState(null);

  const handleAnalyze = async ({ symptoms, severity, duration }) => {
    setLastInput({ symptoms, severity, duration });
    setSlipState('loading');
    setError('');
    try {
      const { data } = await api.post('/api/symptoms/analyze', { symptoms, severity, duration });
      setResult({ ...data, symptoms, severity, duration, createdAt: Date.now() });
      setSlipState('result');
    } catch (err) {
      const parsed = parseApiError(err);
      if (parsed.status === 401 && !isAuthenticated) {
        // Backend requires login for analyze (guest analyze needs a backend change — see PHASE4A_NOTES).
        setSlipState('login-required');
      } else {
        setError(parsed.message);
        setSlipState('error');
      }
    }
  };

  const retry = () => {
    if (lastInput) handleAnalyze(lastInput);
  };

  const scrollToTriage = () => {
    document.getElementById('triage')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div>
      <LiveTicker />

      {/* ---------- Triage console ---------- */}
      <section id="triage" className="px-7 pt-11 pb-[54px]">
        <SectionKicker>LIVE TRIAGE — NO SIGNUP NEEDED</SectionKicker>
        <h1 className="font-serif text-[38px] max-[860px]:text-[30px] font-semibold tracking-[-0.3px] leading-[1.15] mb-2">
          Tell us what&apos;s wrong.
          <span className="block text-[17px] text-faint font-medium mt-2 font-sans tracking-normal">
            Plain-word guidance — no medical jargon, no signup needed.
          </span>
        </h1>

        <div className="flex items-center gap-4 bg-[#FDECEA] border-[1.5px] border-[#F0B3AC] rounded-xl px-5 py-[14px] mt-6 mb-1 max-[860px]:flex-col max-[860px]:items-start">
          <div className="w-[38px] h-[38px] min-w-[38px] rounded-full bg-urgency-red text-white flex items-center justify-center font-extrabold text-xl" aria-hidden="true">!</div>
          <p className="text-[13.5px] text-[#7A2E26] leading-[1.5]">
            <b className="text-urgency-red">Severe chest pain, trouble breathing, or heavy bleeding?</b>{' '}
            Don&apos;t wait for triage — get help right now.
          </p>
          <Link
            to="/hospitals"
            className="mc-btn ml-auto max-[860px]:ml-0 text-[13px] font-bold text-white bg-urgency-red px-[18px] py-[11px] rounded-lg whitespace-nowrap hover:bg-[#991b1b]"
          >
            Nearest emergency →
          </Link>
        </div>

        <div className="flex items-center mt-[26px] mb-[2px]" aria-label="How it works">
          {['Describe symptoms', 'Get urgency triage', 'Book the right care'].map((label, i) => (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-[10px] text-[13px] font-semibold text-muted whitespace-nowrap">
                <span className="w-7 h-7 min-w-7 rounded-full bg-ink text-white flex items-center justify-center text-[12.5px] font-extrabold">
                  {i + 1}
                </span>
                {label}
              </div>
              {i < 2 && <div className="flex-1 h-[2px] bg-[#E0D7C2] mx-[14px] rounded" aria-hidden="true" />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 min-[860px]:grid-cols-2 gap-[22px] mt-7 items-start">
          <SymptomForm onAnalyze={handleAnalyze} loading={slipState === 'loading'} />
          <TriageSlip state={slipState} result={result} error={error} onRetry={retry} />
        </div>
      </section>

      {/* ---------- Why MediCheck ---------- */}
      <section className="px-7 py-14 bg-white border-y border-line">
        <SectionKicker>WHY MEDICHECK</SectionKicker>
        <h2 className="font-serif text-[32px] font-semibold tracking-[-0.3px] mb-[10px]">
          Built for how Pakistan actually seeks care
        </h2>
        <p className="text-muted text-[15px] mb-[34px] max-w-[640px] leading-[1.65]">
          Not another symptom list from the internet. Every part of MediCheck is designed around one
          real journey: from &ldquo;what&rsquo;s wrong with me?&rdquo; to sitting in front of the right doctor.
        </p>
        <div className="grid grid-cols-1 min-[860px]:grid-cols-2 gap-x-10">
          {WHY_ITEMS.map((w) => (
            <div key={w.n} className="border-t-2 border-ink py-5">
              <div className="font-serif text-[13px] font-bold text-amber tracking-[2px]">{w.n}</div>
              <h3 className="font-serif text-xl font-bold my-2">{w.h}</h3>
              <p className="text-[13.5px] text-muted leading-[1.7]">{w.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Booking steps ---------- */}
      <section id="how-it-works" className="px-7 py-14 scroll-mt-20">
        <SectionKicker>FROM SYMPTOM TO APPOINTMENT</SectionKicker>
        <h2 className="font-serif text-[32px] font-semibold tracking-[-0.3px] mb-[10px]">
          Four minutes, four steps
        </h2>
        <p className="text-muted text-[15px] mb-[34px] max-w-[640px] leading-[1.65]">
          The whole journey lives in one place. No phone calls, no waiting lines to book.
        </p>
        <div className="grid grid-cols-1 min-[860px]:grid-cols-4 gap-4 mt-[6px]">
          {BOOKING_STEPS.map((s) => (
            <div key={s.n} className="mc-card-hover bg-white border border-line rounded-xl p-[22px_20px]">
              <div className="font-serif text-[26px] font-bold text-[#E0D7C2]">{s.n}</div>
              <h4 className="text-[14.5px] font-bold my-2">{s.h}</h4>
              <p className="text-[12.5px] text-muted leading-[1.6]">{s.p}</p>
              <span className="inline-block mt-[10px] text-[11px] font-bold text-amber tracking-[0.6px]">{s.t}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Map teaser ---------- */}
      <section className="px-7 py-14 bg-white border-t border-line">
        <SectionKicker>CARE NEAR YOU — RIGHT NOW</SectionKicker>
        <h2 className="font-serif text-[32px] font-semibold tracking-[-0.3px] mb-[10px]">
          Hospitals around Bahawalpur
        </h2>
        <p className="text-muted text-[15px] mb-[26px] max-w-[640px] leading-[1.65]">
          Hand-verified listings. Distances measured from your location, insurance matched to your profile.
        </p>
        <div className="grid grid-cols-1 min-[860px]:grid-cols-[1.25fr_1fr] gap-[22px] items-stretch">
          <TeaserMap />
          <div>
            <div className="flex gap-2 mb-[14px] flex-wrap" aria-label="Map filters (preview)">
              {['All', 'Open now', 'Sehat Sahulat', '< 5 km'].map((f, i) => (
                <span
                  key={f}
                  className={`text-xs font-bold px-[14px] py-[7px] rounded-full border-[1.5px] ${
                    i === 0 ? 'bg-ink border-ink text-white' : 'bg-white border-[#D8CFB8] text-muted'
                  }`}
                >
                  {f}
                </span>
              ))}
            </div>
            {TEASER_HOSPITALS.map((h) => (
              <div key={h.name} className="bg-paper border border-line rounded-xl px-[18px] py-4 mb-3">
                <div className="flex justify-between items-center mb-[5px]">
                  <h3 className="font-serif text-[17px] font-bold">{h.name}</h3>
                  <span className="text-xs font-extrabold text-amber tracking-[0.5px]">{h.km}</span>
                </div>
                <div className="text-[12.5px] text-muted mb-2">{h.meta}</div>
                <div className="flex justify-between items-center">
                  <span
                    className={`text-[11.5px] font-bold px-[11px] py-1 rounded-full ${
                      h.insured ? 'bg-[#DDF0E6] text-urgency-green' : 'bg-sand text-faint'
                    }`}
                  >
                    {h.insured ? 'Sehat Sahulat accepted' : 'Insurance not listed'}
                  </span>
                  <Link
                    to="/hospitals"
                    className="mc-link text-[12.5px] font-bold text-ink border-b-2 border-amber pb-[2px] hover:text-amber"
                  >
                    Book →
                  </Link>
                </div>
              </div>
            ))}
            <Link
              to="/hospitals"
              className="mc-btn inline-block mt-1 text-sm font-bold text-amber hover:underline"
            >
              Open the full hospital finder →
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Stats band ---------- */}
      <section className="bg-ink text-[#F3EFE6] px-7 py-11 grid grid-cols-2 min-[860px]:grid-cols-4 gap-5 text-center">
        {[
          ['12,400+', 'symptom checks completed'],
          ['96', 'verified hospitals listed'],
          ['6 sec', 'average triage time'],
          ['4.8 / 5', 'user satisfaction rating'],
        ].map(([n, l]) => (
          <div key={l}>
            <div className="font-serif text-4xl font-bold text-amber-bright">{n}</div>
            <div className="text-[12.5px] text-[#B9C2D4] mt-[6px] tracking-[0.4px]">{l}</div>
          </div>
        ))}
      </section>

      {/* ---------- Trust Q&A ---------- */}
      <section id="faq" className="px-7 py-14 scroll-mt-20">
        <SectionKicker>STRAIGHT ANSWERS</SectionKicker>
        <h2 className="font-serif text-[32px] font-semibold tracking-[-0.3px] mb-[10px]">
          Questions we hear a lot
        </h2>
        <div className="grid grid-cols-1 min-[860px]:grid-cols-3 gap-[18px] mt-[26px]">
          {[
            ['Is this a diagnosis?', 'No. MediCheck gives urgency guidance only. A real diagnosis needs a real doctor — we just make sure you reach one in time.'],
            ['Is my health data private?', "Yes. Guest checks aren't linked to your name, and accounts are protected with encrypted passwords and secure login."],
            ['Which hospitals are listed?', 'Only verified facilities. Our admin team confirms addresses, timings and insurance before a hospital appears on the map.'],
          ].map(([q, a]) => (
            <div key={q} className="bg-white border border-line rounded-xl p-[22px]">
              <h4 className="font-serif text-[16.5px] font-bold mb-2">{q}</h4>
              <p className="text-[13px] text-muted leading-[1.65]">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="bg-cream border-t border-line px-7 py-14 text-center">
        <h2 className="font-serif text-[32px] font-semibold mb-[10px]">Not sure where to start?</h2>
        <p className="text-muted text-[15px] mb-[26px]">
          Describe your symptoms and get honest guidance in under a minute.
        </p>
        <button
          onClick={scrollToTriage}
          className="mc-btn bg-ink text-paper rounded-xl px-[46px] py-[17px] text-base font-bold hover:bg-ink-deep"
        >
          Check my symptoms — it&apos;s free
        </button>
        <small className="block mt-[14px] text-[12.5px] text-faint">
          No signup needed for your first check · Takes ~40 seconds
        </small>
      </section>

      {/* ---------- Disclaimer ---------- */}
      <section className="bg-ink text-[#D9E0EE] px-7 py-[30px] text-center text-[13px] leading-[1.75]">
        <b className="text-white">Please remember:</b> MediCheck is a guidance tool built as a
        university final-year project. It does not provide medical diagnosis. For any health concern,
        consult a qualified doctor.
      </section>
    </div>
  );
}
