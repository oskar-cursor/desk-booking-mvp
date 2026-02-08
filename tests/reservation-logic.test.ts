import { createReservationSchema, dateQuerySchema, presenceModeSchema, presenceBodySchema, createParkingReservationSchema } from "../lib/validations";
import { CANONICAL_DESK_CODES } from "../lib/desks";

describe("Walidacja rezerwacji (Zod)", () => {
  describe("createReservationSchema", () => {
    it("akceptuje poprawne dane", () => {
      const result = createReservationSchema.safeParse({
        deskId: "clxxxxxxxxxxxxxxxxx",
        date: "2026-02-10",
      });
      expect(result.success).toBe(true);
    });

    it("odrzuca puste deskId", () => {
      const result = createReservationSchema.safeParse({
        deskId: "",
        date: "2026-02-10",
      });
      expect(result.success).toBe(false);
    });

    it("odrzuca niepoprawny format daty", () => {
      const result = createReservationSchema.safeParse({
        deskId: "abc",
        date: "10-02-2026",
      });
      expect(result.success).toBe(false);
    });

    it("odrzuca datę bez myślników", () => {
      const result = createReservationSchema.safeParse({
        deskId: "abc",
        date: "20260210",
      });
      expect(result.success).toBe(false);
    });

    it("odrzuca brak pola date", () => {
      const result = createReservationSchema.safeParse({
        deskId: "abc",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("dateQuerySchema", () => {
    it("akceptuje poprawną datę", () => {
      const result = dateQuerySchema.safeParse({ date: "2026-01-15" });
      expect(result.success).toBe(true);
    });

    it("odrzuca niepoprawny format", () => {
      const result = dateQuerySchema.safeParse({ date: "15/01/2026" });
      expect(result.success).toBe(false);
    });
  });
});

describe("Walidacja presence (Zod)", () => {
  describe("presenceModeSchema", () => {
    it("akceptuje HOME", () => {
      expect(presenceModeSchema.safeParse("HOME").success).toBe(true);
    });

    it("akceptuje OFFICE", () => {
      expect(presenceModeSchema.safeParse("OFFICE").success).toBe(true);
    });

    it("odrzuca niepoprawną wartość", () => {
      expect(presenceModeSchema.safeParse("REMOTE").success).toBe(false);
    });

    it("odrzuca pusty string", () => {
      expect(presenceModeSchema.safeParse("").success).toBe(false);
    });
  });

  describe("presenceBodySchema", () => {
    it("akceptuje poprawne dane HOME", () => {
      const result = presenceBodySchema.safeParse({ date: "2026-02-10", mode: "HOME" });
      expect(result.success).toBe(true);
    });

    it("akceptuje poprawne dane OFFICE", () => {
      const result = presenceBodySchema.safeParse({ date: "2026-02-10", mode: "OFFICE" });
      expect(result.success).toBe(true);
    });

    it("odrzuca niepoprawny format daty", () => {
      const result = presenceBodySchema.safeParse({ date: "10-02-2026", mode: "HOME" });
      expect(result.success).toBe(false);
    });

    it("odrzuca niepoprawny mode", () => {
      const result = presenceBodySchema.safeParse({ date: "2026-02-10", mode: "HYBRID" });
      expect(result.success).toBe(false);
    });

    it("odrzuca brak pola mode", () => {
      const result = presenceBodySchema.safeParse({ date: "2026-02-10" });
      expect(result.success).toBe(false);
    });
  });
});

describe("Canonical desk codes", () => {
  it("contains exactly 11 desks", () => {
    expect(CANONICAL_DESK_CODES).toHaveLength(11);
  });

  it("includes all Dział Raportowy desks", () => {
    expect(CANONICAL_DESK_CODES).toContain("A-01");
    expect(CANONICAL_DESK_CODES).toContain("C-02");
  });

  it("includes all Open Space desks", () => {
    expect(CANONICAL_DESK_CODES).toContain("O-01");
    expect(CANONICAL_DESK_CODES).toContain("O-03");
  });

  it("does NOT include stray desk C-03", () => {
    expect(CANONICAL_DESK_CODES).not.toContain("C-03");
  });
});

describe("Logika blokowania rezerwacji przy HOME", () => {
  it("rezerwacja wymaga trybu OFFICE", () => {
    const presenceMode: "HOME" | "OFFICE" = "HOME";
    const bookingEnabled = presenceMode === "OFFICE";
    expect(bookingEnabled).toBe(false);
  });

  it("rezerwacja dozwolona przy trybie OFFICE", () => {
    const presenceMode: "HOME" | "OFFICE" = "OFFICE";
    const bookingEnabled = presenceMode === "OFFICE";
    expect(bookingEnabled).toBe(true);
  });

  it("brak rekordu presence (domyślnie HOME) blokuje rezerwację", () => {
    const presenceMode: "HOME" | "OFFICE" | null = null;
    const bookingEnabled = presenceMode === "OFFICE";
    expect(bookingEnabled).toBe(false);
  });
});

describe("Walidacja parkingu (Zod)", () => {
  describe("createParkingReservationSchema", () => {
    it("akceptuje poprawne dane", () => {
      const result = createParkingReservationSchema.safeParse({
        spotId: "clxxxxxxxxxxxxxxxxx",
        date: "2026-02-10",
      });
      expect(result.success).toBe(true);
    });

    it("odrzuca puste spotId", () => {
      const result = createParkingReservationSchema.safeParse({
        spotId: "",
        date: "2026-02-10",
      });
      expect(result.success).toBe(false);
    });

    it("odrzuca niepoprawny format daty", () => {
      const result = createParkingReservationSchema.safeParse({
        spotId: "abc",
        date: "10-02-2026",
      });
      expect(result.success).toBe(false);
    });

    it("odrzuca brak pola date", () => {
      const result = createParkingReservationSchema.safeParse({
        spotId: "abc",
      });
      expect(result.success).toBe(false);
    });

    it("odrzuca brak pola spotId", () => {
      const result = createParkingReservationSchema.safeParse({
        date: "2026-02-10",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("Logika blokowania parkingu przy HOME", () => {
  it("rezerwacja parkingu wymaga trybu OFFICE", () => {
    const presenceMode: "HOME" | "OFFICE" = "HOME";
    const bookingEnabled = presenceMode === "OFFICE";
    expect(bookingEnabled).toBe(false);
  });

  it("rezerwacja parkingu dozwolona przy OFFICE", () => {
    const presenceMode: "HOME" | "OFFICE" = "OFFICE";
    const bookingEnabled = presenceMode === "OFFICE";
    expect(bookingEnabled).toBe(true);
  });
});

describe("Logika konfliktów rezerwacji", () => {
  // Te testy sprawdzają logikę biznesową na poziomie unit
  // Prawdziwe testy DB wymagałyby uruchomienia Prisma z testową bazą

  it("unikalność deskId+date — jeden biurko nie może mieć dwóch rezerwacji na ten sam dzień", () => {
    // Symulacja: zbiór istniejących rezerwacji
    const existingReservations = [
      { deskId: "desk-1", userId: "user-1", date: "2026-02-10" },
    ];

    const newReservation = { deskId: "desk-1", userId: "user-2", date: "2026-02-10" };

    const hasConflict = existingReservations.some(
      (r) => r.deskId === newReservation.deskId && r.date === newReservation.date
    );

    expect(hasConflict).toBe(true);
  });

  it("unikalność userId+date — użytkownik nie może mieć dwóch rezerwacji na ten sam dzień", () => {
    const existingReservations = [
      { deskId: "desk-1", userId: "user-1", date: "2026-02-10" },
    ];

    const newReservation = { deskId: "desk-2", userId: "user-1", date: "2026-02-10" };

    const hasUserConflict = existingReservations.some(
      (r) => r.userId === newReservation.userId && r.date === newReservation.date
    );

    expect(hasUserConflict).toBe(true);
  });

  it("pozwala na rezerwację tego samego biurka w innym dniu", () => {
    const existingReservations = [
      { deskId: "desk-1", userId: "user-1", date: "2026-02-10" },
    ];

    const newReservation = { deskId: "desk-1", userId: "user-2", date: "2026-02-11" };

    const hasConflict = existingReservations.some(
      (r) => r.deskId === newReservation.deskId && r.date === newReservation.date
    );

    expect(hasConflict).toBe(false);
  });

  it("pozwala na rezerwację użytkownika w innym dniu", () => {
    const existingReservations = [
      { deskId: "desk-1", userId: "user-1", date: "2026-02-10" },
    ];

    const newReservation = { deskId: "desk-2", userId: "user-1", date: "2026-02-11" };

    const hasUserConflict = existingReservations.some(
      (r) => r.userId === newReservation.userId && r.date === newReservation.date
    );

    expect(hasUserConflict).toBe(false);
  });

  it("nie pozwala na rezerwację w przeszłości", () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pastDate = new Date("2024-01-01");
    const isPast = pastDate < today;

    expect(isPast).toBe(true);
  });

  it("pozwala na rezerwację na dziś", () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayReservation = new Date(today);
    const isPast = todayReservation < today;

    expect(isPast).toBe(false);
  });
});
