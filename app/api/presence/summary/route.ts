import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { dateQuerySchema } from "@/lib/validations";

// GET /api/presence/summary?date=YYYY-MM-DD
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

  const [presences, reservations, totalUsers, totalDesks] = await Promise.all([
    prisma.presence.findMany({
      where: { date },
      include: { user: { select: { name: true, id: true } } },
    }),
    prisma.reservation.findMany({
      where: { date },
      include: {
        desk: { select: { code: true } },
        user: { select: { id: true } },
      },
    }),
    prisma.user.count(),
    prisma.desk.count({ where: { active: true } }),
  ]);

  // Build desk code lookup by userId
  const deskByUser = new Map<string, string>();
  for (const r of reservations) {
    deskByUser.set(r.user.id, r.desk.code);
  }

  const office: { name: string; deskCode?: string }[] = [];
  const home: { name: string }[] = [];
  const absent: { name: string }[] = [];

  for (const p of presences) {
    if (p.mode === "OFFICE") {
      const deskCode = deskByUser.get(p.user.id);
      office.push({ name: p.user.name, ...(deskCode ? { deskCode } : {}) });
    } else if (p.mode === "HOME") {
      home.push({ name: p.user.name });
    } else if (p.mode === "ABSENT") {
      absent.push({ name: p.user.name });
    }
  }

  // Sort alphabetically
  office.sort((a, b) => a.name.localeCompare(b.name));
  home.sort((a, b) => a.name.localeCompare(b.name));
  absent.sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({
    office,
    home,
    absent,
    counts: {
      total: totalUsers,
      totalDesks,
      office: office.length,
      home: home.length,
      absent: absent.length,
    },
  });
}
