import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { z } from "zod";

const deleteSchema = z.object({
  type: z.enum(["desk", "parking"]),
});

// DELETE /api/admin/reservations/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const body = await request.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nieprawidłowe dane" }, { status: 400 });
  }

  if (parsed.data.type === "desk") {
    const reservation = await prisma.reservation.findUnique({ where: { id } });
    if (!reservation) {
      return NextResponse.json({ error: "Rezerwacja nie znaleziona" }, { status: 404 });
    }
    await prisma.reservation.delete({ where: { id } });
  } else {
    const reservation = await prisma.parkingReservation.findUnique({ where: { id } });
    if (!reservation) {
      return NextResponse.json({ error: "Rezerwacja nie znaleziona" }, { status: 404 });
    }
    await prisma.parkingReservation.delete({ where: { id } });
  }

  return NextResponse.json({ deleted: true });
}
