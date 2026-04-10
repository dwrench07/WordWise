const mongoose = require('mongoose');

const fsrsStateSchema = new mongoose.Schema(
  {
    due: { type: Date, default: null },
    stability: { type: Number, default: 0 },
    difficulty: { type: Number, default: 0 },
    elapsed_days: { type: Number, default: 0 },
    scheduled_days: { type: Number, default: 0 },
    reps: { type: Number, default: 0 },
    lapses: { type: Number, default: 0 },
    state: { type: Number, default: 0 }, // 0=New 1=Learning 2=Review 3=Relearning
    last_review: { type: Date, default: null },
  },
  { _id: false }
);

const cardSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    localId: { type: String, required: true }, // original client-side id
    front: { type: String, required: true },
    back: { type: [String], default: [] },
    example: { type: [String], default: [] },
    note: { type: String, default: '' },
    deck: { type: String, default: '' },
    folderId: { type: String, default: null }, // references Folder.localId
    tags: { type: [String], default: [] },
    liked: { type: Boolean, default: false },
    revisit: { type: Boolean, default: false },

    // SRS fields
    fsrs: { type: fsrsStateSchema, default: () => ({}) },
    repetition: { type: Number, default: 0 },
    interval: { type: Number, default: 0 },
    efactor: { type: Number, default: 2.5 },
    nextReview: { type: Number, default: 0 },
    pass: { type: Number, default: 0 },
    fail: { type: Number, default: 0 },

    created: { type: Number, default: () => Date.now() },
  },
  { timestamps: true }
);

cardSchema.index({ userId: 1, localId: 1 }, { unique: true });
cardSchema.index({ userId: 1, folderId: 1 });
cardSchema.index({ userId: 1, tags: 1 });

module.exports = mongoose.model('Card', cardSchema);
