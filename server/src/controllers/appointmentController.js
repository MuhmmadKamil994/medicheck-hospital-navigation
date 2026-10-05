const Appointment = require('../models/Appointment');
const Hospital = require('../models/Hospital');
const User = require('../models/User');
const dbGuard = require('../utils/dbGuard');
const asyncHandler = require('../utils/asyncHandler');
const smsService = require('../services/smsService');
const { bookingConfirmation } = require('../services/smsTemplates');

function toAppointmentObject(a) {
  const h = a.hospitalId && a.hospitalId.name ? a.hospitalId : null;
  return {
    appointmentId: a._id,
    hospital: h
      ? { hospitalId: h._id, name: h.name, address: h.address }
      : { hospitalId: a.hospitalId },
    appointmentDate: a.appointmentDate,
    appointmentTime: a.appointmentTime,
    status: a.status,
    reminderSent: a.reminderSent,
    createdAt: a.createdAt,
  };
}

// POST /api/appointments/book  (JWT protected)
// Validates hospital + future date + HH:MM slot -> creates Appointment
// (status 'pending') -> sends booking-confirmation SMS (demo mode by default).
// Per SDD 4.3 an SMS failure never fails the booking itself.
const book = asyncHandler(async (req, res) => {
  if (!dbGuard(res)) return;
  const { hospitalId, appointmentDate, appointmentTime } = req.body;

  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    return res.status(404).json({ success: false, message: 'Hospital not found' });
  }
  if (!hospital.availabilityStatus) {
    return res.status(400).json({
      success: false,
      message: 'This hospital is currently not accepting appointments',
    });
  }

  const appointment = await Appointment.create({
    userId: req.user.id,
    hospitalId: hospital._id,
    appointmentDate: new Date(appointmentDate),
    appointmentTime,
    status: 'pending',
    reminderSent: false,
  });

  // Confirmation SMS — best effort, never blocks the 201 (SDD 4.3).
  let sms = { sent: false, mode: smsService.SMS_PROVIDER };
  try {
    const user = await User.findById(req.user.id).select('phoneNumber').lean();
    if (user && user.phoneNumber) {
      sms = await smsService.sendSms({
        to: user.phoneNumber,
        message: bookingConfirmation(hospital.name, appointment.appointmentDate, appointmentTime),
      });
    }
  } catch (err) {
    console.error(`[appointments] booking SMS failed (booking kept): ${err.message}`);
  }

  res.status(201).json({
    success: true,
    appointment: toAppointmentObject({ ...appointment.toObject(), hospitalId: hospital }),
    sms: { sent: sms.sent === true, mode: sms.mode || smsService.SMS_PROVIDER },
  });
});

// GET /api/appointments  (JWT protected)
// The caller's own appointments, upcoming first.
const list = asyncHandler(async (req, res) => {
  if (!dbGuard(res)) return;
  const appointments = await Appointment.find({ userId: req.user.id })
    .populate('hospitalId', 'name address')
    .sort({ appointmentDate: 1, createdAt: -1 })
    .lean();
  res.json({
    success: true,
    count: appointments.length,
    appointments: appointments.map(toAppointmentObject),
  });
});

// DELETE /api/appointments/:id  (JWT protected)
// Cancels only the caller's own appointment, and only while it is still
// upcoming (date >= start of today) and not already cancelled.
const cancel = asyncHandler(async (req, res) => {
  if (!dbGuard(res)) return;
  const appointment = await Appointment.findOne({
    _id: req.params.id,
    userId: req.user.id,
  });
  if (!appointment) {
    return res.status(404).json({ success: false, message: 'Appointment not found' });
  }
  if (appointment.status === 'cancelled') {
    return res.status(400).json({ success: false, message: 'Appointment is already cancelled' });
  }
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (appointment.appointmentDate < startOfToday) {
    return res.status(400).json({
      success: false,
      message: 'Only upcoming appointments can be cancelled',
    });
  }
  appointment.status = 'cancelled';
  await appointment.save();
  res.json({ success: true, message: 'Appointment cancelled' });
});

module.exports = { book, list, cancel };
