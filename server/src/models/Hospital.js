const mongoose = require('mongoose');

// SDD 3.12.3 — Hospital Collection
// Location is stored as a GeoJSON Point [longitude, latitude] so the
// 2dsphere index can answer "hospitals near me" queries efficiently.
const hospitalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Hospital name is required'],
    trim: true,
    maxlength: [200, 'Name cannot exceed 200 characters'],
  },
  address: {
    type: String,
    trim: true,
    maxlength: [300, 'Address cannot exceed 300 characters'],
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    // [longitude, latitude] — NOTE: GeoJSON order is lng FIRST
    coordinates: {
      type: [Number],
      required: [true, 'Coordinates are required'],
      validate: {
        validator: (c) =>
          c.length === 2 && c[0] >= -180 && c[0] <= 180 && c[1] >= -90 && c[1] <= 90,
        message: 'Coordinates must be [longitude, latitude] in valid ranges',
      },
    },
  },
  specializations: {
    type: [String],
    default: [],
  },
  operatingHours: {
    type: String,
    trim: true,
  },
  insuranceAccepted: {
    type: [String],
    default: [],
  },
  availabilityStatus: {
    type: Boolean,
    default: true,
  },
  contactNumber: {
    type: String,
    trim: true,
    maxlength: [15, 'Contact number cannot exceed 15 characters'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Geospatial index — powers "within X km" map queries
hospitalSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Hospital', hospitalSchema);
