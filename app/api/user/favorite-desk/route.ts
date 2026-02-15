import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// GET /api/user/favorite-desk
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: "Nie jesteś zalogowany" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      favoriteDesk: {
        select: { id: true, code: true, locationLabel: true },
      },
    },
  });

  if (!user?.favoriteDesk) {
    return NextResponse.json({
      favoriteDeskId: null,
      favoriteDeskCode: null,
      favoriteDeskRoom: null,
    });
  }

  return NextResponse.json({
    favoriteDeskId: user.favoriteDesk.id,
    favoriteDeskCode: user.favoriteDesk.code,
    favoriteDeskRoom: user.favoriteDesk.locationLabel,
  });
}

const putSchema = z.object({
  deskId: z.string().nullable(),
});

// PUT /api/user/favorite-desk
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: "Nie jesteś zalogowany" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nieprawidłowe dane" }, { status: 400 });
  }

  const userId = (session.user as { id: string }).id;
  const { deskId } = parsed.data;

  if (deskId) {
    const desk = await prisma.desk.findUnique({ where: { id: deskId } });
    if (!desk || !desk.active) {
      return NextResponse.json({ error: "Biurko nie istnieje lub jest nieaktywne" }, { status: 404 });
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { favoriteDeskId: deskId },
    include: {
      favoriteDesk: {
        select: { id: true, code: true, locationLabel: true },
      },
    },
  });

  return NextResponse.json({
    favoriteDeskId: updated.favoriteDesk?.id ?? null,
    favoriteDeskCode: updated.favoriteDesk?.code ?? null,
    favoriteDeskRoom: updated.favoriteDesk?.locationLabel ?? null,
  });
}
