// ... existing code ...
// Lettura pubblica: lista card aperta a tutti
router.get('/cards', async (_req, res) => {
  try {
    const cards = await db.cards.findMany({ orderBy: { created_at: 'desc' } });
    res.json(cards);
  } catch (e) {
    res.status(500).json({ error: 'failed_to_list_cards' });
  }
});

// Lettura singola: pubblica per tutti
function isAdmin(user: any) { return user?.role === 'admin'; }
router.get('/cards/:id', async (req, res) => {
  const card = await db.cards.findUnique({ where: { id: req.params.id } });
  if (!card) return res.status(404).end();
  res.json(card);
});

// Middleware scrittura riservata (owner/admin)
async function requireOwnerOrAdmin(req: any, res: any, next: any) {
  const user = req.user; if (!user) return res.status(401).end();
  if (isAdmin(user)) return next();
  const id = req.params.id;
  const card = id ? await db.cards.findUnique({ where: { id } }) : null;
  if ((card && card.owner_id === user.id) || (!card && req.body?.owner_id === user.id)) return next();
  return res.status(403).end();
}

router.post('/cards', requireOwnerOrAdmin, async (req, res) => {
  const created = await db.cards.create({ data: req.body });
  res.json(created);
});
router.put('/cards/:id', requireOwnerOrAdmin, async (req, res) => {
  const updated = await db.cards.update({ where: { id: req.params.id }, data: req.body });
  res.json(updated);
});
router.delete('/cards/:id', requireOwnerOrAdmin, async (req, res) => {
  await db.cards.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
// ... existing code ...