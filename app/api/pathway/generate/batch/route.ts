import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { generatePathwayForStudent } from "@/lib/learning-paths/generatePathway";
import { getOrBuildTopicMap, NoCourseMaterialError } from "@/lib/course/topicMap";
import { requireClassProfessor } from "@/lib/auth";

// Generates a pathway for every student who answered the class's active survey.
export async function POST(req: Request) {
  const { classId } = await req.json();
  if (!classId) return NextResponse.json({ error: "Missing classId" }, { status: 400 });

  const authResult = await requireClassProfessor(classId);
  if (!authResult.ok) return authResult.response;

  const survey = await prisma.survey.findFirst({
    where: { classId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!survey) {
    return NextResponse.json({ error: "No active survey for this class" }, { status: 404 });
  }

  try {
    await getOrBuildTopicMap(classId);
  } catch (error) {
    if (error instanceof NoCourseMaterialError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error("[PATHWAY_BATCH_TOPICS]", error);
    return NextResponse.json({ error: "Failed to build course topics" }, { status: 500 });
  }

  const responses = await prisma.studentSurveyResponse.findMany({
    where: { classId, surveyId: survey.id },
    select: { studentId: true },
  });

  let generated = 0;
  const failed: { studentId: string; error: string }[] = [];
  for (const { studentId } of responses) {
    try {
      await generatePathwayForStudent({ classId, studentId, surveyId: survey.id });
      generated++;
    } catch (error) {
      console.error(`Failed to generate pathway for ${studentId}:`, error);
      failed.push({ studentId, error: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  return NextResponse.json({ success: true, generated, failed });
}
