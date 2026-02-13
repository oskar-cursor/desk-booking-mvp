import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { z } from "zod";
import bcrypt from "bcryptjs";

// GET /api/admin/users
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: {
          reservations: true,
          parkingReservations: true,
        },
      },
      presences: {
        where: { date: today },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      active: u.active,
      createdAt: u.createdAt,
      stats: {
        totalReservations: u._count.reservations,
        totalParkingReservations: u._count.parkingReservations,
        currentPresence: u.presences[0]?.mode ?? null,
      },
    }))
  );
}

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["USER", "ADMIN"]),
});

// POST /api/admin/users
export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowe dane", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Użytkownik z emailem "${parsed.data.email}" już istnieje` },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role,
    },
  });

  return NextResponse.json(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
    },
    { status: 201 }
  );
}
