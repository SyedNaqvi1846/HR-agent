import os
import time
import json
import smtplib
import threading
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime

from dotenv import load_dotenv
from google import genai

load_dotenv()

DISPATCH_LOG_FILE = Path("email_dispatches.json")

# In-memory thread-safe email job registry
_job_lock = threading.Lock()
_email_jobs: Dict[str, Dict[str, Any]] = {}


def load_dispatches_from_disk() -> Dict[str, Dict[str, Any]]:
    """Loads historical dispatches from disk."""
    if DISPATCH_LOG_FILE.exists():
        try:
            return json.loads(DISPATCH_LOG_FILE.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def save_dispatch_to_disk(job: Dict[str, Any]) -> None:
    """Appends or updates a job record in the persistent JSON store."""
    with _job_lock:
        current_data = load_dispatches_from_disk()
        current_data[job["job_id"]] = job
        try:
            DISPATCH_LOG_FILE.write_text(json.dumps(current_data, indent=2), encoding="utf-8")
        except Exception as e:
            print(f"[EmailAgent] Failed to persist email dispatch: {e}")


class EmailAgent:
    """
    Autonomous Email Agent:
    - Analyzes interview decision and scorecard
    - Determines selection outcome (SELECTED vs NOT SELECTED)
    - Generates personalized candidate letter using Gemini
    - Schedules and executes automated dispatch after a 2-minute delay
    - Delivers via SMTP (TLS/SSL) or records in verifiable audit mailbox
    """

    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", os.getenv("SMTP_SERVER", "smtp.gmail.com")).strip()
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", os.getenv("SMTP_EMAIL", "")).strip()
        self.smtp_pass = os.getenv("SMTP_PASSWORD", os.getenv("SMTP_PASS", "")).strip()
        self.sender_name = os.getenv("SENDER_NAME", "HR Contract Talent Acquisition")
        self.sender_email = os.getenv("SENDER_EMAIL", self.smtp_user or "recruitment@hrcontract.ai").strip()

    def is_smtp_configured(self) -> bool:
        """Returns True if valid SMTP credentials exist in environment."""
        return bool(self.smtp_user and self.smtp_pass)

    def determine_selection_verdict(self, scorecard_data: Dict[str, Any]) -> tuple[bool, str]:
        """
        Evaluates scorecard and determines if candidate is SELECTED or NOT SELECTED.
        Returns: (is_selected: bool, status_label: str)
        """
        verdict = str(scorecard_data.get("verdict", "")).upper()
        overall_score = int(scorecard_data.get("overall_score", 0))

        if "RECOMMENDED" in verdict and "NOT" not in verdict:
            return True, "SELECTED"
        elif overall_score >= 70 and "NOT RECOMMENDED" not in verdict:
            return True, "SELECTED"
        elif "BORDERLINE" in verdict and overall_score >= 75:
            return True, "SELECTED"
        else:
            return False, "NOT_SELECTED"

    def draft_email_with_gemini(
        self,
        client: Optional[genai.Client],
        model: str,
        candidate_name: str,
        job_title: str,
        scorecard_data: Dict[str, Any],
        is_selected: bool
    ) -> tuple[str, str, str]:
        """
        Uses Gemini to generate a tailored, professional decision email.
        Returns: (subject, plain_text_body, html_body)
        """
        score = scorecard_data.get("overall_score", 0)
        strengths = scorecard_data.get("strengths", [])
        strengths_str = ", ".join(strengths) if strengths else "Strong problem-solving and architectural reasoning"
        concerns = scorecard_data.get("areas_of_concern", [])
        concerns_str = ", ".join(concerns) if concerns else "None noted"
        summary = scorecard_data.get("executive_summary", "")

        status_text = "OFFICIALLY SELECTED / ADVANCED TO OFFER STAGE" if is_selected else "NOT SELECTED AT THIS TIME"

        prompt = f"""
You are the Executive Talent Director at 'HR Contract'.
Draft an official candidate post-interview decision email.

CANDIDATE INFORMATION:
- Name: {candidate_name}
- Target Position: {job_title}
- Decision Status: {status_text}
- Highlighted Strengths: {strengths_str}
- Identified Areas of Growth: {concerns_str}
- Committee Summary: {summary}

IMPORTANT CONFIDENTIALITY & COMMUNICATION RULES:
- DO NOT disclose or include any numeric scores, points, or percentages (e.g., do NOT write '{score}/100' or any numbers). Evaluation scores are strictly internal.

INSTRUCTIONS:
1. Tone: Warm, highly professional, appreciative, and encouraging.
2. If SELECTED:
   - Clearly state in the first paragraph that they have been SELECTED for the {job_title} role.
   - Commend their performance in the technical interview with David (AI Bar-Raiser).
   - Outline clear next steps: Our Human Talent Partner will reach out within 24-48 business hours to discuss offer terms, contract details, and onboarding timeline.
3. If NOT SELECTED:
   - Deliver the decision politely, with dignity and warmth, without ambiguity.
   - Deeply appreciate and thank them for the dedication, time, and thorough preparation they invested in the interview process.
   - Acknowledge their demonstrated technical strengths.
   - Warmly encourage them to continue developing their craft and invite them to apply again after a few months (3 to 6 months) as new openings and engineering roles emerge.
   - Reaffirm that their profile remains in our active talent network.

OUTPUT FORMAT:
Provide your output as a valid JSON object with the following exact keys:
{{
  "subject": "Clear email subject line",
  "plain_body": "Full email text formatted nicely with line breaks",
  "html_body": "Clean, modern, inline-styled responsive HTML email with header, badge, content cards, and signature"
}}
Do not include markdown triple backticks around the JSON. Return raw JSON only.
"""
        # Fallback templates in case API call is unavailable
        if client is None:
            return self._build_template_email(candidate_name, job_title, scorecard_data, is_selected)

        try:
            res = client.models.generate_content(
                model=model,
                contents=prompt,
                config={"response_mime_type": "application/json"}
            )
            raw_text = res.text.strip()
            # Clean up potential markdown formatting
            if raw_text.startswith("```"):
                raw_text = raw_text.split("\n", 1)[1]
                if raw_text.endswith("```"):
                    raw_text = raw_text.rsplit("\n", 1)[0]
            data = json.loads(raw_text)
            return (
                data.get("subject", f"Interview Decision Update: {job_title} - HR Contract"),
                data.get("plain_body", ""),
                data.get("html_body", "")
            )
        except Exception as e:
            print(f"[EmailAgent] Gemini drafting failed ({e}), using built-in design template.")
            return self._build_template_email(candidate_name, job_title, scorecard_data, is_selected)

    def _build_template_email(
        self,
        candidate_name: str,
        job_title: str,
        scorecard_data: Dict[str, Any],
        is_selected: bool
    ) -> tuple[str, str, str]:
        """Provides a bulletproof high-aesthetic built-in HTML & text fallback email without disclosing scores."""
        strengths = scorecard_data.get("strengths", ["System Architecture", "Technical Reasoning"])
        strengths_li = "".join([f"<li style='margin-bottom:6px;'>{s}</li>" for s in strengths])

        if is_selected:
            subject = f"Official Selection Decision: {job_title} at HR Contract"
            badge_color = "#10b981"
            badge_bg = "rgba(16, 185, 129, 0.15)"
            badge_text = "OFFICIAL STATUS: SELECTED FOR HIRE"
            headline = f"Congratulations, {candidate_name}!"
            main_message = (
                f"Following your technical bar-raiser interview with David, we are pleased to inform you that you have been "
                f"<strong>officially selected</strong> for the position of <strong>{job_title}</strong> at HR Contract."
            )
            next_steps = (
                "<div style='background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:16px; margin:18px 0;'>"
                "<h4 style='color:#166534; margin:0 0 8px 0;'>🚀 Next Steps</h4>"
                "<p style='color:#15803d; margin:0; font-size:14px; line-height:1.5;'>"
                "Our Talent Acquisition team is currently preparing your formal offer letter and onboarding package. "
                "A representative will contact you within 24–48 hours to discuss compensation, starting dates, and contract finalization."
                "</p></div>"
            )
            plain_message = (
                f"Congratulations, {candidate_name}!\n\n"
                f"Following your technical bar-raiser interview with David, we are pleased to inform you that you have been "
                f"OFFICIALLY SELECTED for the position of {job_title} at HR Contract.\n\n"
                f"Our team was impressed by your expertise in {', '.join(strengths[:2]) if strengths else 'technical reasoning'}.\n\n"
                f"Next Steps: Our Talent Acquisition team will reach out within 24-48 business hours with formal offer terms and onboarding logistics."
            )
        else:
            subject = f"Interview Outcome & Appreciation: {job_title} - HR Contract"
            badge_color = "#64748b"
            badge_bg = "rgba(100, 116, 139, 0.12)"
            badge_text = "STATUS: INTERVIEW PROCESS COMPLETED"
            headline = f"Dear {candidate_name},"
            main_message = (
                f"Thank you so much for taking the time, energy, and dedication to interview for the <strong>{job_title}</strong> role at HR Contract. "
                f"We genuinely enjoyed learning about your background and technical journey.<br><br>"
                f"After careful review by our evaluation panel, we have decided not to advance your application for this particular opening at this time. "
                f"Please know that our selection was exceptionally competitive and this decision in no way diminishes the commendable skills you showcased."
            )
            next_steps = (
                "<div style='background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:18px; margin:18px 0;'>"
                "<h4 style='color:#0f172a; margin:0 0 8px 0;'>🌱 We Would Love to Connect Again</h4>"
                "<p style='color:#334155; margin:0 0 10px 0; font-size:14px; line-height:1.6;'>"
                "We truly appreciate the enthusiasm and authenticity you brought to our conversation. "
                "As our engineering teams and products expand, new opportunities frequently emerge."
                "</p>"
                "<p style='color:#334155; margin:0; font-size:14px; line-height:1.6;'>"
                "<strong>We warmly invite you to apply again after a few months (3–6 months).</strong> "
                "We keep your profile in our active talent network, and we look forward to crossing paths again as you continue to build and grow."
                "</p></div>"
            )
            plain_message = (
                f"Dear {candidate_name},\n\n"
                f"Thank you so much for taking the time and effort to interview for the {job_title} position at HR Contract. We truly appreciated the opportunity to learn about your background, experience, and engineering perspective.\n\n"
                f"After thoughtful consideration by our hiring committee, we have decided not to move forward with your candidacy for this specific opening at this time. The selection was highly competitive, and this decision does not take away from the strong skills and potential you demonstrated.\n\n"
                f"We would love to stay in touch! We warmly encourage you to keep developing your craft and invite you to re-apply after a few months (in 3 to 6 months) as new roles and projects open up. We have retained your profile in our talent community for future consideration.\n\n"
                f"We sincerely appreciate your interest in HR Contract and wish you all the best in your continued endeavors."
            )

        html_body = f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }}
.container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}
.header {{ background: #070c18; padding: 28px 32px; border-bottom: 2px solid #38bdf8; }}
.brand {{ font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px; }}
.brand-sub {{ color: #38bdf8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }}
.content {{ padding: 32px; }}
.badge {{ display: inline-block; padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 700; background: {badge_bg}; color: {badge_color}; border: 1px solid {badge_color}; margin-bottom: 20px; }}
.role-box {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin: 20px 0; }}
.footer {{ background: #f8fafc; padding: 20px 32px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center; }}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="brand">⚡ HR CONTRACT</div>
    <div class="brand-sub">Autonomous Technical Hiring & Evaluation Portal</div>
  </div>
  <div class="content">
    <div class="badge">{badge_text}</div>
    <h2 style="color: #0f172a; margin-top: 0;">{headline}</h2>
    <p style="font-size: 15px; line-height: 1.6; color: #334155;">{main_message}</p>
    
    <div class="role-box">
      <div style="font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase;">Evaluated Role: <strong style="color: #0f172a;">{job_title}</strong></div>
    </div>

    <div style="margin: 20px 0;">
      <h4 style="margin: 0 0 8px 0; color: #0f172a; font-size: 14px;">Key Strengths Noted by our Interview Panel:</h4>
      <ul style="color: #475569; font-size: 14px; padding-left: 20px;">
        {strengths_li}
      </ul>
    </div>

    {next_steps}

    <p style="font-size: 14px; color: #64748b; margin-top: 24px;">
      Warm regards,<br>
      <strong>HR Contract Talent Acquisition Committee</strong><br>
      <em>In collaboration with David, Senior Technical AI Bar-Raiser</em>
    </p>
  </div>
  <div class="footer">
    Sent by HR Contract Talent Acquisition.<br>
    All evaluations are conducted according to strict anti-bias and objective technical benchmarks.
  </div>
</div>
</body>
</html>
"""
        return subject, plain_message, html_body

    def send_email_smtp(self, to_email: str, subject: str, plain_body: str, html_body: str) -> tuple[bool, str]:
        """
        Sends an email using standard SMTP with TLS/SSL encryption.
        If SMTP credentials are not configured, records as simulated delivery.
        """
        if not self.is_smtp_configured():
            return False, "SMTP credentials (SMTP_USER / SMTP_PASSWORD) not configured in .env. Dispatched to local audit outbox."

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{self.sender_name} <{self.sender_email}>"
            msg["To"] = to_email

            part1 = MIMEText(plain_body, "plain", "utf-8")
            part2 = MIMEText(html_body, "html", "utf-8")
            msg.attach(part1)
            msg.attach(part2)

            if self.smtp_port == 465:
                server = smtplib.SMTP_SSL(self.smtp_host, self.smtp_port, timeout=15)
            else:
                server = smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=15)
                server.starttls()

            server.login(self.smtp_user, self.smtp_pass)
            server.sendmail(self.sender_email, [to_email], msg.as_string())
            server.quit()
            return True, f"Successfully dispatched via SMTP to {to_email}"
        except Exception as e:
            return False, f"SMTP delivery failed: {str(e)}"


# Singleton instance
_email_agent_instance: Optional[EmailAgent] = None

def get_email_agent() -> EmailAgent:
    global _email_agent_instance
    if _email_agent_instance is None:
        _email_agent_instance = EmailAgent()
    return _email_agent_instance


def _background_dispatch_worker(
    job_id: str,
    client: Optional[genai.Client],
    model: str,
    delay_seconds: int = 120
) -> None:
    """
    Background worker thread:
    - Waits for delay_seconds (2 minutes)
    - Triggers email generation and dispatch
    - Updates job status
    """
    time.sleep(delay_seconds)

    with _job_lock:
        if job_id not in _email_jobs:
            return
        job = _email_jobs[job_id]
        if job["status"] == "CANCELLED" or job["status"] == "DELIVERED":
            return
        job["status"] = "SENDING"

    agent = get_email_agent()

    # Generate personalized email if not yet drafted
    if not job.get("subject") or not job.get("html_body"):
        subject, plain, html = agent.draft_email_with_gemini(
            client=client,
            model=model,
            candidate_name=job["candidate_name"],
            job_title=job["job_title"],
            scorecard_data=job["scorecard"],
            is_selected=job["is_selected"]
        )
        job["subject"] = subject
        job["plain_body"] = plain
        job["html_body"] = html

    # Send via SMTP or simulate
    smtp_success, msg = agent.send_email_smtp(
        to_email=job["candidate_email"],
        subject=job["subject"],
        plain_body=job["plain_body"],
        html_body=job["html_body"]
    )

    with _job_lock:
        job["dispatched_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        job["status"] = "DELIVERED"
        job["delivery_type"] = "SMTP_LIVE" if smtp_success else "AUDIT_OUTBOX"
        job["delivery_log"] = msg

    save_dispatch_to_disk(job)
    print(f"[EmailAgent] Job {job_id} dispatched to {job['candidate_email']}: {msg}")


def queue_post_interview_email(
    candidate_name: str,
    candidate_email: str,
    job_title: str,
    scorecard_data: Dict[str, Any],
    client: Optional[genai.Client] = None,
    model: str = "gemini-3.5-flash-lite",
    delay_seconds: int = 120
) -> Dict[str, Any]:
    """
    Enqueues an automated decision email to be sent after delay_seconds (default 120s / 2 minutes).
    Returns the job tracking dictionary.
    """
    agent = get_email_agent()
    is_selected, verdict_label = agent.determine_selection_verdict(scorecard_data)

    job_id = f"email_{int(time.time())}_{candidate_name.lower().replace(' ', '_')}"
    scheduled_time = datetime.fromtimestamp(time.time() + delay_seconds).strftime("%H:%M:%S")

    # Pre-draft email content so user can immediately preview or instant-send
    subject, plain, html = agent.draft_email_with_gemini(
        client=client,
        model=model,
        candidate_name=candidate_name,
        job_title=job_title,
        scorecard_data=scorecard_data,
        is_selected=is_selected
    )

    job = {
        "job_id": job_id,
        "candidate_name": candidate_name,
        "candidate_email": candidate_email,
        "job_title": job_title,
        "is_selected": is_selected,
        "verdict_label": verdict_label,
        "scorecard": scorecard_data,
        "status": "QUEUED",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "scheduled_for": scheduled_time,
        "delay_seconds": delay_seconds,
        "target_timestamp": time.time() + delay_seconds,
        "subject": subject,
        "plain_body": plain,
        "html_body": html,
        "delivery_type": "PENDING",
        "delivery_log": f"Scheduled to dispatch automatically in {delay_seconds} seconds (~2 minutes)."
    }

    with _job_lock:
        _email_jobs[job_id] = job

    save_dispatch_to_disk(job)

    # Launch daemon background timer thread
    t = threading.Thread(
        target=_background_dispatch_worker,
        args=(job_id, client, model, delay_seconds),
        daemon=True
    )
    t.start()

    return job


def get_email_job(job_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves an active or completed email job by ID."""
    with _job_lock:
        if job_id in _email_jobs:
            return _email_jobs[job_id]
    disk_jobs = load_dispatches_from_disk()
    return disk_jobs.get(job_id)


def trigger_immediate_dispatch(job_id: str) -> Optional[Dict[str, Any]]:
    """
    Bypasses the 2-minute delay and dispatches the email immediately.
    Useful for demos, tests, and immediate evaluation.
    """
    job = get_email_job(job_id)
    if not job:
        return None

    if job["status"] == "DELIVERED":
        return job

    agent = get_email_agent()
    smtp_success, msg = agent.send_email_smtp(
        to_email=job["candidate_email"],
        subject=job["subject"],
        plain_body=job["plain_body"],
        html_body=job["html_body"]
    )

    with _job_lock:
        job["dispatched_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        job["status"] = "DELIVERED"
        job["delivery_type"] = "SMTP_LIVE" if smtp_success else "AUDIT_OUTBOX"
        job["delivery_log"] = msg
        _email_jobs[job_id] = job

    save_dispatch_to_disk(job)
    return job
