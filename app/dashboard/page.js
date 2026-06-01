import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import DashboardClient from "@/components/DashboardClient";
import { connectDB } from "@/lib/db";
import Visit from "@/models/Visit";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session?.username) {
    redirect("/login");
  }

  await connectDB();
  const visits = await Visit.find({}).sort({ createdAt: -1 }).limit(200).lean();
  const initialVisits = JSON.parse(JSON.stringify(visits));

  return (
    <DashboardClient
      username={session.username}
      initialVisits={initialVisits}
    />
  );
}
