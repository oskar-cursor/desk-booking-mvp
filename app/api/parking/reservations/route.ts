import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { createParkingReservationSchema } from "@/lib/validations";

// POST /api/parking/reservations — rezerwacja miejsca parkingowego
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createParkingReservationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowe dane", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { spotId, date: dateStr } = parsed.data;
  const date = new Date(dateStr + "T00:00:00.000Z");

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
      { error: "Aby zarezerwować parking, ustaw tryb pracy na OFFICE na ten dzień" },
      { status: 403 }
    );
  }

  // Transakcja: sprawdź ograniczenia i utwórz rezerwację atomowo
  try {
    const reservation = await prisma.$transaction(async (tx) => {
      // Sprawdź czy miejsce istnieje i jest aktywne
      const spot = await tx.parkingSpot.findUnique({ where: { id: spotId } });
      if (!spot || !spot.active) {
        throw { httpStatus: 404, message: "Miejsce parkingowe nie istnieje lub jest nieaktywne" };
      }

      // Sprawdź czy użytkownik nie ma już rezerwacji parkingu na ten dzień
      const existingUserReservation = await tx.parkingReservation.findUnique({
        where: { userId_date: { userId: session.user.id, date } },
      });
      if (existingUserReservation) {
        throw { httpStatus: 409, message: "Masz już rezerwację parkingu na ten dzień" };
      }

      // Sprawdź czy miejsce nie jest już zajęte na ten dzień
      const existingSpotReservation = await tx.parkingReservation.findUnique({
        where: { spotId_date: { spotId, date } },
      });
      if (existingSpotReservation) {
        throw { httpStatus: 409, message: "To miejsce jest już zajęte. Wybierz inne." };
      }

      return tx.parkingReservation.create({
        data: {
          userId: session.user.id,
          spotId,
          date,
        },
        include: {
          spot: { select: { code: true, name: true } },
        },
      });
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (error: unknown) {
    // Obsłuż nasze rzucone błędy biznesowe
    if (error && typeof error === "object" && "httpStatus" in error && "message" in error) {
      const e = error as { httpStatus: number; message: string };
      return NextResponse.json({ error: e.message }, { status: e.httpStatus });
    }
    throw error;
  }
}
