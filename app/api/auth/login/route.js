import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (
      username !== process.env.ADMIN_USER ||
      password !== process.env.ADMIN_PASS
    ) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 },
      );
    }

    await createSession(username);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Error interno en login. Revisa AUTH_SECRET y variables de entorno.",
      },
      { status: 500 },
    );
  }
}
