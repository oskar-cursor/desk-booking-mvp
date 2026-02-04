import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// GET /api/reservations/mine — moje rezerwacje
export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reservations = await prisma.reservation.findMany({
    where: { userId: session.user.id },
    include: {
      desk: { select: { code: true, name: true, locationLabel: true } },
    },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(reservations);
}
