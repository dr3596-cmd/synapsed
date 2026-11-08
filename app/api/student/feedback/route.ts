import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getStudentFeedback } from "@/lib/feedback";

// GET: all feedback for the signed-in student, grouped by class
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const classes = await getStudentFeedback(session.user.id);
    return NextResponse.json({ classes });
  } catch (error) {
    console.error("[STUDENT_FEEDBACK]", error);
    return NextResponse.json({ error: "Failed to load feedback" }, { status: 500 });
  }
}
