import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { z } from "zod";

const bulkDeleteSchema = z.object({
  dates: z
    .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .min(1)
    .max(62),
});

// DELETE /api/reservations/bulk-daily
export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = bulkDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowe dane" },
      { status: 400 }
    );
  }

  const dateObjects = parsed.data.dates.map((d) => new Date(d + "T00:00:00.000Z"));

  const result = await prisma.$transaction(async (tx) => {
    const deletedDesks = await tx.reservation.deleteMany({
      where: { userId: session.user.id, date: { in: dateObjects } },
    });

    const deletedParking = await tx.parkingReservation.deleteMany({
      where: { userId: session.user.id, date: { in: dateObjects } },
    });

    return {
      deletedDesks: deletedDesks.count,
      deletedParking: deletedParking.count,
    };
  });

  return NextResponse.json(result);
}
