import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { z } from "zod";

const checkBulkSchema = z.object({
  dates: z
    .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .min(1)
    .max(62),
});

// POST /api/reservations/check-bulk
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = checkBulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowe dane" },
      { status: 400 }
    );
  }

  const dateObjects = parsed.data.dates.map((d) => new Date(d + "T00:00:00.000Z"));

  const [deskReservations, parkingReservations] = await Promise.all([
    prisma.reservation.findMany({
      where: { userId: session.user.id, date: { in: dateObjects } },
      include: { desk: { select: { code: true } } },
    }),
    prisma.parkingReservation.findMany({
      where: { userId: session.user.id, date: { in: dateObjects } },
      include: { spot: { select: { code: true } } },
    }),
  ]);

  // Group by date
  const byDate = new Map<string, { deskCode: string | null; parkingCode: string | null }>();

  for (const r of deskReservations) {
    const dateKey = r.date.toISOString().slice(0, 10);
    const entry = byDate.get(dateKey) ?? { deskCode: null, parkingCode: null };
    entry.deskCode = r.desk.code;
    byDate.set(dateKey, entry);
  }

  for (const r of parkingReservations) {
    const dateKey = r.date.toISOString().slice(0, 10);
    const entry = byDate.get(dateKey) ?? { deskCode: null, parkingCode: null };
    entry.parkingCode = r.spot.code;
    byDate.set(dateKey, entry);
  }

  const reservations = Array.from(byDate.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({ reservations });
}
