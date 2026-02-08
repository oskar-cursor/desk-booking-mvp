import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { dateQuerySchema } from "@/lib/validations";

// GET /api/parking?date=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = dateQuerySchema.safeParse({ date: searchParams.get("date") });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Wymagany parametr date w formacie YYYY-MM-DD" },
      { status: 400 }
    );
  }

  const date = new Date(parsed.data.date + "T00:00:00.000Z");

  const spots = await prisma.parkingSpot.findMany({
    where: { active: true },
    orderBy: { code: "asc" },
    include: {
      reservations: {
        where: { date },
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = spots.map((spot: any) => {
    const reservation = spot.reservations[0] || null;
    return {
      id: spot.id,
      code: spot.code,
      name: spot.name,
      isReserved: !!reservation,
      isMine: reservation?.user.id === session.user.id,
      reservedBy: reservation ? reservation.user.name : null,
      reservationId: reservation?.id || null,
    };
  });

  return NextResponse.json(result);
}
