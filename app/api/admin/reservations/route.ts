import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { z } from "zod";

const querySchema = z.object({
  type: z.enum(["desk", "parking", "all"]).default("all"),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  userId: z.string().optional(),
  search: z.string().optional(),
});

// GET /api/admin/reservations
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    type: url.searchParams.get("type") || "all",
    dateFrom: url.searchParams.get("dateFrom") || undefined,
    dateTo: url.searchParams.get("dateTo") || undefined,
    userId: url.searchParams.get("userId") || undefined,
    search: url.searchParams.get("search") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Nieprawidłowe parametry" }, { status: 400 });
  }

  const { type, dateFrom, dateTo, userId, search } = parsed.data;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const weekLater = new Date(today);
  weekLater.setUTCDate(weekLater.getUTCDate() + 7);

  const from = dateFrom ? new Date(dateFrom + "T00:00:00.000Z") : today;
  const to = dateTo ? new Date(dateTo + "T00:00:00.000Z") : weekLater;

  interface ReservationResult {
    id: string;
    type: "desk" | "parking";
    date: string;
    resourceCode: string;
    resourceName: string;
    userName: string;
    userEmail: string;
    userId: string;
    createdAt: Date;
  }

  const results: ReservationResult[] = [];

  if (type === "all" || type === "desk") {
    const deskWhere: Record<string, unknown> = {
      date: { gte: from, lte: to },
    };
    if (userId) deskWhere.userId = userId;

    const deskReservations = await prisma.reservation.findMany({
      where: deskWhere,
      include: {
        desk: { select: { code: true, locationLabel: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { date: "desc" },
    });

    for (const r of deskReservations) {
      results.push({
        id: r.id,
        type: "desk",
        date: r.date.toISOString().slice(0, 10),
        resourceCode: r.desk.code,
        resourceName: r.desk.locationLabel,
        userName: r.user.name,
        userEmail: r.user.email,
        userId: r.user.id,
        createdAt: r.createdAt,
      });
    }
  }

  if (type === "all" || type === "parking") {
    const parkingWhere: Record<string, unknown> = {
      date: { gte: from, lte: to },
    };
    if (userId) parkingWhere.userId = userId;

    const parkingReservations = await prisma.parkingReservation.findMany({
      where: parkingWhere,
      include: {
        spot: { select: { code: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { date: "desc" },
    });

    for (const r of parkingReservations) {
      results.push({
        id: r.id,
        type: "parking",
        date: r.date.toISOString().slice(0, 10),
        resourceCode: r.spot.code,
        resourceName: r.spot.name,
        userName: r.user.name,
        userEmail: r.user.email,
        userId: r.user.id,
        createdAt: r.createdAt,
      });
    }
  }

  // Sort by date desc, then by type
  results.sort((a, b) => b.date.localeCompare(a.date) || a.type.localeCompare(b.type));

  // Apply search filter
  let filtered = results;
  if (search) {
    const s = search.toLowerCase();
    filtered = results.filter(
      (r) =>
        r.userName.toLowerCase().includes(s) ||
        r.resourceCode.toLowerCase().includes(s)
    );
  }

  const totalDesk = filtered.filter((r) => r.type === "desk").length;
  const totalParking = filtered.filter((r) => r.type === "parking").length;

  return NextResponse.json({
    reservations: filtered,
    total: filtered.length,
    summary: { totalDesk, totalParking },
  });
}
