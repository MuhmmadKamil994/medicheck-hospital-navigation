const mongoose = require('mongoose');

// SDD 3.12.4 — Appointment Collection
// Lifecycle: pending -> confirmed -> (reminderSent) -> completed
//                      \-> cancelled (by patient or admin)
const appointmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'userId is required'],
    index: true,
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: [true, 'hospitalId is required'],
    index: true,
  },
  appointmentDate: {
    type: Date,
    required: [true, 'Appointment date is required'],
    validate: {
      // Compare against start of today so same-day bookings are allowed
      validator: function (d) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return d >= today;
      },
      message: 'Appointment date must not be in the past',
    },
  },
  // 24-hour format HH:MM, e.g. "10:30", "16:00"
  appointmentTime: {
    type: String,
    required: [true, 'Appointment time is required'],
    match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:MM 24-hour format'],
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'confirmed', 'cancelled'],
      message: 'status must be pending, confirmed or cancelled',
    },
    default: 'pending',
  },
  reminderSent: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Fast lookups for "my upcoming appointments" and "hospital's schedule"
appointmentSchema.index({ userId: 1, appointmentDate: 1 });
appointmentSchema.index({ hospitalId: 1, appointmentDate: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
