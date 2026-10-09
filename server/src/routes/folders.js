const express = require('express');
const Folder = require('../models/Folder');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// Whitelist of client-writable fields (no userId/_id/timestamps from the body).
const FOLDER_FIELDS = ['localId', 'name', 'parentId', 'color', 'sort', 'icon', 'expanded', 'created'];
const pickFolder = (body = {}) => {
  const out = {};
  for (const k of FOLDER_FIELDS) if (body[k] !== undefined) out[k] = body[k];
  return out;
};

// GET /api/folders — live (non-tombstoned) folders
router.get('/', async (req, res) => {
  const folders = await Folder.find({ userId: req.userId, deleted: { $ne: true } }).lean();
  res.json(folders);
});

// GET /api/folders/deleted — localIds of tombstoned folders
router.get('/deleted', async (req, res) => {
  const ids = await Folder.find({ userId: req.userId, deleted: true }).distinct('localId');
  res.json({ deletedIds: ids });
});

// POST /api/folders
router.post('/', async (req, res) => {
  const folder = await Folder.create({ ...pickFolder(req.body), userId: req.userId });
  res.status(201).json(folder);
});

// POST /api/folders/bulk
router.post('/bulk', async (req, res) => {
  const folders = req.body;
  if (!Array.isArray(folders)) {
    return res.status(400).json({ message: 'Expected an array of folders' });
  }

  const ops = folders.map((f) => {
    const localId = f.localId || f.id;
    return {
      updateOne: {
        filter: { userId: req.userId, localId },
        update: { $set: { ...pickFolder(f), userId: req.userId, localId } },
        upsert: true,
      },
    };
  });

  const result = ops.length ? await Folder.bulkWrite(ops) : { upsertedCount: 0, modifiedCount: 0 };

  // No prune here: folder deletions are handled by explicit soft-delete
  // (DELETE /:localId) + tombstone reconciliation on the client, same as cards.
  // Prune-on-bulk let a stale client re-create folders deleted elsewhere.
  res.json({ upserted: result.upsertedCount, modified: result.modifiedCount });
});

// PUT /api/folders/:localId
router.put('/:localId', async (req, res) => {
  const update = pickFolder(req.body);
  delete update.localId; // never reassign the key we matched on
  const folder = await Folder.findOneAndUpdate(
    { userId: req.userId, localId: req.params.localId },
    { $set: update },
    { new: true }
  );
  if (!folder) return res.status(404).json({ message: 'Folder not found' });
  res.json(folder);
});

// DELETE /api/folders/:localId — soft delete (tombstone)
router.delete('/:localId', async (req, res) => {
  await Folder.updateOne(
    { userId: req.userId, localId: req.params.localId },
    { $set: { deleted: true } }
  );
  res.json({ message: 'Folder deleted' });
});

module.exports = router;
