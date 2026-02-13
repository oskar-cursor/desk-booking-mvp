import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { z } from "zod";

// GET /api/admin/desks
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const desks = await prisma.desk.findMany({
    include: {
      _count: { select: { reservations: true } },
    },
    orderBy: { code: "asc" },
  });

  return NextResponse.json(
    desks.map((d) => ({
      id: d.id,
      code: d.code,
      name: d.name,
      locationLabel: d.locationLabel,
      active: d.active,
      reservationsCount: d._count.reservations,
      createdAt: d.createdAt,
    }))
  );
}

const createDeskSchema = z.object({
  code: z.string().min(1).max(10),
  locationLabel: z.string().min(1),
  name: z.string().min(1),
});

// POST /api/admin/desks
export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = createDeskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowe dane", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.desk.findUnique({
    where: { code: parsed.data.code },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Biurko o kodzie "${parsed.data.code}" już istnieje` },
      { status: 409 }
    );
  }

  const desk = await prisma.desk.create({
    data: {
      code: parsed.data.code,
      name: parsed.data.name,
      locationLabel: parsed.data.locationLabel,
    },
  });

  return NextResponse.json(desk, { status: 201 });
}
