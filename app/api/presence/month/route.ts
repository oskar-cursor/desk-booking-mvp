import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { z } from "zod";

const querySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

// GET /api/presence/month?year=2026&month=2
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    year: searchParams.get("year"),
    month: searchParams.get("month"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Wymagane parametry year i month" },
      { status: 400 }
    );
  }

  const { year, month } = parsed.data;
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1));

  const presences = await prisma.presence.findMany({
    where: {
      userId: session.user.id,
      date: { gte: startDate, lt: endDate },
    },
  });

  const entries: Record<string, string> = {};
  for (const p of presences) {
    const d = p.date.toISOString().slice(0, 10);
    entries[d] = p.mode;
  }

  return NextResponse.json({ entries });
}
