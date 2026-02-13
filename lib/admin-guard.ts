import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return {
      error: NextResponse.json(
        { message: "Nie jesteś zalogowany" },
        { status: 401 }
      ),
      session: null,
    };
  }
  if ((session.user as { role?: string }).role !== "ADMIN") {
    return {
      error: NextResponse.json(
        { message: "Brak uprawnień administratora" },
        { status: 403 }
      ),
      session: null,
    };
  }
  return { error: null, session };
}
