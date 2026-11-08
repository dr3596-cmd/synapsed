import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getStudentAchievements } from "@/lib/achievements";

// GET: achievement percentages for the signed-in student
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const achievements = await getStudentAchievements(session.user.id);
    return NextResponse.json(achievements);
  } catch (error) {
    console.error("[STUDENT_ACHIEVEMENTS]", error);
    return NextResponse.json({ error: "Failed to load achievements" }, { status: 500 });
  }
}
