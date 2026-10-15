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

    const regexEmail = extractEmailFromRawText(resumeText);

    // Call Gemini to structure candidate profile
    const customKey = req.headers.get("x-gemini-api-key") || (formData.get("apiKey") as string | null) || "";
    const ai = getGenAIClient(customKey);
    const prompt = `You are an expert HR Parser. Extract factual identity and candidate background from this CV into raw JSON.
Crucial: Accurately extract their real full name from the top.
Crucial: Accurately extract their contact email address from the CV header or contact section.

CV Content:
${resumeText.slice(0, 25000)}

Respond ONLY with a valid JSON object matching:
{
  "fullName": "Candidate full name",
  "email": "candidate email address",
  "skills": ["Skill1", "Skill2", "Skill3"],
  "yearsExperience": 3.5,
  "summary": "2-sentence professional background summary"
}`;

    let parsedCandidate = {
      fullName: "Applicant",
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
      // Fallback regex email
      parsedCandidate.email = regexEmail || parsedCandidate.email;
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
