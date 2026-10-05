// Appointment reminder job (SDD DFD 4.0 "Appointment Management" ->
// Twilio SMS reminders; test case TC-06 expects an SMS per booking).
//
// Runs every 30 minutes via node-cron. Finds CONFIRMED appointments whose
// date falls within the next 24 hours and that have not been reminded yet,
// sends the reminder SMS, and marks reminderSent=true.
//
// In demo mode (SMS_PROVIDER=demo, the default) no real SMS goes out, but
// reminderSent is still flipped so the whole flow is testable end-to-end.
// reminderSent is set true even if an individual send throws, so a bad
// phone number can never cause an infinite reminder loop.
//
// runReminderJob accepts injected deps ({ AppointmentModel, sms }) so it can
// be unit-tested without a database or the 30-minute wait.

const cron = require('node-cron');
const { isDbReady } = require('../config/db');
const Appointment = require('../models/Appointment');
const smsService = require('../services/smsService');
const { maskPhone } = smsService;
const { appointmentReminder } = require('../services/smsTemplates');

const EVERY_30_MIN = '*/30 * * * *';

async function runReminderJob(deps = {}) {
  const AppointmentModel = deps.AppointmentModel || Appointment;
  const sms = deps.sms || smsService;

  if (!isDbReady() && !deps.AppointmentModel) {
    console.log('[reminders] skipped — database unavailable');
    return { skipped: true, reason: 'db-down' };
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const cutoff = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Lower bound is start-of-today (not "now") because appointmentDate is
  // stored at midnight — an appointment later today must still qualify.
  const due = await AppointmentModel.find({
    status: 'confirmed',
    reminderSent: false,
    appointmentDate: { $gte: startOfToday, $lte: cutoff },
  })
    .populate('userId', 'fullName phoneNumber')
    .populate('hospitalId', 'name');

  let sent = 0;
  let failed = 0;
  for (const appt of due) {
    const to = appt.userId && appt.userId.phoneNumber;
    const hospitalName = (appt.hospitalId && appt.hospitalId.name) || 'your hospital';
    try {
      if (to) {
        await sms.sendSms({
          to,
          message: appointmentReminder(hospitalName, appt.appointmentDate, appt.appointmentTime),
        });
      }
      appt.reminderSent = true;
      if (typeof appt.save === 'function') await appt.save();
      sent += 1;
      console.log(`[reminders] reminder sent for appointment ${appt._id} (to=${maskPhone(to)})`);
    } catch (err) {
      failed += 1;
      // Still mark sent so one bad record can't spam forever.
      try {
        appt.reminderSent = true;
        if (typeof appt.save === 'function') await appt.save();
      } catch (_) { /* best effort */ }
      console.error(`[reminders] failed for appointment ${appt._id}: ${err.message}`);
    }
  }

  console.log(`[reminders] run complete: ${due.length} due, ${sent} sent, ${failed} failed`);
  return { skipped: false, due: due.length, sent, failed };
}

function startReminderJob() {
  cron.schedule(EVERY_30_MIN, () => {
    runReminderJob().catch((err) =>
      console.error(`[reminders] unexpected job error: ${err.message}`)
    );
  });
  console.log('[reminders] cron scheduled (every 30 minutes)');
}

module.exports = { runReminderJob, startReminderJob };
