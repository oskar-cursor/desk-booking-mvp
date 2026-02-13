import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { z } from "zod";

// GET /api/admin/parking
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const spots = await prisma.parkingSpot.findMany({
    include: {
      _count: { select: { reservations: true } },
    },
    orderBy: { code: "asc" },
  });

  return NextResponse.json(
    spots.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      active: s.active,
      reservationsCount: s._count.reservations,
      createdAt: s.createdAt,
    }))
  );
}

const createSpotSchema = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(1),
});

// POST /api/admin/parking
export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = createSpotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowe dane", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.parkingSpot.findUnique({
    where: { code: parsed.data.code },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Miejsce parkingowe o kodzie "${parsed.data.code}" już istnieje` },
      { status: 409 }
    );
  }

  const spot = await prisma.parkingSpot.create({
    data: {
      code: parsed.data.code,
      name: parsed.data.name,
    },
  });

  return NextResponse.json(spot, { status: 201 });
}
