import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getLessonAccess } from "@/lib/pathwayProgress";

/**
 * Lesson access and completion for a pathway node, scoped to the signed-in student's own pathway.
 * GET  → LessonAccess (complete, locked, waitingOn, bestPopQuizScore, canComplete, ...)
 * POST → marks the lesson complete; requires the lesson to be unlocked and a pop quiz passed.
 *        Completion is permanent: un-completing would re-lock lessons the student already finished.
 */

export async function GET(_req: NextRequest, { params }: { params: Promise<{ nodeId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { nodeId } = await params;
  const access = await getLessonAccess(nodeId, session.user.id);
  if (!access) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  return NextResponse.json(access);
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ nodeId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { nodeId } = await params;
  const access = await getLessonAccess(nodeId, session.user.id);
  if (!access) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }
  if (access.complete) {
    return NextResponse.json(access);
  }
  if (access.locked) {
    return NextResponse.json(
      { error: `Complete ${access.waitingOn.join(" and ")} first`, ...access },
      { status: 403 }
    );
  }
  if (!access.canComplete) {
    return NextResponse.json(
      {
        error: `Score at least ${access.passingScore}% on a pop quiz for this lesson before marking it complete`,
        ...access,
      },
      { status: 400 }
    );
  }

  await prisma.pathwayNode.update({ where: { id: access.nodeId }, data: { aiLessonComplete: true } });
  return NextResponse.json({ ...access, complete: true, canComplete: false });
}
