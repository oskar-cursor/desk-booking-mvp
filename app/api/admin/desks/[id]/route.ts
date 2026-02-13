import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { z } from "zod";

const patchDeskSchema = z.object({
  code: z.string().min(1).max(10).optional(),
  name: z.string().min(1).optional(),
  locationLabel: z.string().min(1).optional(),
  active: z.boolean().optional(),
});

// PATCH /api/admin/desks/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const desk = await prisma.desk.findUnique({ where: { id } });
  if (!desk) {
    return NextResponse.json({ error: "Biurko nie znalezione" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = patchDeskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowe dane", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.code && parsed.data.code !== desk.code) {
    const existing = await prisma.desk.findUnique({
      where: { code: parsed.data.code },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Biurko o kodzie "${parsed.data.code}" już istnieje` },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.desk.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

// DELETE /api/admin/desks/:id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const desk = await prisma.desk.findUnique({ where: { id } });
  if (!desk) {
    return NextResponse.json({ error: "Biurko nie znalezione" }, { status: 404 });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const futureReservations = await prisma.reservation.count({
    where: { deskId: id, date: { gte: today } },
  });

  if (futureReservations > 0) {
    return NextResponse.json(
      {
        error: `Biurko ma ${futureReservations} przyszłych rezerwacji. Dezaktywuj je najpierw lub anuluj rezerwacje.`,
      },
      { status: 409 }
    );
  }

  await prisma.$transaction([
    prisma.reservation.deleteMany({ where: { deskId: id } }),
    prisma.desk.delete({ where: { id } }),
  ]);

  return NextResponse.json({ success: true });
}
