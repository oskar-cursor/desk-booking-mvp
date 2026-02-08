import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// GET /api/parking/reservations/mine — moje rezerwacje parkingowe
export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reservations = await prisma.parkingReservation.findMany({
    where: { userId: session.user.id },
    include: {
      spot: { select: { code: true, name: true } },
    },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(reservations);
}
