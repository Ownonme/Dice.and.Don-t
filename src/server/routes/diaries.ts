// ... existing code ...
function canReadDiary(user: any, diary: any) {
  return diary.is_public === true || (user && (user.id === diary.owner_id || user.role === 'admin'));
}

router.get('/diaries/:id', async (req, res) => {
  const diary = await db.diaries.findById(req.params.id);
  if (!diary) return res.status(404).end();
  if (!canReadDiary(req.user, diary)) return res.status(403).end();
  res.json(diary);
});

router.get('/diaries', async (req, res) => {
  const user = req.user;
  const where = user
    ? { OR: [{ is_public: true }, { owner_id: user.id }] }
    : { is_public: true };
  const items = await db.diaries.findMany({ where });
  res.json(items);
});
// ... existing code ...