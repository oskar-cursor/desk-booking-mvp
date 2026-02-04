import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// DELETE /api/reservations/:id — anuluj rezerwację
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Rezerwacja nie istnieje" }, { status: 404 });
  }

  // Tylko właściciel lub admin może anulować
  if (reservation.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  await prisma.reservation.delete({ where: { id } });

  return NextResponse.json({ message: "Rezerwacja anulowana" });
}
