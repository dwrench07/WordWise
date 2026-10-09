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

// GET /api/folders
router.get('/', async (req, res) => {
  const folders = await Folder.find({ userId: req.userId }).lean();
  res.json(folders);
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

  // Sync state: delete folders removed on the client — but refuse a destructive
  // prune from a stale/partial payload, mirroring the cards route. Only prune
  // when the payload is non-empty and wouldn't wipe more than max(5, 10%).
  const currentIds = folders.map(f => f.localId || f.id);
  if (currentIds.length > 0) {
    const serverCount = await Folder.countDocuments({ userId: req.userId });
    const wouldDelete = serverCount - currentIds.length;
    const safeThreshold = Math.max(5, Math.ceil(serverCount * 0.1));
    if (wouldDelete > safeThreshold) {
      console.warn(`Refusing folder prune for user ${req.userId}: would delete ${wouldDelete} (server=${serverCount}, payload=${currentIds.length})`);
    } else {
      await Folder.deleteMany({ userId: req.userId, localId: { $nin: currentIds } });
    }
  }

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

// DELETE /api/folders/:localId
router.delete('/:localId', async (req, res) => {
  await Folder.findOneAndDelete({ userId: req.userId, localId: req.params.localId });
  res.json({ message: 'Folder deleted' });
});

module.exports = router;
