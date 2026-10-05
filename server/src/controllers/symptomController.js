const SymptomRecord = require('../models/SymptomRecord');
const dbGuard = require('../utils/dbGuard');
const asyncHandler = require('../utils/asyncHandler');
const geminiService = require('../services/geminiService');

// POST /api/symptoms/analyze  (OPTIONAL auth — guests welcome)
// Validates input -> Gemini triage ->
//   guest (no/invalid token): returns the triage result, saves NOTHING
//   logged-in user: saves a SymptomRecord, returns 201 with recordId.
// Guests need no database at all, so dbGuard only gates the save path.
// Any Gemini failure becomes 502 "Analysis temporarily unavailable, please
// try again" via GeminiError.statusCode (see services/geminiService.js).
const analyze = asyncHandler(async (req, res) => {
  const { symptoms, severity, duration } = req.body;

  const result = await geminiService.analyzeSymptoms(symptoms, severity, duration);

  if (req.isGuest || !req.user) {
    return res.status(200).json({
      success: true,
      guest: true,
      urgencyLevel: result.urgencyLevel,
      conditionDescription: result.conditionDescription,
      disclaimer: result.disclaimer,
    });
  }

  if (!dbGuard(res)) return;
  const record = await SymptomRecord.create({
    userId: req.user.id,
    symptomsEntered: symptoms,
    geminiResponse: result.conditionDescription,
    urgencyLevel: result.urgencyLevel,
  });

  res.status(201).json({
    success: true,
    recordId: record._id,
    urgencyLevel: result.urgencyLevel,
    conditionDescription: result.conditionDescription,
    disclaimer: result.disclaimer,
  });
});

// GET /api/symptoms/history  (JWT protected)
// The user's own symptom checks, newest first.
const history = asyncHandler(async (req, res) => {
  if (!dbGuard(res)) return;
  const records = await SymptomRecord.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .lean();
  res.json({
    success: true,
    count: records.length,
    records: records.map((r) => ({
      recordId: r._id,
      symptomsEntered: r.symptomsEntered,
      urgencyLevel: r.urgencyLevel,
      conditionDescription: r.geminiResponse,
      createdAt: r.createdAt,
    })),
  });
});

// DELETE /api/symptoms/:id  (JWT protected)
// Deletes only the caller's own record; anything else is 404 (we never
// reveal whether another user's record id exists).
const remove = asyncHandler(async (req, res) => {
  if (!dbGuard(res)) return;
  const deleted = await SymptomRecord.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.id,
  });
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Symptom record not found' });
  }
  res.json({ success: true, message: 'Symptom record deleted' });
});

module.exports = { analyze, history, remove };
