import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { dateQuerySchema } from "@/lib/validations";
import { CANONICAL_DESK_CODES } from "@/lib/desks";

// GET /api/office?date=YYYY-MM-DD
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

  const [reservations, capacity] = await Promise.all([
    prisma.reservation.findMany({
      where: { date },
      include: {
        desk: { select: { code: true } },
        user: { select: { name: true } },
      },
      orderBy: { desk: { code: "asc" } },
    }),
    prisma.desk.count({ where: { active: true, code: { in: [...CANONICAL_DESK_CODES] } } }),
  ]);

  return NextResponse.json({
    date: parsed.data.date,
    reservedCount: reservations.length,
    capacity,
    people: reservations.map((r) => ({
      deskCode: r.desk.code,
      userName: r.user.name,
    })),
  });
}
