import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/user/favorite-desk/availability?date=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: "Nie jesteś zalogowany" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const dateStr = new URL(request.url).searchParams.get("date");
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: "Podaj datę w formacie YYYY-MM-DD" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      favoriteDesk: {
        select: { id: true, code: true, locationLabel: true, active: true },
      },
    },
  });

  if (!user?.favoriteDesk || !user.favoriteDesk.active) {
    return NextResponse.json({ hasFavorite: false });
  }

  const date = new Date(dateStr + "T00:00:00.000Z");

  const reservation = await prisma.reservation.findUnique({
    where: {
      deskId_date: { deskId: user.favoriteDesk.id, date },
    },
    include: {
      user: { select: { name: true } },
    },
  });

  return NextResponse.json({
    hasFavorite: true,
    deskId: user.favoriteDesk.id,
    deskCode: user.favoriteDesk.code,
    deskRoom: user.favoriteDesk.locationLabel,
    isAvailable: !reservation,
    reservedBy: reservation?.user.name ?? null,
  });
}
