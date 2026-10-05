const mongoose = require('mongoose');

// SDD 3.12.2 — SymptomRecord Collection
// One document per symptom-check session. userId references Users.
const symptomRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'userId is required'],
    index: true,
  },
  symptomsEntered: {
    type: [String],
    validate: {
      validator: (arr) => arr.length <= 20,
      message: 'Cannot enter more than 20 symptoms',
    },
  },
  geminiResponse: {
    type: String,
    maxlength: [2000, 'Gemini response cannot exceed 2000 characters'],
  },
  urgencyLevel: {
    type: String,
    required: [true, 'urgencyLevel is required'],
    enum: {
      values: ['emergency', 'semi-urgent', 'routine'],
      message: 'urgencyLevel must be emergency, semi-urgent or routine',
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Fast "my history" lookups, newest first
symptomRecordSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('SymptomRecord', symptomRecordSchema);
