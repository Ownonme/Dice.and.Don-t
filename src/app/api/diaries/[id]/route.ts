// ... existing code ...
function canReadDiary(user: any, diary: any) {
  return diary.is_public === true || (user && (user.id === diary.owner_id || user.role === 'admin'));
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const diary = await prisma.diary.findUnique({ where: { id: params.id } });
  if (!diary) return new Response(null, { status: 404 });
  const user = await getUserFromRequest(req); // opzionale
  if (!canReadDiary(user, diary)) return new Response(null, { status: 403 });
  return Response.json(diary);
}