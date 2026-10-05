// Pluggable SMS service — SDD 4.3.
// Twilio trial is unavailable in Pakistan, so the default provider is 'demo'
// (logs + on-screen confirmation, no real SMS). A local gateway (e.g. Eocean)
// can be added later as a new entry in `providers` WITHOUT touching callers.
//
//   sendSms({ to, message }) -> { sent, mode, messageId?, preview? }
//
// Provider is chosen once at load via env SMS_PROVIDER (default 'demo').

const PROVIDER = (process.env.SMS_PROVIDER || 'demo').toLowerCase();

// Never log a full phone number — PII stays out of logs.
function maskPhone(to) {
  const s = String(to || '');
  return s.length > 4 ? `***${s.slice(-4)}` : '***';
}

const providers = {
  // Demo mode: no network, no secrets. Logs a masked preview and reports
  // sent:true so booking/reminder flows are fully testable end-to-end.
  demo: {
    async send({ to, message }) {
      const preview = String(message).slice(0, 60);
      console.log(`[sms:demo] to=${maskPhone(to)} preview="${preview}"`);
      return {
        sent: true,
        mode: 'demo',
        messageId: `demo-${Date.now()}`,
        preview,
      };
    },
  },

  // Deliberately a stub — NO Twilio SDK code lives in this repo.
  // Twilio trial accounts cannot be created/used from Pakistan.
  twilio: {
    async send() {
      throw new Error(
        'Twilio provider not configured — trial unavailable in Pakistan; ' +
        'use SMS_PROVIDER=demo or add a local gateway provider'
      );
    },
  },

  // FUTURE: add 'eocean' (or any local gateway) here, e.g.:
  //   eocean: {
  //     async send({ to, message }) {
  //       const res = await fetch(process.env.EOCEAN_API_URL, { ... });
  //       ...
  //       return { sent: true, mode: 'eocean', messageId: res.id };
  //     },
  //   },
  // Callers keep calling sendSms({to, message}) — nothing else changes.
};

async function sendSms({ to, message }) {
  if (!to || !message) {
    throw new Error('sendSms requires { to, message }');
  }
  const provider = providers[PROVIDER] || providers.demo;
  return provider.send({ to, message });
}

module.exports = { sendSms, SMS_PROVIDER: PROVIDER, maskPhone };
