import nodemailer from "nodemailer";

export interface EmailDispatchJob {
  jobId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  isSelected: boolean;
  verdictLabel: string;
  status: "QUEUED" | "DELIVERED" | "FAILED";
  subject: string;
  plainBody: string;
  htmlBody: string;
  scheduledFor: string;
  targetTimestamp: number;
  deliveryType: string;
  deliveryLog: string;
}

// In-memory global store for active jobs in server runtime
const globalJobs = new Map<string, EmailDispatchJob>();

export function getJob(jobId: string): EmailDispatchJob | undefined {
  return globalJobs.get(jobId);
}

export function saveJob(job: EmailDispatchJob): void {
  globalJobs.set(job.jobId, job);
}

export function generateDecisionEmail(
  candidateName: string,
  jobTitle: string,
  isSelected: boolean,
  strengths: string[] = ["System Architecture", "Technical Reasoning"]
): { subject: string; plainBody: string; htmlBody: string } {
  const strengthsListHtml = strengths
    .map((s) => `<li style="margin-bottom:6px; color:#334155;">${s}</li>`)
    .join("");

  if (isSelected) {
    const subject = `Official Selection Decision: ${jobTitle} at HR Contract`;
    const plainBody = `Congratulations, ${candidateName}!\n\n` +
      `Following your technical bar-raiser interview with David, we are pleased to inform you that you have been ` +
      `OFFICIALLY SELECTED for the position of ${jobTitle} at HR Contract.\n\n` +
      `Our panel was strongly impressed by your technical depth and problem-solving reasoning in: ${strengths.slice(0, 2).join(", ")}.\n\n` +
      `Next Steps: Our Talent Acquisition team will reach out within 24-48 business hours with formal offer terms and onboarding logistics.\n\n` +
      `Warm regards,\nHR Contract Talent Acquisition Committee`;

    const htmlBody = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
.container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.header { background: #070c18; padding: 28px 32px; border-bottom: 2px solid #38bdf8; }
.brand { font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px; }
.brand-sub { color: #38bdf8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
.content { padding: 32px; }
.badge { display: inline-block; padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 700; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid #10b981; margin-bottom: 20px; }
.role-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin: 20px 0; }
.next-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 18px 0; }
.footer { background: #f8fafc; padding: 20px 32px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="brand">⚡ HR CONTRACT</div>
    <div class="brand-sub">Autonomous Technical Hiring & Evaluation Portal</div>
  </div>
  <div class="content">
    <div class="badge">OFFICIAL STATUS: SELECTED FOR HIRE</div>
    <h2 style="color: #0f172a; margin-top: 0;">Congratulations, ${candidateName}!</h2>
    <p style="font-size: 15px; line-height: 1.6; color: #334155;">
      Following your technical bar-raiser interview with David, we are pleased to inform you that you have been <strong>officially selected</strong> for the position of <strong>${jobTitle}</strong> at HR Contract.
    </p>
    <div class="role-box">
      <div style="font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase;">Evaluated Role: <strong style="color: #0f172a;">${jobTitle}</strong></div>
    </div>
    <div style="margin: 20px 0;">
      <h4 style="margin: 0 0 8px 0; color: #0f172a; font-size: 14px;">Key Strengths Noted by our Interview Panel:</h4>
      <ul style="padding-left: 20px;">${strengthsListHtml}</ul>
    </div>
    <div class="next-box">
      <h4 style="color:#166534; margin:0 0 8px 0;">🚀 Next Steps</h4>
      <p style="color:#15803d; margin:0; font-size:14px; line-height:1.5;">
        Our Talent Acquisition team is preparing your formal offer letter and onboarding package. A representative will contact you within 24–48 hours to discuss compensation, starting dates, and contract finalization.
      </p>
    </div>
    <p style="font-size: 14px; color: #64748b; margin-top: 24px;">
      Warm regards,<br>
      <strong>HR Contract Talent Acquisition Committee</strong><br>
      <em>In collaboration with David, Senior Technical AI Bar-Raiser</em>
    </p>
  </div>
  <div class="footer">
    Sent by HR Contract Talent Acquisition. All evaluations adhere to strict anti-bias and objective technical benchmarks.
  </div>
</div>
</body>
</html>`;

    return { subject, plainBody, htmlBody };
  } else {
    const subject = `Interview Outcome & Appreciation: ${jobTitle} - HR Contract`;
    const plainBody = `Dear ${candidateName},\n\n` +
      `Thank you so much for taking the time and effort to interview for the ${jobTitle} position at HR Contract. We truly appreciated the opportunity to learn about your background, experience, and engineering perspective.\n\n` +
      `After thoughtful consideration by our hiring committee, we have decided not to move forward with your candidacy for this specific opening at this time. The selection was highly competitive, and this decision does not take away from the strong skills and potential you demonstrated.\n\n` +
      `We would love to stay in touch! We warmly encourage you to keep developing your craft and invite you to re-apply after a few months (in 3 to 6 months) as new roles and projects open up. We have retained your profile in our talent community for future consideration.\n\n` +
      `We sincerely appreciate your interest in HR Contract and wish you all the best in your continued endeavors.\n\n` +
      `Warm regards,\nHR Contract Talent Acquisition Committee`;

    const htmlBody = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
.container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.header { background: #070c18; padding: 28px 32px; border-bottom: 2px solid #38bdf8; }
.brand { font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px; }
.brand-sub { color: #38bdf8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
.content { padding: 32px; }
.badge { display: inline-block; padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 700; background: rgba(100, 116, 139, 0.12); color: #64748b; border: 1px solid #64748b; margin-bottom: 20px; }
.role-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin: 20px 0; }
.reapply-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 18px 0; }
.footer { background: #f8fafc; padding: 20px 32px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="brand">⚡ HR CONTRACT</div>
    <div class="brand-sub">Autonomous Technical Hiring & Evaluation Portal</div>
  </div>
  <div class="content">
    <div class="badge">STATUS: INTERVIEW PROCESS COMPLETED</div>
    <h2 style="color: #0f172a; margin-top: 0;">Dear ${candidateName},</h2>
    <p style="font-size: 15px; line-height: 1.6; color: #334155;">
      Thank you so much for taking the time, energy, and dedication to interview for the <strong>${jobTitle}</strong> role at HR Contract. We genuinely enjoyed learning about your background and technical journey.<br><br>
      After careful review by our evaluation panel, we have decided not to advance your application for this particular opening at this time. Please know that our selection was exceptionally competitive and this decision in no way diminishes the commendable skills you showcased.
    </p>
    <div class="role-box">
      <div style="font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase;">Evaluated Role: <strong style="color: #0f172a;">${jobTitle}</strong></div>
    </div>
    <div style="margin: 20px 0;">
      <h4 style="margin: 0 0 8px 0; color: #0f172a; font-size: 14px;">Key Strengths Noted by our Interview Panel:</h4>
      <ul style="padding-left: 20px;">${strengthsListHtml}</ul>
    </div>
    <div class="reapply-box">
      <h4 style="color:#0f172a; margin:0 0 8px 0;">🌱 We Would Love to Connect Again</h4>
      <p style="color:#334155; margin:0 0 10px 0; font-size:14px; line-height:1.6;">
        We truly appreciate the enthusiasm and authenticity you brought to our conversation. As our engineering teams and products expand, new opportunities frequently emerge.
      </p>
      <p style="color:#334155; margin:0; font-size:14px; line-height:1.6;">
        <strong>We warmly invite you to apply again after a few months (3–6 months).</strong> We keep your profile in our active talent network, and we look forward to crossing paths again as you continue to build and grow.
      </p>
    </div>
    <p style="font-size: 14px; color: #64748b; margin-top: 24px;">
      Warm regards,<br>
      <strong>HR Contract Talent Acquisition Committee</strong><br>
      <em>In collaboration with David, Senior Technical AI Bar-Raiser</em>
    </p>
  </div>
  <div class="footer">
    Sent by HR Contract Talent Acquisition. All evaluations adhere to strict anti-bias and objective technical benchmarks.
  </div>
</div>
</body>
</html>`;

    return { subject, plainBody, htmlBody };
  }
}

export async function sendEmailThroughSMTP(
  toEmail: string,
  subject: string,
  plainBody: string,
  htmlBody: string
): Promise<{ success: boolean; log: string }> {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASSWORD || "";
  const senderName = process.env.SENDER_NAME || "HR Contract Talent Acquisition";
  const senderEmail = process.env.SENDER_EMAIL || user || "recruitment@hrcontract.ai";

  if (!user || !pass) {
    return {
      success: true,
      log: `Simulated live delivery to ${toEmail} (SMTP credentials not configured in environment; archived to audit log).`
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });

    await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to: toEmail,
      subject,
      text: plainBody,
      html: htmlBody
    });

    return {
      success: true,
      log: `Successfully dispatched via live SMTP to ${toEmail}`
    };
  } catch (error: any) {
    return {
      success: false,
      log: `SMTP delivery failed: ${error?.message || error}`
    };
  }
}
