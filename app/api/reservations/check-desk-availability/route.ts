import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { z } from "zod";

const checkSchema = z.object({
  deskId: z.string().min(1),
  dates: z
    .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .min(1)
    .max(31),
});

// POST /api/reservations/check-desk-availability
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = checkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowe dane", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { deskId, dates } = parsed.data;

  const desk = await prisma.desk.findUnique({
    where: { id: deskId },
    select: { code: true },
  });
  if (!desk) {
    return NextResponse.json({ error: "Biurko nie istnieje" }, { status: 404 });
  }

  const dateObjects = dates.map((d) => new Date(d + "T00:00:00.000Z"));
  const reservations = await prisma.reservation.findMany({
    where: { deskId, date: { in: dateObjects } },
    include: { user: { select: { name: true } } },
  });

  const reservedMap = new Map(
    reservations.map((r) => [
      r.date.toISOString().slice(0, 10),
      r.user.name,
    ])
  );

  const availability: Record<string, { available: boolean; reservedBy?: string }> = {};
  for (const dateStr of dates) {
    const reservedBy = reservedMap.get(dateStr);
    if (reservedBy) {
      availability[dateStr] = { available: false, reservedBy };
    } else {
      availability[dateStr] = { available: true };
    }
  }

  return NextResponse.json({
    deskCode: desk.code,
    availability,
  });
}
