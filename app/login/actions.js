"use server";

import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth";

export async function loginAction(formData) {
  const username = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (
    username !== process.env.ADMIN_USER ||
    password !== process.env.ADMIN_PASS
  ) {
    redirect("/login?error=1");
  }

  await createSession(username);
  redirect("/dashboard");
}
