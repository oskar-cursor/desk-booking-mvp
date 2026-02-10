import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { z } from "zod";
import { presenceModeSchema } from "@/lib/validations";

const bulkSchema = z.object({
  dates: z
    .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .min(1)
    .max(62),
  mode: presenceModeSchema,
});

// POST /api/presence/bulk
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowe dane", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  // Validate: no past dates, no weekends
  for (const dateStr of parsed.data.dates) {
    if (dateStr < today) {
      return NextResponse.json(
        { error: `Nie można zmienić trybu pracy na dzień z przeszłości: ${dateStr}` },
        { status: 400 }
      );
    }
    const d = new Date(dateStr + "T00:00:00.000Z");
    const day = d.getUTCDay();
    if (day === 0 || day === 6) {
      return NextResponse.json(
        { error: `Nie można ustawić trybu pracy na weekend: ${dateStr}` },
        { status: 400 }
      );
    }
  }

  const { dates, mode } = parsed.data;

  await prisma.$transaction(
    dates.map((dateStr) => {
      const date = new Date(dateStr + "T00:00:00.000Z");
      return prisma.presence.upsert({
        where: { userId_date: { userId: session.user.id, date } },
        update: { mode },
        create: { userId: session.user.id, date, mode },
      });
    })
  );

  return NextResponse.json({ updated: dates.length, dates });
}
