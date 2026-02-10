import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { dateQuerySchema } from "@/lib/validations";

// GET /api/reservations/my-daily?date=YYYY-MM-DD
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

  const [deskReservation, parkingReservation] = await Promise.all([
    prisma.reservation.findUnique({
      where: { userId_date: { userId: session.user.id, date } },
      include: { desk: { select: { code: true } } },
    }),
    prisma.parkingReservation.findUnique({
      where: { userId_date: { userId: session.user.id, date } },
      include: { spot: { select: { code: true } } },
    }),
  ]);

  return NextResponse.json({
    desk: deskReservation ? { id: deskReservation.id, code: deskReservation.desk.code } : null,
    parking: parkingReservation ? { id: parkingReservation.id, code: parkingReservation.spot.code } : null,
  });
}

// DELETE /api/reservations/my-daily?date=YYYY-MM-DD
export async function DELETE(request: NextRequest) {
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

  const result = await prisma.$transaction(async (tx) => {
    const deskReservation = await tx.reservation.findUnique({
      where: { userId_date: { userId: session.user.id, date } },
      include: { desk: { select: { code: true } } },
    });

    const parkingReservation = await tx.parkingReservation.findUnique({
      where: { userId_date: { userId: session.user.id, date } },
      include: { spot: { select: { code: true } } },
    });

    const deletedDesks: string[] = [];
    const deletedParking: string[] = [];

    if (deskReservation) {
      await tx.reservation.delete({ where: { id: deskReservation.id } });
      deletedDesks.push(deskReservation.desk.code);
    }

    if (parkingReservation) {
      await tx.parkingReservation.delete({ where: { id: parkingReservation.id } });
      deletedParking.push(parkingReservation.spot.code);
    }

    return { deletedDesks, deletedParking };
  });

  return NextResponse.json(result);
}
