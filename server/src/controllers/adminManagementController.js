// Admin management endpoints (SDD DFD 5.0, test case TC-08).
// All routes here sit behind `auth` + `requireAdmin` (wired in routes/admin.js).

const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const dbGuard = require('../utils/dbGuard');
const asyncHandler = require('../utils/asyncHandler');

// Valid status transitions for an appointment.
const ALLOWED_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['cancelled'],
  cancelled: [],
};

function toAdminAppointmentObject(a) {
  const u = a.userId && a.userId.fullName ? a.userId : null;
  const h = a.hospitalId && a.hospitalId.name ? a.hospitalId : null;
  return {
    appointmentId: a._id,
    user: u
      ? { userId: u._id, fullName: u.fullName, email: u.email, phoneNumber: u.phoneNumber }
      : { userId: a.userId },
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

// GET /api/admin/appointments?status=&date=  (requireAdmin)
// All appointments, newest first. Optional filters: status enum,
// date=YYYY-MM-DD (matches that calendar day).
const listAppointments = asyncHandler(async (req, res) => {
  if (!dbGuard(res)) return;
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.date) {
    const day = new Date(req.query.date);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    filter.appointmentDate = { $gte: day, $lt: next };
  }
  const appointments = await Appointment.find(filter)
    .populate('userId', 'fullName email phoneNumber')
    .populate('hospitalId', 'name address')
    .sort({ createdAt: -1 })
    .lean();
  res.json({
    success: true,
    count: appointments.length,
    appointments: appointments.map(toAdminAppointmentObject),
  });
});

// PATCH /api/admin/appointments/:id  (requireAdmin)
// { status: 'confirmed' | 'cancelled' } with transition validation.
const updateAppointmentStatus = asyncHandler(async (req, res) => {
  if (!dbGuard(res)) return;
  const { status } = req.body;
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    return res.status(404).json({ success: false, message: 'Appointment not found' });
  }
  const allowed = ALLOWED_TRANSITIONS[appointment.status] || [];
  if (!allowed.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot change status from '${appointment.status}' to '${status}'`,
    });
  }
  appointment.status = status;
  await appointment.save();
  res.json({ success: true, message: `Appointment ${status}`, appointmentId: appointment._id });
});

// GET /api/admin/users?page=&limit=  (requireAdmin)
// Paginated user list, newest first. passwordHash is NEVER returned.
const listUsers = asyncHandler(async (req, res) => {
  if (!dbGuard(res)) return;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const total = await User.countDocuments();
  const users = await User.find()
    .select('-passwordHash -__v')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  res.json({
    success: true,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    users,
  });
});

// PATCH /api/admin/users/:id  (requireAdmin)
// { isActive: boolean } — deactivate/reactivate an account.
// Deactivated users cannot log in (checked in authController.login).
const setUserActive = asyncHandler(async (req, res) => {
  if (!dbGuard(res)) return;
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  user.isActive = req.body.isActive;
  await user.save();
  res.json({ success: true, user: user.toSafeObject() });
});

// ---- Hospital management (SDD 3.7: Add / Update / Delete Hospital Records)
// These endpoints were missing from the original backend; added in Phase 4b
// so the admin panel's hospital table is functional, not decorative.
// The admin UI sends latitude/longitude (from the geocode helper); we store
// GeoJSON [lng, lat] per the Hospital model.
function hospitalFromBody(body) {
  const doc = {};
  if (body.name !== undefined) doc.name = body.name;
  if (body.address !== undefined) doc.address = body.address;
  if (body.latitude !== undefined && body.longitude !== undefined) {
    doc.location = {
      type: 'Point',
      coordinates: [parseFloat(body.longitude), parseFloat(body.latitude)],
    };
  }
  if (body.specializations !== undefined) doc.specializations = body.specializations;
  if (body.operatingHours !== undefined) doc.operatingHours = body.operatingHours;
  if (body.insuranceAccepted !== undefined) doc.insuranceAccepted = body.insuranceAccepted;
  if (body.availabilityStatus !== undefined) doc.availabilityStatus = body.availabilityStatus;
  if (body.contactNumber !== undefined) doc.contactNumber = body.contactNumber;
  return doc;
}

// POST /api/admin/hospitals  (requireAdmin)
const createHospital = asyncHandler(async (req, res) => {
  if (!dbGuard(res)) return;
  const hospital = await Hospital.create(hospitalFromBody(req.body));
  res.status(201).json({ success: true, hospital });
});

// PATCH /api/admin/hospitals/:id  (requireAdmin)
const updateHospital = asyncHandler(async (req, res) => {
  if (!dbGuard(res)) return;
  const hospital = await Hospital.findByIdAndUpdate(
    req.params.id,
    { $set: hospitalFromBody(req.body) },
    { new: true, runValidators: true }
  );
  if (!hospital) {
    return res.status(404).json({ success: false, message: 'Hospital not found' });
  }
  res.json({ success: true, hospital });
});

// DELETE /api/admin/hospitals/:id  (requireAdmin)
const deleteHospital = asyncHandler(async (req, res) => {
  if (!dbGuard(res)) return;
  const hospital = await Hospital.findByIdAndDelete(req.params.id);
  if (!hospital) {
    return res.status(404).json({ success: false, message: 'Hospital not found' });
  }
  res.json({ success: true, message: 'Hospital deleted' });
});

module.exports = {
  listAppointments,
  updateAppointmentStatus,
  listUsers,
  setUserActive,
  createHospital,
  updateHospital,
  deleteHospital,
};
