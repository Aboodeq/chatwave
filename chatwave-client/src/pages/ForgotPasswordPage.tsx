import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  ArrowLeft,
  Loader2,
  MessageCircle,
  RefreshCw,
  CheckCircle2,
  Lock,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  requestPasswordOtp,
  resetPasswordWithOtp,
  verifyPasswordOtp,
} from "../api/auth";

type Step = "email" | "otp" | "reset" | "success";

type ApiError = {
  response?: {
    data?: {
      message?: string;
      errors?: Record<string, string[]>;
    };
  };
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  const data = (error as ApiError).response?.data;
  const firstError = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined;
  return firstError ?? data?.message ?? fallback;
};

export default function ForgotPasswordPage() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpErr, setOtpErr] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [passwordErr, setPasswordErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Particle canvas — same system as LoginPage
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    const pts = Array.from({ length: 45 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.8 + 0.4,
      a: Math.random() * 0.45 + 0.1,
    }));
    let f = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      f++;
      for (let i = 0; i < 3; i++) {
        const p = (f * 0.003 + i * 0.33) % 1;
        ctx.beginPath();
        ctx.arc(
          canvas.width * 0.5,
          canvas.height * 0.5,
          p * Math.max(canvas.width, canvas.height) * 0.7,
          0,
          Math.PI * 2,
        );
        ctx.strokeStyle = `rgba(139,92,246,${(1 - p) * 0.06})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      pts.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167,139,250,${p.a})`;
        ctx.fill();
      });
      pts.forEach((a, i) =>
        pts.slice(i + 1).forEach((b) => {
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 110) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(167,139,250,${(1 - d / 110) * 0.1})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }),
      );
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Countdown timer
  const startCountdown = () => {
    setCountdown(60);
    setCanResend(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailErr("");
    setOtpErr("");
    setPasswordErr("");
    if (!email) {
      setEmailErr("Email address is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailErr("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      await requestPasswordOtp({ email });
      setStep("otp");
      setOtp(["", "", "", "", "", ""]);
      startCountdown();
      toast.success("Verification code sent.");
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (error) {
      setEmailErr(getApiErrorMessage(error, "Unable to send verification code."));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    setOtpErr("");
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      setOtpErr("");
      inputRefs.current[5]?.focus();
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) {
      setOtpErr("Please enter the complete 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      await verifyPasswordOtp({ email, otp: code });
      setPassword("");
      setPasswordConfirmation("");
      setPasswordErr("");
      setStep("reset");
      toast.success("Code verified.");
    } catch (error) {
      setOtpErr(getApiErrorMessage(error, "The verification code is invalid or expired."));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setLoading(true);
    try {
      await requestPasswordOtp({ email });
      setOtp(["", "", "", "", "", ""]);
      setOtpErr("");
      startCountdown();
      toast.success("New code sent.");
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (error) {
      setOtpErr(getApiErrorMessage(error, "Unable to resend verification code."));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErr("");

    if (password.length < 8) {
      setPasswordErr("Password must be at least 8 characters.");
      return;
    }

    if (password !== passwordConfirmation) {
      setPasswordErr("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await resetPasswordWithOtp({
        email,
        otp: otp.join(""),
        password,
        password_confirmation: passwordConfirmation,
      });
      if (timerRef.current) clearInterval(timerRef.current);
      setStep("success");
      toast.success("Password reset successfully.");
    } catch (error) {
      setPasswordErr(getApiErrorMessage(error, "Unable to reset password."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Fraunces:ital,wght@0,700;0,900;1,700&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

        @keyframes fadeUp    { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @keyframes gradShift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes shimmer   { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        @keyframes orbFloat  { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(20px,-15px) scale(1.04)} 66%{transform:translate(-15px,12px) scale(.97)} }
        @keyframes successPop{ 0%{opacity:0;transform:scale(.6)} 60%{transform:scale(1.1)} 100%{opacity:1;transform:scale(1)} }
        @keyframes ringPulse { 0%{transform:scale(1);opacity:.7} 100%{transform:scale(1.8);opacity:0} }
        @keyframes slideIn   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes otpShake  { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }

        .fw-up { opacity:0; animation:fadeUp .75s cubic-bezier(.16,1,.3,1) forwards; }

        .grad-text {
          background:linear-gradient(135deg,#a78bfa,#818cf8,#38bdf8);
          background-size:200%; -webkit-background-clip:text;
          -webkit-text-fill-color:transparent; background-clip:text;
          animation:gradShift 5s ease infinite;
        }

        .cta-btn {
          position:relative; overflow:hidden; border:none; cursor:pointer;
          background:linear-gradient(135deg,#7c3aed,#6366f1,#3b82f6);
          background-size:200%; animation:gradShift 4s ease infinite;
          color:#fff; font-weight:700; font-size:.9rem;
          border-radius:14px; padding:15px 24px; width:100%;
          font-family:'Outfit',sans-serif;
          transition:transform .25s ease,box-shadow .25s ease;
        }
        .cta-btn:hover:not(:disabled){
          transform:translateY(-3px);
          box-shadow:0 20px 50px rgba(124,58,237,.4),0 8px 20px rgba(99,102,241,.3);
        }
        .cta-btn:active:not(:disabled){ transform:translateY(-1px); }
        .cta-btn:disabled{ opacity:.65; cursor:not-allowed; }
        .cta-btn::after{
          content:''; position:absolute; top:0; left:0; width:60%; height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent);
          animation:shimmer 2.5s infinite; pointer-events:none;
        }

        .fw-input {
          width:100%; background:rgba(255,255,255,.06);
          border:1.5px solid rgba(255,255,255,.12); border-radius:14px;
          padding:13px 14px 13px 44px; font-size:.9rem; color:#f1f5f9;
          font-family:'Outfit',sans-serif; transition:all .25s ease;
        }
        .fw-input::placeholder{ color:rgba(148,163,184,.55); }
        .fw-input:focus{
          outline:none; background:rgba(255,255,255,.1);
          border-color:rgba(167,139,250,.7);
          box-shadow:0 0 0 4px rgba(139,92,246,.15),0 4px 20px rgba(139,92,246,.12);
        }

        .otp-input {
          width:52px; height:60px; border-radius:14px; text-align:center;
          font-size:1.5rem; font-weight:700; color:#f1f5f9; caret-color:#a78bfa;
          background:rgba(255,255,255,.06); border:1.5px solid rgba(255,255,255,.12);
          font-family:'Outfit',sans-serif; transition:all .2s ease;
        }
        .otp-input:focus{
          outline:none; background:rgba(167,139,250,.12);
          border-color:rgba(167,139,250,.8);
          box-shadow:0 0 0 4px rgba(139,92,246,.18),0 4px 20px rgba(139,92,246,.15);
          transform:scale(1.06);
        }
        .otp-input.filled{
          background:rgba(124,58,237,.15); border-color:rgba(167,139,250,.5);
        }
        .otp-input.error{
          border-color:rgba(248,113,113,.7); background:rgba(248,113,113,.08);
          animation:otpShake .4s ease;
        }

        .step-slide { animation:slideIn .5s cubic-bezier(.16,1,.3,1) forwards; }

        .success-icon { animation:successPop .6s cubic-bezier(.16,1,.3,1) forwards; }
        .success-ring {
          position:absolute; inset:-8px; border-radius:50%;
          border:2px solid rgba(167,139,250,.5);
          animation:ringPulse 2s ease-out infinite;
        }

        .back-link {
          display:inline-flex; align-items:center; gap:6px;
          color:rgba(148,163,184,.7); font-size:.85rem; font-weight:500;
          text-decoration:none; transition:color .2s ease; background:none; border:none;
          cursor:pointer; font-family:'Outfit',sans-serif; padding:0;
        }
        .back-link:hover{ color:#a78bfa; }

        .resend-btn {
          background:none; border:none; font-family:'Outfit',sans-serif;
          font-size:.85rem; font-weight:600; cursor:pointer;
          transition:color .2s ease; padding:0;
        }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Outfit',sans-serif",
          background: "#0a0a14",
          position: "relative",
          overflow: "hidden",
          padding: "1.5rem",
        }}
      >
        {/* BG orbs */}
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          <div
            style={{
              position: "absolute",
              width: "650px",
              height: "650px",
              borderRadius: "50%",
              top: "-180px",
              left: "-180px",
              background: "radial-gradient(circle,rgba(124,58,237,.22) 0%,transparent 70%)",
              animation: "orbFloat 12s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: "500px",
              height: "500px",
              borderRadius: "50%",
              bottom: "-120px",
              right: "-120px",
              background: "radial-gradient(circle,rgba(59,130,246,.16) 0%,transparent 70%)",
              animation: "orbFloat 15s ease-in-out infinite reverse",
            }}
          />
          <svg
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.04 }}
          >
            <filter id="noise2">
              <feTurbulence
                type="fractalNoise"
                baseFrequency=".65"
                numOctaves="3"
                stitchTiles="stitch"
              />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#noise2)" />
          </svg>
        </div>

        <canvas
          ref={canvasRef}
          style={{
            position: "fixed",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        />

        {/* Card */}
        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "460px" }}>
          {/* Logo */}
          <div
            className={mounted ? "fw-up" : "opacity-0"}
            style={{ animationDelay: ".05s", textAlign: "center", marginBottom: "2rem" }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg,#7c3aed,#3b82f6)",
                  boxShadow: "0 8px 24px rgba(124,58,237,.35)",
                }}
              >
                <MessageCircle size={20} color="white" />
              </div>
              <span
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 800,
                  color: "#f1f5f9",
                  letterSpacing: "-.02em",
                }}
              >
                ChatWave
              </span>
            </div>
          </div>

          {/* Glass card */}
          <div
            className={mounted ? "fw-up" : "opacity-0"}
            style={{
              animationDelay: ".12s",
              background: "rgba(255,255,255,.04)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,.09)",
              borderRadius: "24px",
              padding: "clamp(2rem,5vw,2.8rem)",
              boxShadow: "0 32px 80px rgba(0,0,0,.4),0 0 0 1px rgba(167,139,250,.08)",
            }}
          >
            {/* ── STEP: EMAIL ── */}
            {step === "email" && (
              <div className="step-slide">
                {/* Back */}
                <div style={{ marginBottom: "1.8rem" }}>
                  <Link to="/login" className="back-link">
                    <ArrowLeft size={15} /> Back to Sign In
                  </Link>
                </div>

                {/* Icon */}
                <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "center" }}>
                  <div style={{ position: "relative" }}>
                    <div
                      style={{
                        width: "72px",
                        height: "72px",
                        borderRadius: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background:
                          "linear-gradient(135deg,rgba(124,58,237,.25),rgba(59,130,246,.2))",
                        border: "1px solid rgba(167,139,250,.25)",
                      }}
                    >
                      <Mail size={30} color="#a78bfa" />
                    </div>
                  </div>
                </div>

                <h2
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontSize: "1.9rem",
                    fontWeight: 900,
                    color: "#f8fafc",
                    marginBottom: "8px",
                    textAlign: "center",
                  }}
                >
                  Forgot password?
                </h2>
                <p
                  style={{
                    color: "rgba(148,163,184,.75)",
                    fontSize: ".875rem",
                    lineHeight: 1.65,
                    textAlign: "center",
                    marginBottom: "2rem",
                  }}
                >
                  No worries. Enter your email address and we'll send you a 6-digit verification
                  code to reset your password.
                </p>

                <form onSubmit={handleEmailSubmit}>
                  <div style={{ marginBottom: "1.2rem" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: ".72rem",
                        fontWeight: 700,
                        color: "rgba(148,163,184,.8)",
                        textTransform: "uppercase",
                        letterSpacing: ".12em",
                        marginBottom: "8px",
                      }}
                    >
                      Email Address
                    </label>
                    <div style={{ position: "relative" }}>
                      <Mail
                        size={16}
                        color={email ? "#a78bfa" : "rgba(100,116,139,.7)"}
                        style={{
                          position: "absolute",
                          left: "14px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          transition: "color .2s",
                        }}
                      />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setEmailErr("");
                        }}
                        placeholder="you@example.com"
                        className="fw-input"
                        autoFocus
                      />
                    </div>
                    {emailErr && (
                      <p
                        style={{
                          color: "#f87171",
                          fontSize: ".78rem",
                          marginTop: "6px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span
                          style={{
                            width: "5px",
                            height: "5px",
                            borderRadius: "50%",
                            background: "#f87171",
                            flexShrink: 0,
                            display: "inline-block",
                          }}
                        />
                        {emailErr}
                      </p>
                    )}
                  </div>

                  <button type="submit" disabled={loading} className="cta-btn">
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      {loading ? (
                        <>
                          <Loader2 size={17} className="animate-spin" />
                          Sending code...
                        </>
                      ) : (
                        <>
                          Send Verification Code{" "}
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </>
                      )}
                    </span>
                  </button>
                </form>
              </div>
            )}

            {/* ── STEP: OTP ── */}
            {step === "otp" && (
              <div className="step-slide">
                {/* Back */}
                <div style={{ marginBottom: "1.8rem" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setOtp(["", "", "", "", "", ""]);
                      setOtpErr("");
                    }}
                    className="back-link"
                  >
                    <ArrowLeft size={15} /> Change email
                  </button>
                </div>

                {/* Icon */}
                <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "center" }}>
                  <div
                    style={{
                      width: "72px",
                      height: "72px",
                      borderRadius: "20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background:
                        "linear-gradient(135deg,rgba(124,58,237,.25),rgba(59,130,246,.2))",
                      border: "1px solid rgba(167,139,250,.25)",
                    }}
                  >
                    <svg
                      width="30"
                      height="30"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#a78bfa"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="5" y="2" width="14" height="20" rx="2" />
                      <path d="M12 18h.01" />
                      <path d="M8 6h8M8 10h8M8 14h4" />
                    </svg>
                  </div>
                </div>

                <h2
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontSize: "1.9rem",
                    fontWeight: 900,
                    color: "#f8fafc",
                    marginBottom: "8px",
                    textAlign: "center",
                  }}
                >
                  Check your inbox
                </h2>
                <p
                  style={{
                    color: "rgba(148,163,184,.75)",
                    fontSize: ".875rem",
                    lineHeight: 1.65,
                    textAlign: "center",
                    marginBottom: "6px",
                  }}
                >
                  We sent a 6-digit code to
                </p>
                <p
                  style={{
                    color: "#c4b5fd",
                    fontWeight: 700,
                    fontSize: ".95rem",
                    textAlign: "center",
                    marginBottom: "2rem",
                  }}
                >
                  {email}
                </p>

                <form onSubmit={handleOtpSubmit}>
                  {/* OTP inputs */}
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      justifyContent: "center",
                      marginBottom: "1.5rem",
                    }}
                    onPaste={handleOtpPaste}
                  >
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => {
                          inputRefs.current[i] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className={`otp-input ${digit ? "filled" : ""} ${otpErr ? "error" : ""}`}
                      />
                    ))}
                  </div>

                  {otpErr && (
                    <p
                      style={{
                        color: "#f87171",
                        fontSize: ".78rem",
                        marginBottom: "1rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <span
                        style={{
                          width: "5px",
                          height: "5px",
                          borderRadius: "50%",
                          background: "#f87171",
                          display: "inline-block",
                        }}
                      />
                      {otpErr}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="cta-btn"
                    style={{ marginBottom: "1.5rem" }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      {loading ? (
                        <>
                          <Loader2 size={17} className="animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          Verify Code{" "}
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </>
                      )}
                    </span>
                  </button>
                </form>

                {/* Resend */}
                <div style={{ textAlign: "center" }}>
                  {canResend ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <span style={{ color: "rgba(148,163,184,.65)", fontSize: ".85rem" }}>
                        Didn't receive it?
                      </span>
                      <button
                        onClick={handleResend}
                        disabled={loading}
                        className="resend-btn"
                        style={{
                          color: loading ? "rgba(167,139,250,.4)" : "#a78bfa",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <RefreshCw size={13} /> Resend code
                      </button>
                    </div>
                  ) : (
                    <p style={{ color: "rgba(148,163,184,.55)", fontSize: ".82rem" }}>
                      Resend code in{" "}
                      <span style={{ color: "#a78bfa", fontWeight: 700 }}>{countdown}s</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* STEP: RESET PASSWORD */}
            {step === "reset" && (
              <div className="step-slide">
                <div style={{ marginBottom: "1.8rem" }}>
                  <button type="button" onClick={() => setStep("otp")} className="back-link">
                    <ArrowLeft size={15} /> Back to code
                  </button>
                </div>

                <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "center" }}>
                  <div
                    style={{
                      width: "72px",
                      height: "72px",
                      borderRadius: "20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background:
                        "linear-gradient(135deg,rgba(124,58,237,.25),rgba(59,130,246,.2))",
                      border: "1px solid rgba(167,139,250,.25)",
                    }}
                  >
                    <Lock size={30} color="#a78bfa" />
                  </div>
                </div>

                <h2
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontSize: "1.9rem",
                    fontWeight: 900,
                    color: "#f8fafc",
                    marginBottom: "8px",
                    textAlign: "center",
                  }}
                >
                  Set a new password
                </h2>
                <p
                  style={{
                    color: "rgba(148,163,184,.75)",
                    fontSize: ".875rem",
                    lineHeight: 1.65,
                    textAlign: "center",
                    marginBottom: "2rem",
                  }}
                >
                  Choose a strong password for {email}. You will use it the next time you sign in.
                </p>

                <form onSubmit={handlePasswordReset}>
                  <div style={{ marginBottom: "1rem" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: ".72rem",
                        fontWeight: 700,
                        color: "rgba(148,163,184,.8)",
                        textTransform: "uppercase",
                        letterSpacing: ".12em",
                        marginBottom: "8px",
                      }}
                    >
                      New Password
                    </label>
                    <div style={{ position: "relative" }}>
                      <Lock
                        size={16}
                        color={password ? "#a78bfa" : "rgba(100,116,139,.7)"}
                        style={{
                          position: "absolute",
                          left: "14px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          transition: "color .2s",
                        }}
                      />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setPasswordErr("");
                        }}
                        placeholder="At least 8 characters"
                        className="fw-input"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: "1.2rem" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: ".72rem",
                        fontWeight: 700,
                        color: "rgba(148,163,184,.8)",
                        textTransform: "uppercase",
                        letterSpacing: ".12em",
                        marginBottom: "8px",
                      }}
                    >
                      Confirm Password
                    </label>
                    <div style={{ position: "relative" }}>
                      <Lock
                        size={16}
                        color={passwordConfirmation ? "#a78bfa" : "rgba(100,116,139,.7)"}
                        style={{
                          position: "absolute",
                          left: "14px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          transition: "color .2s",
                        }}
                      />
                      <input
                        type="password"
                        value={passwordConfirmation}
                        onChange={(e) => {
                          setPasswordConfirmation(e.target.value);
                          setPasswordErr("");
                        }}
                        placeholder="Repeat new password"
                        className="fw-input"
                      />
                    </div>
                  </div>

                  {passwordErr && (
                    <p
                      style={{
                        color: "#f87171",
                        fontSize: ".78rem",
                        marginBottom: "1rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <span
                        style={{
                          width: "5px",
                          height: "5px",
                          borderRadius: "50%",
                          background: "#f87171",
                          display: "inline-block",
                        }}
                      />
                      {passwordErr}
                    </p>
                  )}

                  <button type="submit" disabled={loading} className="cta-btn">
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      {loading ? (
                        <>
                          <Loader2 size={17} className="animate-spin" />
                          Updating password...
                        </>
                      ) : (
                        <>
                          Reset Password{" "}
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </>
                      )}
                    </span>
                  </button>
                </form>
              </div>
            )}

            {/* STEP: SUCCESS */}
            {step === "success" && (
              <div className="step-slide" style={{ textAlign: "center", padding: "1rem 0" }}>
                {/* Animated check */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.8rem" }}>
                  <div style={{ position: "relative", width: "80px", height: "80px" }}>
                    <div className="success-ring" />
                    <div
                      className="success-icon"
                      style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "linear-gradient(135deg,#7c3aed,#6366f1)",
                        boxShadow: "0 12px 40px rgba(124,58,237,.5)",
                      }}
                    >
                      <CheckCircle2 size={38} color="white" />
                    </div>
                  </div>
                </div>

                <h2
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontSize: "1.9rem",
                    fontWeight: 900,
                    color: "#f8fafc",
                    marginBottom: "10px",
                  }}
                >
                  Password <span className="grad-text">reset!</span>
                </h2>
                <p
                  style={{
                    color: "rgba(148,163,184,.75)",
                    fontSize: ".875rem",
                    lineHeight: 1.65,
                    marginBottom: "2rem",
                  }}
                >
                  Your password has been updated. Sign in again with your new credentials.
                </p>

                <div style={{ marginTop: "1.5rem" }}>
                  <Link to="/login" className="back-link" style={{ justifyContent: "center" }}>
                    <ArrowLeft size={15} /> Back to Sign In
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Trust */}
          <div
            className={mounted ? "fw-up" : "opacity-0"}
            style={{
              animationDelay: ".3s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              marginTop: "1.2rem",
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(100,116,139,.45)"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span style={{ color: "rgba(100,116,139,.45)", fontSize: ".75rem" }}>
              256-bit SSL · Your data stays private
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
