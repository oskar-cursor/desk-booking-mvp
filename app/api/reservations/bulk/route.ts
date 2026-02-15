import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { z } from "zod";

const bulkReservationSchema = z.object({
  deskId: z.string().min(1),
  dates: z
    .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .min(1)
    .max(31),
});

// POST /api/reservations/bulk
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = bulkReservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowe dane", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { deskId, dates } = parsed.data;
  const userId = session.user.id;

  // Validate desk exists and is active
  const desk = await prisma.desk.findUnique({ where: { id: deskId } });
  if (!desk || !desk.active) {
    return NextResponse.json(
      { error: "Biurko nie istnieje lub jest nieaktywne" },
      { status: 404 }
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  // Validate: no past dates, no weekends
  for (const dateStr of dates) {
    if (dateStr < today) {
      return NextResponse.json(
        { error: `Data ${dateStr} jest w przeszłości` },
        { status: 400 }
      );
    }
    const d = new Date(dateStr + "T00:00:00.000Z");
    const day = d.getUTCDay();
    if (day === 0 || day === 6) {
      return NextResponse.json(
        { error: `Data ${dateStr} wypada w weekend` },
        { status: 400 }
      );
    }
  }

  // Fetch user's presences for these dates
  const dateObjects = dates.map((d) => new Date(d + "T00:00:00.000Z"));
  const presences = await prisma.presence.findMany({
    where: { userId, date: { in: dateObjects } },
  });
  const presenceMap = new Map(
    presences.map((p) => [p.date.toISOString().slice(0, 10), p.mode])
  );

  // Fetch user's existing desk reservations for these dates
  const existingUserReservations = await prisma.reservation.findMany({
    where: { userId, date: { in: dateObjects } },
  });
  const userReservedDates = new Set(
    existingUserReservations.map((r) => r.date.toISOString().slice(0, 10))
  );

  // Fetch existing reservations for this desk on these dates
  const deskReservations = await prisma.reservation.findMany({
    where: { deskId, date: { in: dateObjects } },
    include: { user: { select: { name: true } } },
  });
  const deskReservedMap = new Map(
    deskReservations.map((r) => [
      r.date.toISOString().slice(0, 10),
      r.user.name,
    ])
  );

  const toCreate: string[] = [];
  const failed: Array<{ date: string; reason: string }> = [];
  const skipped: Array<{ date: string; reason: string }> = [];

  for (const dateStr of dates.sort()) {
    // Check presence is OFFICE
    if (presenceMap.get(dateStr) !== "OFFICE") {
      skipped.push({ date: dateStr, reason: "Brak trybu OFFICE" });
      continue;
    }

    // Check user doesn't already have a desk reservation
    if (userReservedDates.has(dateStr)) {
      skipped.push({ date: dateStr, reason: "Masz już rezerwację biurka na ten dzień" });
      continue;
    }

    // Check desk is free
    const occupiedBy = deskReservedMap.get(dateStr);
    if (occupiedBy) {
      failed.push({ date: dateStr, reason: `Biurko zajęte przez ${occupiedBy}` });
      continue;
    }

    toCreate.push(dateStr);
  }

  // Create reservations in transaction
  if (toCreate.length > 0) {
    await prisma.$transaction(
      toCreate.map((dateStr) =>
        prisma.reservation.create({
          data: {
            userId,
            deskId,
            date: new Date(dateStr + "T00:00:00.000Z"),
          },
        })
      )
    );
  }

  return NextResponse.json({
    created: toCreate,
    failed,
    skipped,
  });
}
