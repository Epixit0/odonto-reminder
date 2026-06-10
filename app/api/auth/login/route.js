import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { logAudit, extractRequestInfo } from "@/lib/audit";

export async function POST(request) {
  try {
    const { ip, userAgent } = extractRequestInfo(request);
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      await logAudit({
        action: "login_failed",
        resource: "auth",
        details: { error: "Datos inválidos" },
        ip,
        userAgent,
      });
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { username, password } = parsed.data;

    if (username !== process.env.ADMIN_USER || password !== process.env.ADMIN_PASS) {
      await logAudit({
        action: "login_failed",
        resource: "auth",
        details: { username },
        ip,
        userAgent,
      });
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    await createSession(username);
    await logAudit({
      action: "login",
      resource: "auth",
      details: { username },
      username,
      ip,
      userAgent,
    });
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
