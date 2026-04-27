const express = require('express');
const Folder = require('../models/Folder');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/folders
router.get('/', async (req, res) => {
  const folders = await Folder.find({ userId: req.userId }).lean();
  res.json(folders);
});

// POST /api/folders
router.post('/', async (req, res) => {
  const folder = await Folder.create({ ...req.body, userId: req.userId });
  res.status(201).json(folder);
});

// POST /api/folders/bulk
router.post('/bulk', async (req, res) => {
  const folders = req.body;
  if (!Array.isArray(folders)) {
    return res.status(400).json({ message: 'Expected an array of folders' });
  }

  const ops = folders.map((f) => ({
    updateOne: {
      filter: { userId: req.userId, localId: f.localId || f.id },
      update: { $set: { ...f, userId: req.userId, localId: f.localId || f.id } },
      upsert: true,
    },
  }));

  const result = await Folder.bulkWrite(ops);

  // Sync state: Delete folders that were removed on the client
  const currentIds = folders.map(f => f.localId || f.id);
  if (currentIds.length > 0) {
    await Folder.deleteMany({ userId: req.userId, localId: { $nin: currentIds } });
  }

  res.json({ upserted: result.upsertedCount, modified: result.modifiedCount });
});

// PUT /api/folders/:localId
router.put('/:localId', async (req, res) => {
  const folder = await Folder.findOneAndUpdate(
    { userId: req.userId, localId: req.params.localId },
    { $set: req.body },
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
