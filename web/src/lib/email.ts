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
    .map((s) => `<li style="margin-bottom:8px; color:#334155; line-height: 1.5;">${s}</li>`)
    .join("");

  if (isSelected) {
    const subject = `Congratulations: Selection Update for ${jobTitle} – HR Contract`;
    const plainBody = `Dear ${candidateName},\n\n` +
      `Thank you for participating in our technical interview process for the ${jobTitle} position at HR Contract.\n\n` +
      `Following a comprehensive review of your interview by our evaluation committee, we are delighted to inform you that you have been officially selected for the position of ${jobTitle}.\n\n` +
      `Our panel was very impressed by your engineering depth and technical reasoning, particularly in:\n` +
      strengths.map(s => `• ${s}`).join("\n") +
      `\n\nNext Steps:\n` +
      `Our Talent Acquisition team is currently preparing your formal offer documentation. A representative will reach out to you within 24 to 48 business hours to discuss your offer terms, compensation, and onboarding logistics.\n\n` +
      `Congratulations once again on your outstanding performance. We look forward to welcoming you to the team!\n\n` +
      `Warm regards,\n` +
      `Talent Acquisition Committee\n` +
      `HR Contract`;

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
.next-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin: 20px 0; }
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
    <h2 style="color: #0f172a; margin-top: 0; font-size: 22px;">Congratulations, ${candidateName}!</h2>
    <p style="font-size: 15px; line-height: 1.6; color: #334155;">
      Following a comprehensive review of your technical interview and architectural discussions, we are delighted to inform you that you have been <strong>officially selected</strong> for the position of <strong>${jobTitle}</strong> at HR Contract.
    </p>
    <div class="role-box">
      <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Position</div>
      <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 2px;">${jobTitle}</div>
    </div>
    <div style="margin: 22px 0;">
      <h4 style="margin: 0 0 10px 0; color: #0f172a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Key Highlights Noted by the Evaluation Panel:</h4>
      <ul style="padding-left: 20px; margin: 0;">${strengthsListHtml}</ul>
    </div>
    <div class="next-box">
      <h4 style="color:#166534; margin:0 0 8px 0; font-size: 15px;">🚀 Next Steps</h4>
      <p style="color:#15803d; margin:0; font-size:14px; line-height:1.6;">
        Our Talent Acquisition team is currently preparing your formal offer documentation. A representative will contact you directly within <strong>24 to 48 business hours</strong> to discuss your offer terms, compensation package, start date, and onboarding logistics.
      </p>
    </div>
    <p style="font-size: 14px; color: #64748b; margin-top: 28px; line-height: 1.6;">
      Warm regards,<br>
      <strong style="color: #1e293b;">Talent Acquisition Committee</strong><br>
      HR Contract
    </p>
  </div>
  <div class="footer">
    Sent by HR Contract Talent Acquisition. This email contains confidential employment correspondence intended solely for the recipient.
  </div>
</div>
</body>
</html>`;

    return { subject, plainBody, htmlBody };
  } else {
    const subject = `Update regarding your application for ${jobTitle} – HR Contract`;
    const plainBody = `Dear ${candidateName},\n\n` +
      `Thank you very much for taking the time, preparation, and effort to interview for the ${jobTitle} position at HR Contract. We truly appreciated the opportunity to speak with you and learn more about your technical background and engineering perspective.\n\n` +
      `Following a thorough and thoughtful evaluation by our hiring committee, we are writing to inform you that we have decided not to advance your application for this specific opening at this time.\n\n` +
      `Our applicant pool was exceptionally competitive, making our selection decisions challenging. While your application was not chosen for this specific role, our evaluation panel noted positive impressions regarding your technical communication and dedication to problem-solving.\n\n` +
      `Staying Connected:\n` +
      `We value staying in touch as our engineering teams and product initiatives continue to scale. We have retained your profile in our active talent network, and we warmly invite you to explore and reapply for open engineering positions with us after 3 to 6 months.\n\n` +
      `We sincerely appreciate your interest in HR Contract and wish you all the best in your continued professional journey.\n\n` +
      `Warm regards,\n` +
      `Talent Acquisition Team\n` +
      `HR Contract`;

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
.badge { display: inline-block; padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 700; background: rgba(100, 116, 139, 0.12); color: #475569; border: 1px solid #94a3b8; margin-bottom: 20px; }
.role-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin: 20px 0; }
.reapply-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0; }
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
    <div class="badge">STATUS: APPLICATION UPDATE</div>
    <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Dear ${candidateName},</h2>
    <p style="font-size: 15px; line-height: 1.6; color: #334155;">
      Thank you very much for taking the time, preparation, and effort to interview for the <strong>${jobTitle}</strong> position at HR Contract. We truly appreciated the opportunity to speak with you and learn more about your technical background and engineering perspective.
    </p>
    <p style="font-size: 15px; line-height: 1.6; color: #334155;">
      Following a thorough and thoughtful evaluation by our hiring committee, we are writing to inform you that we have decided not to advance your application for this specific opening at this time.
    </p>
    <div class="role-box">
      <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Evaluated Position</div>
      <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;">${jobTitle}</div>
    </div>
    <p style="font-size: 14px; line-height: 1.6; color: #334155;">
      Our applicant pool was exceptionally competitive, making our selection decisions challenging. While your application was not chosen for this specific role, our evaluation panel noted positive impressions regarding your technical communication and dedication to problem-solving.
    </p>
    <div class="reapply-box">
      <h4 style="color:#0f172a; margin:0 0 8px 0; font-size: 14px;">🌱 We Would Value Staying Connected</h4>
      <p style="color:#334155; margin:0 0 10px 0; font-size:14px; line-height:1.6;">
        As our engineering teams and product initiatives continue to scale, new opportunities frequently emerge. We have retained your profile in our active talent network for future consideration.
      </p>
      <p style="color:#334155; margin:0; font-size:14px; line-height:1.6;">
        <strong>We warmly invite you to explore and reapply for open engineering positions with us after 3 to 6 months.</strong>
      </p>
    </div>
    <p style="font-size: 14px; color: #64748b; margin-top: 28px; line-height: 1.6;">
      Warm regards,<br>
      <strong style="color: #1e293b;">Talent Acquisition Team</strong><br>
      HR Contract
    </p>
  </div>
  <div class="footer">
    Sent by HR Contract Talent Acquisition. This email contains confidential employment correspondence intended solely for the recipient.
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
      log: `Simulated delivery: SMTP_PASSWORD is not set in .env.local. Add your Gmail App Password to enable live inbox delivery.`
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
