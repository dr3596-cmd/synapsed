import { NextRequest, NextResponse } from "next/server";
import { getSyllabusContext, getClassInfo } from "@/lib/survey/syllabusService";
import { generateDiagnosticSurvey } from "@/lib/survey/diagnostic";
import { NoCourseMaterialError } from "@/lib/course/topicMap";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { classId, subject, level = "undergraduate" } = body;

    if (!classId) {
      return NextResponse.json({ error: "classId is required" }, { status: 400 });
    }

    // Get class information and syllabus context
    const classInfo = await getClassInfo(classId);
    if (!classInfo) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const syllabusContext = await getSyllabusContext(classId);

    // Generate survey template using AI with contextual information
    const { questions: diagnostic } = await generateDiagnosticSurvey(classId, classInfo.title);
    // Template editor uses { questionId, type: "short-answer" | "multiple-choice" }
    const templateQuestions = diagnostic.map((q) => ({
      questionId: q.id,
      text: q.text,
      type: q.type === "multiple_choice" ? "multiple-choice" : "short-answer",
      options: q.options ?? [],
      kind: q.kind,
      topicId: q.topicId,
      correctAnswer: q.correctAnswer,
    }));
    
    return NextResponse.json({ 
      success: true, 
      questions: templateQuestions,
      metadata: {
        courseName: syllabusContext.courseName,
        courseDescription: syllabusContext.courseDescription,
        hasSyllabus: syllabusContext.hasSyllabus,
        syllabusConfidence: syllabusContext.syllabusConfidence,
        materialCount: syllabusContext.materialCount,
        subject,
        level,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    if (error instanceof NoCourseMaterialError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error("[SURVEY_TEMPLATE_ERROR]", error);
    return NextResponse.json({ error: "Failed to generate survey template" }, { status: 500 });
  }
}
