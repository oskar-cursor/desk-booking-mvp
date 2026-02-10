import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { createReservationSchema } from "@/lib/validations";

// POST /api/reservations — tworzy rezerwację
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createReservationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowe dane", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { deskId, date: dateStr } = parsed.data;
  const date = new Date(dateStr + "T00:00:00.000Z");

  // Sprawdź czy biurko istnieje i jest aktywne
  const desk = await prisma.desk.findUnique({ where: { id: deskId } });
  if (!desk || !desk.active) {
    return NextResponse.json({ error: "Biurko nie istnieje lub jest nieaktywne" }, { status: 404 });
  }

  // Sprawdź czy data nie jest w przeszłości
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) {
    return NextResponse.json({ error: "Nie można rezerwować w przeszłości" }, { status: 400 });
  }

  // Sprawdź czy użytkownik ma ustawiony tryb OFFICE na ten dzień
  const presence = await prisma.presence.findUnique({
    where: { userId_date: { userId: session.user.id, date } },
  });
  if (!presence || presence.mode !== "OFFICE") {
    return NextResponse.json(
      { error: "Aby zarezerwować biurko, ustaw tryb pracy na OFFICE na ten dzień" },
      { status: 403 }
    );
  }

  try {
    const reservation = await prisma.reservation.create({
      data: {
        userId: session.user.id,
        deskId,
        date,
      },
      include: {
        desk: { select: { code: true, name: true } },
      },
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (error: unknown) {
    // Prisma unique constraint violation
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      const target = (error as { meta?: { target?: string[] } }).meta?.target;
      if (target?.includes("deskId")) {
        return NextResponse.json(
          { error: "To biurko jest już zarezerwowane na ten dzień" },
          { status: 409 }
        );
      }
      if (target?.includes("userId")) {
        return NextResponse.json(
          { error: "Masz już rezerwację na ten dzień" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Konflikt rezerwacji" },
        { status: 409 }
      );
    }
    throw error;
  }
}
