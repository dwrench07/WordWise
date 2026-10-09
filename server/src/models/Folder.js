const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    localId: { type: String, required: true }, // original client-side id
    name: { type: String, required: true },
    parentId: { type: String, default: null }, // references another folder's localId
    color: { type: String, default: null },
    sort: { type: String, default: 'custom' },
    // Client-side presentation/state that must survive a cloud round-trip.
    icon: { type: String, default: null },
    expanded: { type: Boolean, default: true },
    created: { type: Number, default: () => Date.now() },
  },
  { timestamps: true }
);

// Unique folder name per user (scoped to same parent)
folderSchema.index({ userId: 1, localId: 1 }, { unique: true });

module.exports = mongoose.model('Folder', folderSchema);
