import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { dateQuerySchema } from "@/lib/validations";

// GET /api/desks?date=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");

  const parsed = dateQuerySchema.safeParse({ date: dateParam });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Wymagany parametr date w formacie YYYY-MM-DD" },
      { status: 400 }
    );
  }

  const date = new Date(parsed.data.date + "T00:00:00.000Z");

  const desks = await prisma.desk.findMany({
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
  const result = desks.map((desk: any) => {
    const reservation = desk.reservations[0] || null;
    return {
      id: desk.id,
      code: desk.code,
      name: desk.name,
      locationLabel: desk.locationLabel,
      isReserved: !!reservation,
      isMine: reservation?.user.id === session.user.id,
      reservedBy: reservation ? reservation.user.name : null,
      reservationId: reservation?.id || null,
    };
  });

  return NextResponse.json(result);
}
