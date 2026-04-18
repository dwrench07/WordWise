const express = require('express');
const Card = require('../models/Card');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/cards — all cards for the logged-in user
router.get('/', async (req, res) => {
  const cards = await Card.find({ userId: req.userId }).lean();
  res.json(cards);
});

// POST /api/cards — create a single card
router.post('/', async (req, res) => {
  const card = await Card.create({ ...req.body, userId: req.userId });
  res.status(201).json(card);
});

router.post('/bulk', async (req, res) => {
  const cards = req.body; 
  if (!Array.isArray(cards)) {
    return res.status(400).json({ message: 'Expected an array of cards' });
  }

  const ops = cards.map((card) => ({
    updateOne: {
      filter: { userId: req.userId, localId: card.localId || card.id },
      update: { $set: { ...card, userId: req.userId, localId: card.localId || card.id } },
      upsert: true,
    },
  }));

  // Sync state: Delete cards that were removed on the client
  const currentIds = cards.map(c => c.localId || c.id);
  await Card.deleteMany({ userId: req.userId, localId: { $nin: currentIds } });

  res.json({ upserted: result.upsertedCount, modified: result.modifiedCount });
});

// PUT /api/cards/:localId — update a card by its client-side id
router.put('/:localId', async (req, res) => {
  const card = await Card.findOneAndUpdate(
    { userId: req.userId, localId: req.params.localId },
    { $set: req.body },
    { new: true }
  );
  if (!card) return res.status(404).json({ message: 'Card not found' });
  res.json(card);
});

// DELETE /api/cards/:localId
router.delete('/:localId', async (req, res) => {
  await Card.findOneAndDelete({ userId: req.userId, localId: req.params.localId });
  res.json({ message: 'Card deleted' });
});

// DELETE /api/cards — delete all cards for user (used for re-sync)
router.delete('/', async (req, res) => {
  const result = await Card.deleteMany({ userId: req.userId });
  res.json({ deleted: result.deletedCount });
});

module.exports = router;
