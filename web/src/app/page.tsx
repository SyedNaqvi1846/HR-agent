"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  User,
  CheckCircle2,
  Clock,
  Send,
  RefreshCw,
  Download,
  ShieldCheck,
  Code2,
  Mail,
  ChevronDown,
  Sparkles,
  Bot,
  Terminal,
  ExternalLink,
  Key
} from "lucide-react";

interface Candidate {
  fullName: string;
  email: string;
  skills: string[];
  yearsExperience: number;
  summary: string;
}

interface Scorecard {
  verdict: string;
  overallScore: number;
  technicalRating: number;
  communicationRating: number;
  problemSolvingRating: number;
  strengths: string[];
  areasOfConcern: string[];
  executiveSummary: string;
}

interface EmailJob {
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

interface Message {
  role: "assistant" | "user";
  content: string;
}

const ROLES = [
  {
    title: "Python Developer",
    skills: ["Python 3.12", "FastAPI", "Asyncio", "SQL / ORM", "Pytest", "Redis"],
    exp: 2,
    badgeColor: "border-sky-500/40 text-sky-400 bg-sky-500/10"
  },
  {
    title: "Full-Stack Engineer",
    skills: ["TypeScript", "React 19", "Node.js", "PostgreSQL", "Docker", "GraphQL"],
    exp: 3,
    badgeColor: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
  },
  {
    title: "Data Scientist / AI Engineer",
    skills: ["Python", "PyTorch", "Scikit-Learn", "LLMs / RAG", "SQL", "Pandas"],
    exp: 2,
    badgeColor: "border-purple-500/40 text-purple-400 bg-purple-500/10"
  },
  {
    title: "Customer Service Representative",
    skills: ["Customer Support", "CRM Systems", "Conflict Resolution", "SLA Management"],
    exp: 1,
    badgeColor: "border-amber-500/40 text-amber-400 bg-amber-500/10"
  }
];

export default function Home() {
  // App state
  const [selectedRole, setSelectedRole] = useState(ROLES[0].title);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [demoId, setDemoId] = useState<string>("");
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [apiKey, setApiKey] = useState<string>("");
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem("hr_gemini_api_key");
    if (saved) setApiKey(saved);
  }, []);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isAITyping, setIsAITyping] = useState(false);
  const [qCount, setQCount] = useState(0);
  const maxQ = 3;

  // Evaluation & Email state
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [emailJob, setEmailJob] = useState<EmailJob | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(120);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAITyping]);

  // Timer countdown
  useEffect(() => {
    if (!emailJob || emailJob.status === "DELIVERED") return;
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, emailJob.targetTimestamp - now);
      setTimeLeft(remaining);
      if (remaining === 0 && emailJob.status === "QUEUED") {
        handleTriggerEmail();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [emailJob]);

  // Handle CV Ingest
  const handleStartInterview = async () => {
    if (!uploadedFile) {
      alert("Please upload a candidate CV / resume (PDF, DOCX, or TXT) to begin.");
      return;
    }

    setIsIngesting(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);

      const headers: Record<string, string> = {};
      if (apiKey.trim()) headers["x-gemini-api-key"] = apiKey.trim();

      const res = await fetch("/api/ingest", {
        method: "POST",
        headers,
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse resume.");

      const parsedCandidate: Candidate = data.candidate;
      setCandidate(parsedCandidate);
      setInterviewStarted(true);

      const greeting = `Hello ${parsedCandidate.fullName}. 👋 My name is David, your Technical AI HR Recruiter for today. Welcome to your formal interview for the ${selectedRole} position at HR Contract.\n\nI have reviewed your CV, and your contact email (${parsedCandidate.email}) has been automatically indexed. To begin, please introduce yourself, summarizing your professional engineering background and core technical expertise.`;

      setMessages([{ role: "assistant", content: greeting }]);
    } catch (err: any) {
      if (err.message && err.message.includes("GEMINI_API_KEY")) {
        setShowKeyModal(true);
      } else {
        alert(`Error initializing interview: ${err.message}`);
      }
    } finally {
      setIsIngesting(false);
    }
  };

  // Submit interview response
  const handleSendResponse = async () => {
    if (!userInput.trim() || isAITyping) return;

    const newMessages: Message[] = [...messages, { role: "user", content: userInput.trim() }];
    setMessages(newMessages);
    setUserInput("");
    setIsAITyping(true);

    const nextCount = qCount + 1;
    setQCount(nextCount);

    let stage = "JOB_QUESTIONS";
    if (nextCount === maxQ) stage = "ASK_CANDIDATE_QUERIES";
    if (nextCount > maxQ) stage = "CONCLUSION";

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey.trim()) headers["x-gemini-api-key"] = apiKey.trim();

      const res = await fetch("/api/interview", {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: newMessages,
          candidate,
          jobTitle: selectedRole,
          questionCount: nextCount,
          maxQuestions: maxQ,
          stage
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Interviewer failed to respond.");

      const updatedMessages: Message[] = [...newMessages, { role: "assistant", content: data.text }];
      setMessages(updatedMessages);

      // If finished, trigger automatic evaluation
      if (nextCount > maxQ) {
        triggerEvaluation(updatedMessages);
      }
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("GEMINI_API_KEY")) {
        setShowKeyModal(true);
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Thank you for the detailed response. Let us continue with the technical discussion." }
      ]);
    } finally {
      setIsAITyping(false);
    }
  };

  // Trigger evaluation
  const triggerEvaluation = async (finalMessages: Message[]) => {
    setIsEvaluating(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey.trim()) headers["x-gemini-api-key"] = apiKey.trim();

      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: finalMessages,
          candidate,
          jobTitle: selectedRole
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Evaluation failed.");

      setScorecard(data.scorecard);
      setEmailJob(data.emailJob);
    } catch (err: any) {
      if (err.message && err.message.includes("GEMINI_API_KEY")) {
        setShowKeyModal(true);
      } else {
        alert(`Evaluation error: ${err.message}`);
      }
    } finally {
      setIsEvaluating(false);
    }
  };

  // Trigger immediate email dispatch
  const handleTriggerEmail = async () => {
    if (!emailJob) return;
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: emailJob.jobId })
      });
      const data = await res.json();
      if (data.job) setEmailJob(data.job);
    } catch (err) {
      console.error("Manual email dispatch failed:", err);
    }
  };

  const currentRoleObj = ROLES.find((r) => r.title === selectedRole) || ROLES[0];

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 max-w-7xl mx-auto">
      {/* Top Navbar */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-8 border-b border-sky-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Sparkles className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-white">HR CONTRACT</span>
              <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
                PROD-READY
              </span>
            </div>
            <p className="text-xs text-slate-400">Autonomous Bar-Raiser Interviewer & Screening Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowKeyModal(true)}
            className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
              apiKey
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>{apiKey ? "API Key Configured" : "Set API Key"}</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
            <span className="pulse-dot"></span>
            <span>PUBLIC DEPLOYMENT READY</span>
          </div>
          {interviewStarted && (
            <button
              onClick={() => {
                setInterviewStarted(false);
                setCandidate(null);
                setMessages([]);
                setScorecard(null);
                setEmailJob(null);
                setQCount(0);
              }}
              className="text-xs font-mono px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Candidate</span>
            </button>
          )}
        </div>
      </header>

      {/* Screen 1: Welcome & Intake Station */}
      {!interviewStarted ? (
        <div className="space-y-8">
          {/* Hero Banner */}
          <section className="terminal-box p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-sky-500/20">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-mono font-semibold">
                <span className="pulse-dot"></span>
                <span>CANDIDATE INTERVIEW PORTAL</span>
              </div>
              <div className="text-xs font-mono text-slate-400">
                INTERVIEWER: <span className="text-rose-400 font-bold">DAVID (AI BAR-RAISER)</span>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 items-start">
              <div className="md:col-span-2 space-y-4">
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-sky-300 bg-clip-text text-transparent">
                  Welcome to Your Technical Interview 👋
                </h1>
                <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                  You are about to undergo a high-standard, autonomous engineering assessment designed to evaluate real-world system architecture, concurrency, and trade-offs.
                </p>
                <div className="text-xs text-slate-400 bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
                  💡 In accordance with our official hiring policy, <b>no hints or examples are provided</b>. David will challenge your code choices and failure mode handling directly.
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5 text-xs text-slate-300">
                <div className="font-mono text-sky-400 font-bold uppercase tracking-wider text-[11px]">
                  // What to Expect
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sky-400 font-bold font-mono">01.</span>
                  <span><b>CV Ingestion:</b> Auto-extracts identity & contact email without prompting.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 font-bold font-mono">02.</span>
                  <span><b>Technical Rigor:</b> 3 demanding architectural questions.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold font-mono">03.</span>
                  <span><b>Zero Hints:</b> Pure unassisted problem solving.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold font-mono">04.</span>
                  <span><b>Automated Decision:</b> Scorecard + auto-email dispatch.</span>
                </div>
              </div>
            </div>
          </section>

          {/* Step 1 Intake Form */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left Column: CV Upload */}
            <div className="glass-card p-6 space-y-5">
              <div className="flex items-center gap-2 font-bold text-slate-200 text-base">
                <Upload className="w-5 h-5 text-sky-400" />
                <span>Upload Candidate CV / Resume</span>
              </div>

              {/* Upload Dropzone */}
              <label className="border-2 border-dashed border-sky-500/30 hover:border-sky-500/60 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-950/70 min-h-[220px]">
                <Upload className="w-10 h-10 text-sky-400 mb-3 animate-bounce" />
                <span className="text-base font-semibold text-slate-200 text-center">
                  {uploadedFile ? uploadedFile.name : "Click or drag resume here (PDF, DOCX, or TXT)"}
                </span>
                <span className="text-xs text-slate-500 mt-2 text-center">
                  Supports .pdf, .docx, and .txt formats with automated text parsing
                </span>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setUploadedFile(e.target.files[0]);
                      setDemoId("");
                    }
                  }}
                />
              </label>
            </div>

            {/* Right Column: Role Benchmarks */}
            <div className="glass-card p-6 space-y-5">
              <div className="flex items-center gap-2 font-bold text-slate-200 text-base">
                <Code2 className="w-5 h-5 text-indigo-400" />
                <span>Select Target Job Vacancy</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ROLES.map((role) => (
                  <button
                    key={role.title}
                    type="button"
                    onClick={() => setSelectedRole(role.title)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedRole === role.title
                        ? "bg-indigo-500/15 border-indigo-400 shadow-md shadow-indigo-500/10"
                        : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="font-semibold text-sm text-white">{role.title}</div>
                    <div className="text-xs text-slate-400 mt-1">{role.exp}+ Years Benchmark</div>
                  </button>
                ))}
              </div>

              {/* Benchmarks Preview */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 uppercase font-bold">// Target Core Tech Stack</span>
                  <span className="text-emerald-400 font-bold">Policy RAG: ACTIVE</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {currentRoleObj.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 text-xs rounded-md font-mono bg-slate-900 text-sky-300 border border-sky-500/20"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Start Button */}
              <button
                type="button"
                disabled={isIngesting || !uploadedFile}
                onClick={handleStartInterview}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-sky-400 via-indigo-300 to-emerald-400 hover:opacity-95 transition-all shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isIngesting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing CV & Calibrating Benchmarks...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Begin AI Bar-Raiser Interview</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Screen 2: Interactive Interview Console & Scorecard Suite */
        <div className="space-y-6">
          {/* Candidate Context Strip */}
          <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-4 border border-sky-500/20">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-sky-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{candidate?.fullName}</span>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    {candidate?.email}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Role: <b className="text-slate-200">{selectedRole}</b> | Questions: <b className="text-sky-400">{Math.min(qCount, maxQ)} of {maxQ}</b>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-slate-400">STATUS:</span>
              <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                {scorecard ? "COMPLETED" : "LIVE INTERVIEW"}
              </span>
            </div>
          </div>

          {/* Main Interview & Scorecard Grid */}
          <div className="grid lg:grid-cols-3 gap-6 items-start">
            {/* Left 2 Cols: Live Terminal Chat */}
            <div className="lg:col-span-2 terminal-box overflow-hidden flex flex-col h-[650px]">
              {/* Window Header */}
              <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
                  <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                  <span className="ml-2 text-slate-400">david_interview_session.sh</span>
                </div>
                <span className="text-sky-400 font-bold">ZERO HINTS ENFORCED</span>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 font-mono text-xs md:text-sm">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl max-w-[92%] leading-relaxed ${
                      m.role === "assistant"
                        ? "bg-slate-900/90 border border-sky-500/25 text-slate-200 mr-auto"
                        : "bg-indigo-950/60 border border-indigo-500/40 text-indigo-100 ml-auto shadow-md"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold mb-1.5 opacity-70">
                      {m.role === "assistant" ? (
                        <>
                          <Bot className="w-3.5 h-3.5 text-sky-400" />
                          <span className="text-sky-400 uppercase">David (Bar-Raiser)</span>
                        </>
                      ) : (
                        <>
                          <User className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="text-indigo-400 uppercase">{candidate?.fullName || "Candidate"}</span>
                        </>
                      )}
                    </div>
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  </div>
                ))}

                {isAITyping && (
                  <div className="p-4 rounded-xl max-w-[80%] bg-slate-900 border border-sky-500/20 text-slate-400 mr-auto flex items-center gap-2">
                    <span className="pulse-dot"></span>
                    <span className="text-xs font-mono">David is analyzing technical depth & formulating next challenge...</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input */}
              {!scorecard && (
                <div className="p-4 bg-slate-950 border-t border-slate-800">
                  <div className="flex gap-2">
                    <textarea
                      rows={2}
                      value={userInput}
                      disabled={isAITyping || isEvaluating}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendResponse();
                        }
                      }}
                      placeholder="Type your technical answer with architecture tradeoffs and code mechanics... (Enter to send)"
                      className="flex-1 bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl p-3 text-xs md:text-sm text-slate-200 placeholder-slate-500 focus:outline-none resize-none font-mono"
                    />
                    <button
                      type="button"
                      disabled={isAITyping || !userInput.trim() || isEvaluating}
                      onClick={handleSendResponse}
                      className="px-5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 font-bold text-slate-950 hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Col: Scorecard & Autonomous Email Dispatcher */}
            <div className="space-y-6">
              {isEvaluating ? (
                <div className="glass-card p-6 text-center space-y-4">
                  <RefreshCw className="w-8 h-8 text-sky-400 animate-spin mx-auto" />
                  <div className="font-bold text-white text-base">Hiring Committee Evaluation in Progress...</div>
                  <p className="text-xs text-slate-400">
                    Auditing interview transcript against Company Hiring Policy, grading architectural reasoning, and scheduling decision dispatch.
                  </p>
                </div>
              ) : scorecard && emailJob ? (
                <div className="space-y-5">
                  {/* Verdict Card */}
                  <div className={`p-5 rounded-xl border ${
                    emailJob.isSelected
                      ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                      : "bg-amber-950/40 border-amber-500/40 text-amber-300"
                  }`}>
                    <div className="text-xs font-mono font-bold uppercase tracking-wider mb-1">
                      Final Assessment Verdict
                    </div>
                    <div className="text-xl font-extrabold flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>{emailJob.verdictLabel}</span>
                    </div>
                    <p className="text-xs mt-2 text-slate-300 leading-relaxed">
                      {scorecard.executiveSummary}
                    </p>
                  </div>

                  {/* Ratings Matrix */}
                  <div className="glass-card p-4 space-y-3">
                    <div className="text-xs font-mono text-slate-400 font-bold uppercase">
                      Evaluation Breakdown
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-xs text-slate-400">Technical</div>
                        <div className="text-base font-bold text-sky-400">{scorecard.technicalRating}/10</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-xs text-slate-400">Problem Solving</div>
                        <div className="text-base font-bold text-purple-400">{scorecard.problemSolvingRating}/10</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-xs text-slate-400">Communication</div>
                        <div className="text-base font-bold text-emerald-400">{scorecard.communicationRating}/10</div>
                      </div>
                    </div>
                  </div>

                  {/* Autonomous Email Dispatcher */}
                  <div className="glass-card p-5 space-y-4 border-sky-500/30">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-1.5 text-sky-400 font-bold">
                        <Mail className="w-4 h-4" />
                        <span>AUTONOMOUS EMAIL DISPATCH</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        emailJob.status === "DELIVERED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      }`}>
                        {emailJob.status === "DELIVERED" ? "✓ DISPATCHED" : `⏳ ${timeLeft}s REMAINING`}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 space-y-1">
                      <div><b>Recipient:</b> <span className="font-mono text-sky-300">{emailJob.candidateEmail}</span></div>
                      <div><b>Subject:</b> <span className="text-slate-400">{emailJob.subject}</span></div>
                      <div className="text-[11px] text-slate-400 mt-1">{emailJob.deliveryLog}</div>
                    </div>

                    {emailJob.status !== "DELIVERED" ? (
                      <button
                        type="button"
                        onClick={handleTriggerEmail}
                        className="w-full py-2.5 px-4 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs font-mono transition-all flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Send Email Now (Bypass 2-min timer)</span>
                      </button>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono text-center">
                        ✓ Dispatched successfully to candidate
                      </div>
                    )}

                    {/* Email Live Preview Toggle */}
                    <button
                      type="button"
                      onClick={() => setShowEmailPreview(!showEmailPreview)}
                      className="w-full text-xs text-sky-400 hover:text-sky-300 font-mono py-1 flex items-center justify-center gap-1"
                    >
                      <span>{showEmailPreview ? "Hide Rendered Email" : "Preview Candidate Email Copy"}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showEmailPreview ? "rotate-180" : ""}`} />
                    </button>

                    {showEmailPreview && (
                      <div className="mt-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 max-h-60 overflow-y-auto font-mono whitespace-pre-wrap">
                        <div className="text-slate-500 mb-2">// Subject: {emailJob.subject}</div>
                        {emailJob.plainBody}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Pre-evaluation standby card */
                <div className="glass-card p-6 space-y-4">
                  <div className="font-mono text-xs text-slate-400 font-bold uppercase tracking-wider">
                    // Active Evaluation Engine
                  </div>
                  <div className="space-y-2 text-xs text-slate-300">
                    <p>• <b>Anti-Bias Sanitization:</b> Active</p>
                    <p>• <b>Policy RAG Anchors:</b> Hiring policy.txt</p>
                    <p>• <b>Email Dispatch:</b> 2-minute timer on finish</p>
                    <p>• <b>Candidate Score:</b> Kept internal; never disclosed</p>
                    <p>• <b>Reapply Invitation:</b> 3-6 months for non-selected</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-slate-800/80 text-center text-xs text-slate-500 space-y-2">
        <p>HR Contract Autonomous Technical Hiring & Bar-Raiser Portal • Built with Next.js 16 & Google GenAI</p>
        <p>Demographics Sanitized • Anti-Bias Verified • Zero-Hint Technical Evaluation Standard</p>
      </footer>

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-card max-w-md w-full p-6 space-y-4 border-sky-500/40 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 font-bold text-white text-base">
                <Key className="w-5 h-5 text-amber-400" />
                <span>Gemini API Key Setup</span>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
              <p>
                To power the autonomous interview and scoring models, the app needs a Google Gemini API Key.
              </p>

              <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-200">
                <div className="font-bold mb-1">Option 1: Add to Vercel (Recommended for Public Users)</div>
                <div className="text-[11px] text-slate-300">
                  In your Vercel Dashboard → Project Settings → <b>Environment Variables</b> → Add <b>GEMINI_API_KEY</b> with your key, then redeploy.
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                <div className="font-bold text-white mb-1">Option 2: Enter Key for This Browser</div>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste AI Studio Gemini Key (AIzaSy...)"
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 focus:border-sky-500 text-xs font-mono text-white outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem("hr_gemini_api_key", apiKey.trim());
                  setShowKeyModal(false);
                }}
                className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs font-mono transition-all"
              >
                Save & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
