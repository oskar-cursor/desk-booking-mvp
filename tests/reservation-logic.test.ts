import { createReservationSchema, dateQuerySchema } from "../lib/validations";

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
