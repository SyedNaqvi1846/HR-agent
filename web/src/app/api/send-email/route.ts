import { NextRequest, NextResponse } from "next/server";
import { getJob, saveJob, sendEmailThroughSMTP } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { jobId } = await req.json();
    const job = getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: "Email job not found or expired." },
        { status: 404 }
      );
    }

    if (job.status === "DELIVERED") {
      return NextResponse.json({ success: true, job });
    }

    const result = await sendEmailThroughSMTP(
      job.candidateEmail,
      job.subject,
      job.plainBody,
      job.htmlBody
    );

    job.status = result.success ? "DELIVERED" : "FAILED";
    job.deliveryType = result.success ? "SMTP_DISPATCH" : "ERROR";
    job.deliveryLog = result.log;
    saveJob(job);

    return NextResponse.json({
      success: result.success,
      job
    });
  } catch (error: any) {
    console.error("Send email error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to dispatch email." },
      { status: 500 }
    );
  }
}
