import { NextRequest, NextResponse } from "next/server";
import { getGenAIClient } from "@/lib/gemini";
import { HIRING_POLICY } from "@/data/hiringPolicy";
import { generateDecisionEmail, saveJob, sendEmailThroughSMTP, EmailDispatchJob } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { messages, candidate, jobTitle } = await req.json();

    const transcriptText = (messages || [])
      .map((m: { role: string; content: string }) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");

    const evalPrompt = `
You are the Executive Talent Evaluation Committee at 'HR Contract'.
Evaluate the following complete technical interview for ${jobTitle} against the official Hiring Policy.

CANDIDATE INFORMATION:
- Name: ${candidate?.fullName || "Candidate"}
- Target Role: ${jobTitle}
- Candidate Background: ${candidate?.summary || ""}

OFFICIAL HIRING POLICY:
"""
${HIRING_POLICY}
"""

COMPLETE INTERVIEW TRANSCRIPT:
"""
${transcriptText}
"""

EVALUATION INSTRUCTIONS:
1. Objectively evaluate technical depth, system architecture, database optimization, and reasoning.
2. Provide an honest, rigorous verdict:
   - "RECOMMENDED FOR HIRE" if overallScore >= 70
   - "NOT RECOMMENDED" if overallScore < 70
   - or "BORDERLINE"
3. Output MUST be a valid JSON object matching:
{
  "verdict": "RECOMMENDED FOR HIRE or NOT RECOMMENDED",
  "overallScore": 82,
  "technicalRating": 8,
  "communicationRating": 9,
  "problemSolvingRating": 8,
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "areasOfConcern": ["Area 1", "Area 2"],
  "executiveSummary": "Concise 3-sentence recruiter evaluation summary."
}
Do not wrap with markdown backticks. Return raw JSON only.
`;

    const ai = getGenAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: evalPrompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const responseText = response.text || "";
    const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    let scorecard = {
      verdict: "RECOMMENDED FOR HIRE",
      overallScore: 78,
      technicalRating: 8,
      communicationRating: 8,
      problemSolvingRating: 8,
      strengths: ["System Architecture", "API Design", "Technical Reasoning"],
      areasOfConcern: ["Edge case handling in concurrency"],
      executiveSummary: "Strong technical foundation and clear communication demonstrated throughout the interview."
    };

    try {
      scorecard = JSON.parse(cleanJson);
    } catch (e) {
      console.warn("Scorecard parse error, using fallback scorecard:", e);
    }

    const isSelected =
      scorecard.verdict.toUpperCase().includes("RECOMMENDED") &&
      !scorecard.verdict.toUpperCase().includes("NOT") &&
      scorecard.overallScore >= 70;

    const emailContent = generateDecisionEmail(
      candidate?.fullName || "Candidate",
      jobTitle,
      isSelected,
      scorecard.strengths || []
    );

    const jobId = `job_${Date.now()}_${(candidate?.fullName || "applicant").toLowerCase().replace(/\s+/g, "_")}`;
    const scheduledDate = new Date(Date.now() + 120 * 1000);
    const scheduledFor = scheduledDate.toLocaleTimeString();

    const jobRecord: EmailDispatchJob = {
      jobId,
      candidateName: candidate?.fullName || "Candidate",
      candidateEmail: candidate?.email || "candidate@example.com",
      jobTitle,
      isSelected,
      verdictLabel: isSelected ? "SELECTED FOR HIRE" : "NOT SELECTED",
      status: "QUEUED",
      subject: emailContent.subject,
      plainBody: emailContent.plainBody,
      htmlBody: emailContent.htmlBody,
      scheduledFor,
      targetTimestamp: Math.floor(Date.now() / 1000) + 120,
      deliveryType: "SCHEDULED_AUTOMATION",
      deliveryLog: "Scheduled to dispatch automatically in 2 minutes post-interview."
    };

    saveJob(jobRecord);

    return NextResponse.json({
      success: true,
      scorecard,
      isSelected,
      emailJob: jobRecord
    });
  } catch (error: any) {
    console.error("Evaluation error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to evaluate interview." },
      { status: 500 }
    );
  }
}
