import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import AuditLog from "@/models/AuditLog";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/admin/audit");

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session?.username) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 100);
    const actionFilter = searchParams.get("action");

    await connectDB();

    const query = {};
    if (actionFilter && actionFilter !== "all") {
      query.action = actionFilter;
    }
    if (cursor) {
      query._id = { $lt: cursor };
    }

    const items = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = items.length > limit;
    const results = hasMore ? items.slice(0, limit) : items;
    const nextCursor = results.length > 0 ? String(results[results.length - 1]._id) : null;

    return NextResponse.json({ items: results, nextCursor, hasMore });
  } catch (error) {
    log.error(error, "GET /api/admin/audit error");
    return NextResponse.json({ error: "Error al cargar audit log" }, { status: 500 });
  }
}
