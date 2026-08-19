const mongoose = require('mongoose');

// Ported from health-routine.html's `healthQueryConfig` and
// professional-routine.html's `proRoutineQueryConfig` - genuinely identical
// storage shape in both originals (an array of custom query definitions),
// so one collection discriminated by `type` is used rather than two
// duplicate collections. The UI/behavioral differences between the two
// variants (colors, copy, confirm text, date formatting, search-filter
// scope) are real and preserved exactly in the frontend - see
// RoutineTrackerPage.jsx / RoutineHistoryPage.jsx.
const queryConfigItemSchema = new mongoose.Schema(
  {
    // Client-generated originally via Date.now(); kept as a Number here so
    // existing localStorage-exported ids import cleanly (see Phase 2,
    // Section 5 migration strategy) rather than being remapped to ObjectIds.
    queryId: { type: Number, required: true },
    name: { type: String, required: true },
    key: { type: String, required: true },
    type: { type: String, enum: ['number', 'yn', 'select', 'text'], required: true },
    unit: { type: String, default: '' },
    elements: { type: [String], default: [] },
    hasText: { type: Boolean, default: false },
    textPlaceholder: { type: String, default: '' },
    mainPlaceholder: { type: String, default: '' },
  },
  { _id: false }
);

const routineConfigSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    routineType: {
      type: String,
      enum: ['health', 'professional'],
      required: true,
    },
    queries: {
      type: [queryConfigItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

routineConfigSchema.index({ userId: 1, routineType: 1 }, { unique: true });

module.exports = mongoose.model('RoutineConfig', routineConfigSchema);
