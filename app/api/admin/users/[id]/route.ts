import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { z } from "zod";
import bcrypt from "bcryptjs";

const patchUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

// PATCH /api/admin/users/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "Użytkownik nie znaleziony" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = patchUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowe dane", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const currentUserId = (session!.user as { id: string }).id;
  const isSelf = id === currentUserId;

  if (isSelf && parsed.data.active === false) {
    return NextResponse.json(
      { error: "Nie możesz dezaktywować własnego konta" },
      { status: 400 }
    );
  }

  if (isSelf && parsed.data.role === "USER") {
    return NextResponse.json(
      { error: "Nie możesz zmienić sobie roli na USER" },
      { status: 400 }
    );
  }

  if (parsed.data.email && parsed.data.email !== user.email) {
    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Użytkownik z emailem "${parsed.data.email}" już istnieje` },
        { status: 409 }
      );
    }
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.email !== undefined) updateData.email = parsed.data.email;
  if (parsed.data.role !== undefined) updateData.role = parsed.data.role;
  if (parsed.data.active !== undefined) updateData.active = parsed.data.active;
  if (parsed.data.password) {
    updateData.passwordHash = await bcrypt.hash(parsed.data.password, 10);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    active: updated.active,
    createdAt: updated.createdAt,
  });
}

// DELETE /api/admin/users/:id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const currentUserId = (session!.user as { id: string }).id;
  if (id === currentUserId) {
    return NextResponse.json(
      { error: "Nie możesz usunąć własnego konta" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "Użytkownik nie znaleziony" }, { status: 404 });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const futureReservations = await prisma.reservation.count({
    where: { userId: id, date: { gte: today } },
  });
  const futureParkingReservations = await prisma.parkingReservation.count({
    where: { userId: id, date: { gte: today } },
  });

  const total = futureReservations + futureParkingReservations;
  if (total > 0) {
    return NextResponse.json(
      {
        error: `Użytkownik ma ${total} przyszłych rezerwacji. Anuluj je najpierw lub dezaktywuj konto.`,
      },
      { status: 409 }
    );
  }

  await prisma.$transaction([
    prisma.presence.deleteMany({ where: { userId: id } }),
    prisma.parkingReservation.deleteMany({ where: { userId: id } }),
    prisma.reservation.deleteMany({ where: { userId: id } }),
    prisma.user.delete({ where: { id } }),
  ]);

  return NextResponse.json({ success: true });
}
