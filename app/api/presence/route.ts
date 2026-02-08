import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { dateQuerySchema, presenceBodySchema } from "@/lib/validations";

// GET /api/presence?date=YYYY-MM-DD
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

  const presence = await prisma.presence.findUnique({
    where: {
      userId_date: {
        userId: session.user.id,
        date,
      },
    },
  });

  return NextResponse.json({
    date: parsed.data.date,
    mode: presence?.mode ?? "HOME",
  });
}

// PUT /api/presence
export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = presenceBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowe dane", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const date = new Date(parsed.data.date + "T00:00:00.000Z");

  const presence = await prisma.presence.upsert({
    where: {
      userId_date: {
        userId: session.user.id,
        date,
      },
    },
    update: { mode: parsed.data.mode },
    create: {
      userId: session.user.id,
      date,
      mode: parsed.data.mode,
    },
  });

  return NextResponse.json({
    date: parsed.data.date,
    mode: presence.mode,
  });
}
