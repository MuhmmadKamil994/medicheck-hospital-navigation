/**
 * GeminiService — AI-powered symptom triage (SDD §4.1, DFD process 2.0).
 *
 * Sends the patient's symptoms to the Gemini API and returns a strict
 * urgency classification. The API key is NEVER logged; only error classes
 * (auth vs network vs bad response) are surfaced to callers.
 */

/**
 * NOTE (2026-10-05): SDD §4.1 names the `gemini-pro` model, but Google
 * retired it — v1beta now answers 404 for it. Default is gemini-3.5-flash-lite
 * (verified working for this API key's account tier via ListModels; older
 * 2.x models return "no longer available to new users"). Override with
 * GEMINI_MODEL if the supervisor prefers another model. SDD §4.1 will need
 * this one-line endpoint update in the report.
 */
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
// SDD 4.1: 5s max wait before telling the user to retry. Tunable because some
// networks (e.g. proxied dev VMs) add latency; production default stays 5000.
const TIMEOUT_MS = parseInt(process.env.GEMINI_TIMEOUT_MS || '5000', 10);

const DISCLAIMER =
  'This is automated guidance, not a medical diagnosis. Please consult a qualified doctor.';

// Model vocabulary -> SDD §3.12.2 urgencyLevel enum
const URGENCY_MAP = {
  emergency: 'emergency',
  within_24_hours: 'semi-urgent',
  'semi-urgent': 'semi-urgent',
  semi_urgent: 'semi-urgent',
  routine: 'routine',
};

class GeminiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code; // GEMINI_NO_KEY | GEMINI_AUTH | GEMINI_TIMEOUT | GEMINI_NETWORK | GEMINI_BAD_RESPONSE
    this.statusCode = 502; // upstream AI failure -> Bad Gateway
  }
}

function buildPrompt(symptoms, severity, duration) {
  const symptomList = symptoms.join(', ');
  return (
    'You are a medical triage assistant for a university final-year project. ' +
    'A patient describes symptoms; you classify the urgency and describe the likely ' +
    'condition in plain, everyday words.\n\n' +
    `Symptoms: ${symptomList}\n` +
    `Severity: ${severity || 'not specified'}\n` +
    `Duration: ${duration || 'not specified'}\n\n` +
    'Classification rules — urgency_level must be exactly one of:\n' +
    '- "emergency": signs of a life-threatening situation (e.g. severe chest pain, ' +
    'difficulty breathing, stroke signs, heavy bleeding, loss of consciousness). ' +
    'The patient should go to an emergency room immediately.\n' +
    '- "within_24_hours": concerning symptoms that need a doctor today but are not ' +
    'immediately life-threatening (e.g. high persistent fever, spreading rash, ' +
    'severe pain, continuous vomiting).\n' +
    '- "routine": mild, common, likely self-limiting issues (e.g. mild cold, light ' +
    'headache, minor muscle aches). A normal GP appointment is enough.\n\n' +
    'Writing rules for condition_description:\n' +
    '- 1-2 sentences, plain non-technical words a non-medical person understands.\n' +
    '- Never claim a diagnosis. Use cautious language like "may suggest" or ' +
    '"is often associated with".\n' +
    '- Do not prescribe medication or dosages.\n\n' +
    'Respond with STRICT JSON only — no markdown, no code fences, no extra text:\n' +
    '{"urgency_level":"emergency|within_24_hours|routine","condition_description":"..."}'
  );
}

// Extracts the first {...} JSON object from model text (tolerates fences).
function extractJson(text) {
  if (!text || typeof text !== 'string') return null;
  const cleaned = text.replace(/```json|```/gi, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/**
 * @returns {Promise<{urgencyLevel, conditionDescription, disclaimer}>}
 * @throws {GeminiError} on any failure — the controller converts every
 *   failure into "Analysis temporarily unavailable, please try again".
 */
async function analyzeSymptoms(symptoms, severity, duration) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError('GEMINI_NO_KEY', 'Analysis temporarily unavailable, please try again');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(symptoms, severity, duration) }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 600 },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err && err.name === 'AbortError') {
      throw new GeminiError('GEMINI_TIMEOUT', 'Analysis temporarily unavailable, please try again');
    }
    throw new GeminiError('GEMINI_NETWORK', 'Analysis temporarily unavailable, please try again');
  }
  clearTimeout(timer);

  // Auth failures (bad/revoked key, billing issue) get their own class so
  // deploy logs can distinguish them from transient upstream errors.
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    throw new GeminiError('GEMINI_AUTH', 'Analysis temporarily unavailable, please try again');
  }
  if (!res.ok) {
    throw new GeminiError('GEMINI_UPSTREAM', 'Analysis temporarily unavailable, please try again');
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new GeminiError('GEMINI_BAD_RESPONSE', 'Analysis temporarily unavailable, please try again');
  }

  const text = data && data.candidates && data.candidates[0] &&
    data.candidates[0].content && data.candidates[0].content.parts &&
    data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;

  const parsed = extractJson(text);
  const rawLevel = parsed && typeof parsed.urgency_level === 'string'
    ? parsed.urgency_level.toLowerCase().trim()
    : '';
  const urgencyLevel = URGENCY_MAP[rawLevel];
  const conditionDescription =
    parsed && typeof parsed.condition_description === 'string'
      ? parsed.condition_description.trim().slice(0, 2000) // SDD 3.12.2: max 2000 chars
      : '';

  if (!urgencyLevel || !conditionDescription) {
    throw new GeminiError('GEMINI_BAD_RESPONSE', 'Analysis temporarily unavailable, please try again');
  }

  return { urgencyLevel, conditionDescription, disclaimer: DISCLAIMER };
}

module.exports = { analyzeSymptoms, GeminiError, DISCLAIMER, URGENCY_MAP };
