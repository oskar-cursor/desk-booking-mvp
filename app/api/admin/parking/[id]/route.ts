import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { z } from "zod";

const patchSpotSchema = z.object({
  code: z.string().min(1).max(10).optional(),
  name: z.string().min(1).optional(),
  active: z.boolean().optional(),
});

// PATCH /api/admin/parking/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const spot = await prisma.parkingSpot.findUnique({ where: { id } });
  if (!spot) {
    return NextResponse.json({ error: "Miejsce parkingowe nie znalezione" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = patchSpotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowe dane", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.code && parsed.data.code !== spot.code) {
    const existing = await prisma.parkingSpot.findUnique({
      where: { code: parsed.data.code },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Miejsce parkingowe o kodzie "${parsed.data.code}" już istnieje` },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.parkingSpot.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

// DELETE /api/admin/parking/:id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const spot = await prisma.parkingSpot.findUnique({ where: { id } });
  if (!spot) {
    return NextResponse.json({ error: "Miejsce parkingowe nie znalezione" }, { status: 404 });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const futureReservations = await prisma.parkingReservation.count({
    where: { spotId: id, date: { gte: today } },
  });

  if (futureReservations > 0) {
    return NextResponse.json(
      {
        error: `Miejsce parkingowe ma ${futureReservations} przyszłych rezerwacji. Dezaktywuj je najpierw lub anuluj rezerwacje.`,
      },
      { status: 409 }
    );
  }

  await prisma.$transaction([
    prisma.parkingReservation.deleteMany({ where: { spotId: id } }),
    prisma.parkingSpot.delete({ where: { id } }),
  ]);

  return NextResponse.json({ success: true });
}
