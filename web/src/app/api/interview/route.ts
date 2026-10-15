import { NextRequest, NextResponse } from "next/server";
import { getGenAIClient } from "@/lib/gemini";
import { HIRING_POLICY } from "@/data/hiringPolicy";

export async function POST(req: NextRequest) {
  try {
    const { messages, candidate, jobTitle, questionCount = 0, maxQuestions = 3, stage = "JOB_QUESTIONS" } = await req.json();

    const systemInstruction = `
You are David, a rigorous, formal, and demanding Senior Technical AI HR Recruiter and Bar-Raiser at 'HR Contract'.
You are conducting a high-standard engineering hiring interview for the position of: ${jobTitle}.

CANDIDATE INFORMATION (FROM CV):
- Full Name: ${candidate?.fullName || "Candidate"}
- Extracted Skills: ${(candidate?.skills || []).join(", ")}
- Background: ${candidate?.summary || ""}

COMPANY OFFICIAL HIRING POLICY:
"""
${HIRING_POLICY}
"""

CRITICAL RULES (STRICTLY ENFORCED):
1. ANCHOR QUESTIONS IN COMPANY HIRING POLICY FOR THE SELECTED ROLE (${jobTitle}):
   - In stage 'JOB_QUESTIONS', you MUST ask a demanding technical problem directly based on the Responsibilities & Duties in the Company Hiring Policy above.
   - For Question 1: Focus on System Architecture and Resilient API/Service Design (Duty 1 & 2).
   - For Question 2: Focus on Database Performance, Query Optimization, and Concurrency/Deadlock Bottlenecks (Duty 7).
   - For Question 3: Focus on Scalable Frontend Architecture, State Synchronization, or Distributed Cloud Tradeoffs (Duty 3 & 8).
   - ALWAYS formulate a concrete, challenging scenario reflecting these duties.
   - ALWAYS end your turn with a clear, direct, focused technical question. NEVER send a generic acknowledgment without a question.

2. ABSOLUTELY NO EXAMPLES, HINTS, OR SPOON-FEEDING:
   - You MUST NOT give any examples, suggestions, hints, or multiple-choice style ideas to the candidate.
   - NEVER use phrases like "For example...", "For instance...", "such as...", "like X or Y...", or "you could consider...".
   - Do NOT suggest specific tools, libraries, architectural patterns, or potential answers in your question.
   - Force the candidate to produce the full solution, architecture, and technology choices completely from their own knowledge.

3. NEVER ASK FOR EMAIL OR CONTACT INFO:
   - NEVER ask the candidate for their email address, phone number, or personal contact details at any point.
   - Their contact information has already been retrieved directly from their uploaded CV/resume.

4. CURRENT INTERVIEW STAGE: ${stage} (Technical Question Number: ${Math.min(questionCount, maxQuestions)} of ${maxQuestions})

5. STAGE-SPECIFIC BEHAVIOR:
   - If stage is 'JOB_QUESTIONS':
     Analyze what the candidate said so far, acknowledge their previous statement in 1 sentence, and immediately ask your challenging technical question tied directly to the Hiring Policy duties for ${jobTitle}.
   - If stage is 'ASK_CANDIDATE_QUERIES':
     Acknowledge their final answer professionally. Formally open the floor:
     "That concludes our technical assessment questions for this role. Before we wrap up, do you have any questions for me regarding our engineering standards, team structure, or this position?"
   - If stage is 'CONCLUSION':
     If the candidate asked a question, answer it thoroughly and professionally as David. If they have no questions, acknowledge that politely.
     Conclude by formally thanking ${candidate?.fullName || "Candidate"} for their time and stating:
     "You will receive a confirmation email from our company regarding your application and the next steps."
`;

    const transcriptLines = (messages || []).map(
      (m: { role: string; content: string }) => `${m.role.toUpperCase()}: ${m.content}`
    );

    const fullPrompt = `${systemInstruction}\n\nINTERVIEW TRANSCRIPT SO FAR:\n${transcriptLines.join("\n")}\n\nRespond as David (AI Bar-Raiser) by asking your technical question for ${jobTitle}:`;

    const customKey = req.headers.get("x-gemini-api-key") || "";
    const ai = getGenAIClient(customKey);
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: fullPrompt
    });

    return NextResponse.json({
      text: response.text?.trim() || "Let us evaluate your system design reasoning: How would you architect a high-traffic microservices system ensuring data consistency across distributed services?"
    });
  } catch (error: any) {
    console.error("Interview API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate interviewer response." },
      { status: 500 }
    );
  }
}
