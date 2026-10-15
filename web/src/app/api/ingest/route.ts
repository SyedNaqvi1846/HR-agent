import { NextRequest, NextResponse } from "next/server";
import { getGenAIClient, extractEmailFromRawText } from "@/lib/gemini";
import { DEMO_CANDIDATES } from "@/data/hiringPolicy";
import mammoth from "mammoth";
import { extractText } from "unpdf";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const demoId = formData.get("demoId") as string | null;
    const uploadedFile = formData.get("file") as File | null;

    let resumeText = "";
    let fileName = "";

    if (demoId) {
      const demo = DEMO_CANDIDATES.find((d) => d.id === demoId);
      if (demo) {
        resumeText = demo.resumeText;
        fileName = demo.fileName;
      }
    } else if (uploadedFile) {
      fileName = uploadedFile.name;
      const arrayBuffer = await uploadedFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (fileName.toLowerCase().endsWith(".docx")) {
        const result = await mammoth.extractRawText({ buffer });
        resumeText = result.value;
      } else if (fileName.toLowerCase().endsWith(".pdf")) {
        const { text } = await extractText(new Uint8Array(arrayBuffer));
        resumeText = Array.isArray(text) ? text.join("\n") : text;
      } else {
        resumeText = buffer.toString("utf-8");
      }
    }

    if (!resumeText || !resumeText.trim()) {
      return NextResponse.json(
        { error: "No text could be extracted from the provided resume." },
        { status: 400 }
      );
    }

function extractNameFromResume(text: string, fileName?: string): string {
  if (!text) return "";
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Check top 6 lines for candidate full name
  for (const line of lines.slice(0, 6)) {
    if (
      line.includes("@") ||
      line.match(/\b(curriculum|vitae|resume|cv|page|email|phone|contact|address|summary|profile)\b/i) ||
      line.length > 40 ||
      line.length < 3
    ) {
      continue;
    }

    const words = line.split(/\s+/);
    if (words.length >= 2 && words.length <= 4) {
      const isAlpha = words.every((w) => /^[a-zA-Z.'-]+$/.test(w));
      if (isAlpha) {
        return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
      }
    }
  }

  // Fallback: extract from filename (e.g. Syed_Yasoob_Resume.pdf -> Syed Yasoob)
  if (fileName) {
    const base = fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
    const cleaned = base.replace(/\b(cv|resume|updated|profile|final|docx|pdf)\b/gi, "").trim();
    if (cleaned.length >= 3 && cleaned.length <= 35) {
      return cleaned
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
    }
  }

  return "Applicant";
}

    const regexEmail = extractEmailFromRawText(resumeText);
    const heuristicName = extractNameFromResume(resumeText, fileName);

    // Call Gemini to structure candidate profile
    const customKey = req.headers.get("x-gemini-api-key") || (formData.get("apiKey") as string | null) || "";
    const ai = getGenAIClient(customKey);
    const prompt = `You are an expert HR Parser. Extract factual identity and candidate background from this CV into raw JSON.
CRITICAL: Accurately extract the candidate's real personal full name from the top header of the CV. Never use 'Applicant' if their name is present.
CRITICAL: Accurately extract their contact email address from the CV header or contact section.

CV Content:
${resumeText.slice(0, 25000)}

Respond ONLY with a valid JSON object matching:
{
  "fullName": "Real First and Last Name (e.g. Syed Yasoob)",
  "email": "candidate email address",
  "skills": ["Skill1", "Skill2", "Skill3"],
  "yearsExperience": 3.5,
  "summary": "2-sentence professional background summary"
}`;

    let parsedCandidate = {
      fullName: heuristicName || "Applicant",
      email: regexEmail || "candidate@example.com",
      skills: ["Software Engineering", "Problem Solving"],
      yearsExperience: 2,
      summary: "Experienced technical professional."
    };

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text || "";
      if (responseText) {
        const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const jsonResult = JSON.parse(cleanJson);
        parsedCandidate = {
          fullName: jsonResult.fullName || parsedCandidate.fullName,
          email: jsonResult.email || regexEmail || parsedCandidate.email,
          skills: jsonResult.skills || parsedCandidate.skills,
          yearsExperience: jsonResult.yearsExperience || parsedCandidate.yearsExperience,
          summary: jsonResult.summary || parsedCandidate.summary
        };
      }
    } catch (modelErr) {
      console.warn("Gemini parsing fallback:", modelErr);
      parsedCandidate.email = regexEmail || parsedCandidate.email;
    }

    // Fallback if model returned generic 'Applicant'
    if (!parsedCandidate.fullName || parsedCandidate.fullName.toLowerCase() === "applicant") {
      if (heuristicName && heuristicName.toLowerCase() !== "applicant") {
        parsedCandidate.fullName = heuristicName;
      }
    }

    // Ensure email is populated from regex if model returned empty
    if (!parsedCandidate.email || parsedCandidate.email === "candidate@example.com") {
      if (regexEmail) parsedCandidate.email = regexEmail;
    }

    return NextResponse.json({
      success: true,
      fileName,
      candidate: parsedCandidate,
      resumeSnippet: resumeText.slice(0, 1000)
    });
  } catch (error: any) {
    console.error("Ingest error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process resume." },
      { status: 500 }
    );
  }
}
