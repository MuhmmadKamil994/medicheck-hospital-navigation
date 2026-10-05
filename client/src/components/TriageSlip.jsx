import { Link, useNavigate } from 'react-router-dom';

// SDD enum → stamp presentation
const STAMPS = {
  emergency: {
    label: 'Emergency',
    sub: 'Go to the ER now',
    color: '#B91C1C',
  },
  'semi-urgent': {
    label: 'Within 24 hours',
    sub: 'See a doctor today',
    color: '#B45309',
  },
  routine: {
    label: 'Routine',
    sub: 'Book a GP visit',
    color: '#2E7D62',
  },
};

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

function SlipChrome({ children, reportNo }) {
  return (
    <div className="print-slip slip-perf border-[1.5px] border-dashed border-[#B9AE93] rounded-md px-9 pt-[26px] pb-[22px] relative bg-white">
      <div className="absolute top-0 left-0 right-0 h-[5px] bg-ink rounded-t-md" aria-hidden="true" />
      <div className="flex justify-between items-start mb-4">
        <div className="text-[11px] font-extrabold tracking-[2px] text-faint">TRIAGE REPORT</div>
        <div className="text-[11px] text-faint font-semibold">{reportNo}</div>
      </div>
      {children}
    </div>
  );
}

/**
 * The stamped medical slip — the signature piece of the design.
 * states: idle | loading | result | error | login-required
 */
export default function TriageSlip({ state, result, error, onRetry }) {
  const navigate = useNavigate();

  if (state === 'loading') {
    return (
      <SlipChrome reportNo="No. MC-······">
        <div className="space-y-3 py-2" aria-label="Analyzing your symptoms">
          <div className="mc-shimmer h-4 w-3/4" />
          <div className="mc-shimmer h-4 w-1/2" />
          <div className="mc-shimmer h-4 w-2/3" />
          <div className="flex justify-center py-6">
            <div className="mc-shimmer h-[64px] w-[240px]" />
          </div>
          <div className="mc-shimmer h-4 w-full" />
          <div className="mc-shimmer h-4 w-5/6" />
          <p className="text-center text-[13px] text-muted pt-2">
            <span className="mc-spinner !border-ink/20 !border-t-ink" aria-hidden="true" />{' '}
            Reading your symptoms…
          </p>
        </div>
      </SlipChrome>
    );
  }

  if (state === 'error') {
    return (
      <SlipChrome reportNo="No. MC-······">
        <div className="text-center py-10">
          <div className="font-serif text-xl font-bold mb-3">Analysis temporarily unavailable</div>
          <p className="text-[13.5px] text-muted leading-relaxed mb-6 max-w-[340px] mx-auto">
            {error || 'Our AI service did not respond. Please try again in a moment.'}
          </p>
          <button
            onClick={onRetry}
            className="mc-btn bg-ink text-paper font-bold text-sm px-8 py-3 rounded-[10px] hover:bg-ink-deep"
          >
            Try again
          </button>
        </div>
      </SlipChrome>
    );
  }

  if (state === 'login-required') {
    return (
      <SlipChrome reportNo="No. MC-······">
        <div className="text-center py-10">
          <div className="font-serif text-xl font-bold mb-3">One quick step first</div>
          <p className="text-[13.5px] text-muted leading-relaxed mb-6 max-w-[340px] mx-auto">
            AI triage needs a free account so we can keep your report history safe.
            It takes 20 seconds — your symptoms above are kept.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              to="/login"
              className="mc-btn bg-ink text-paper font-bold text-sm px-8 py-3 rounded-[10px] hover:bg-ink-deep"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="mc-btn font-bold text-sm px-8 py-3 rounded-[10px] border-[1.5px] border-ink text-ink hover:bg-sand"
            >
              Create account
            </Link>
          </div>
        </div>
      </SlipChrome>
    );
  }

  if (state === 'result' && result) {
    const stamp = STAMPS[result.urgencyLevel] || STAMPS.routine;
    const reportNo = result.recordId
      ? `No. MC-${String(result.recordId).slice(-6).toUpperCase()}`
      : 'No. MC-GUEST';
    return (
      <SlipChrome reportNo={`${reportNo} · ${formatDate(result.createdAt || Date.now())}`}>
        <div className="flex gap-2 text-[13px] py-[7px] border-b border-dotted border-[#E0D7C2]">
          <b className="min-w-[118px] text-muted font-semibold">Symptoms</b>
          <span>{result.symptoms.join(', ')}</span>
        </div>
        <div className="flex gap-2 text-[13px] py-[7px] border-b border-dotted border-[#E0D7C2]">
          <b className="min-w-[118px] text-muted font-semibold">Severity</b>
          <span className="capitalize">
            {result.severity} · {result.duration}
          </span>
        </div>
        <div className="flex gap-2 text-[13px] py-[7px] border-b border-dotted border-[#E0D7C2]">
          <b className="min-w-[118px] text-muted font-semibold">Likely cause</b>
          <span>
            {result.conditionDescription} <i>(guidance only)</i>
          </span>
        </div>

        <div className="text-center my-[22px]">
          <span className="stamp text-[21px]" style={{ color: stamp.color }}>
            {stamp.label}
            <small className="block text-[10.5px] tracking-[1.6px] mt-1 font-bold">
              {stamp.sub}
            </small>
          </span>
        </div>

        <div className="bg-amber-wash border border-amber-line rounded-[10px] px-[17px] py-[15px] text-[13.5px] leading-[1.65] text-[#5C4A1F] mb-4">
          <b className="text-ink">What to do: </b>
          {result.actionAdvice || defaultAdvice(result.urgencyLevel)}
        </div>

        <p className="text-[11px] text-[#9A917C] leading-[1.6] italic mb-[18px]">
          {result.disclaimer ||
            'This is automated guidance, not a medical diagnosis. Please consult a qualified doctor.'}
        </p>

        <button
          onClick={() => navigate('/hospitals')}
          className="no-print mc-btn w-full bg-amber text-white rounded-[10px] p-[13px] text-sm font-bold hover:bg-[#9A6514]"
        >
          Find hospitals near me →
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="no-print w-full mt-2.5 text-[13px] font-bold text-ink bg-white border-[1.5px] border-line rounded-[10px] py-3 hover:border-ink transition-colors duration-200"
        >
          Print this report
        </button>
      </SlipChrome>
    );
  }

  // idle — same chrome, honest empty state (never a fake sample diagnosis)
  return (
    <SlipChrome reportNo="No. MC-······">
      <div className="text-center py-12">
        <div className="font-serif text-xl font-bold mb-3 text-ink">Your report appears here</div>
        <p className="text-[13.5px] text-muted leading-relaxed max-w-[320px] mx-auto">
          Describe your symptoms on the left and hit{' '}
          <b className="text-ink">Analyze my symptoms</b> — your stamped triage report will be
          printed here.
        </p>
      </div>
    </SlipChrome>
  );
}

function defaultAdvice(level) {
  if (level === 'emergency')
    return 'Do not wait — go to the nearest emergency room immediately or call 1122.';
  if (level === 'semi-urgent')
    return 'See a doctor within 24 hours. Rest, stay hydrated, and watch for worsening signs.';
  return 'A normal GP visit at your convenience is enough. Rest and monitor your symptoms.';
}
