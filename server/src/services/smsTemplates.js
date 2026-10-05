// SMS message templates — SDD 4.3 wording style:
// 'Your appointment at [Hospital Name] is confirmed for [Date] at [Time]. – MediCheck'

function formatDate(d) {
  const date = d instanceof Date ? d : new Date(d);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day = String(date.getDate()).padStart(2, '0');
  return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Sent right after a booking is created (SDD DFD 4.0, test case TC-06).
function bookingConfirmation(hospitalName, appointmentDate, appointmentTime) {
  return `Your appointment at ${hospitalName} is confirmed for ${formatDate(appointmentDate)} at ${appointmentTime}. – MediCheck`;
}

// Sent by the reminder cron job ~24h before a confirmed appointment.
function appointmentReminder(hospitalName, appointmentDate, appointmentTime) {
  return `Reminder: you have an appointment at ${hospitalName} on ${formatDate(appointmentDate)} at ${appointmentTime}. Please arrive 15 minutes early. – MediCheck`;
}

module.exports = { bookingConfirmation, appointmentReminder, formatDate };
