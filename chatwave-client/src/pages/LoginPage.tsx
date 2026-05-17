import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  MessageCircle,
  Zap,
  Users,
  Sparkles,
} from "lucide-react";
import { login } from "../api/auth";
import { useAuthStore } from "../stores/authStore";
import { useEffect, useRef, useState } from "react";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type FormData = z.infer<typeof schema>;

const features = [
  { icon: Zap, title: "Lightning Fast", desc: "Messages delivered in milliseconds." },
  { icon: Users, title: "Team Ready", desc: "Group chats and private conversations." },
  { icon: Sparkles, title: "Rich Experience", desc: "Reactions, replies, media built-in." },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mounted, setMounted] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

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
    const pts = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      r: Math.random() * 2.5 + 1,
      a: Math.random() * 0.4 + 0.2,
    }));
    let f = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      f++;
      for (let i = 0; i < 4; i++) {
        const p = (f * 0.003 + i * 0.25) % 1;
        ctx.beginPath();
        ctx.arc(
          canvas.width * 0.5,
          canvas.height * 0.5,
          p * Math.max(canvas.width, canvas.height) * 0.65,
          0,
          Math.PI * 2,
        );
        ctx.strokeStyle = `rgba(79,70,229,${(1 - p) * 0.15})`;
        ctx.lineWidth = 1.5;
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
        ctx.fillStyle = `rgba(79,70,229,${p.a})`;
        ctx.fill();
      });
      pts.forEach((a, i) =>
        pts.slice(i + 1).forEach((b) => {
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 130) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(99,102,241,${(1 - d / 130) * 0.2})`;
            ctx.lineWidth = 0.8;
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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });
  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate("/chat");
    },
    onError: () => toast.error("Invalid email or password."),
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Fraunces:wght@700;900&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

        @keyframes lp-up    { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes lp-left  { from{opacity:0;transform:translateX(-28px)} to{opacity:1;transform:translateX(0)} }
        @keyframes lp-right { from{opacity:0;transform:translateX(28px)} to{opacity:1;transform:translateX(0)} }
        @keyframes lp-grad  { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes lp-shimmer{ 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        @keyframes lp-orb1  { 0%,100%{transform:translate(0,0)} 50%{transform:translate(40px,-30px)} }
        @keyframes lp-orb2  { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-30px,40px)} }
        @keyframes lp-orb3  { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,25px)} }
        @keyframes lp-check { 0%{transform:scale(0)} 60%{transform:scale(1.2)} 100%{transform:scale(1)} }
        @keyframes lp-badge { 0%,100%{box-shadow:0 0 0 0 rgba(79,70,229,.35)} 50%{box-shadow:0 0 0 6px rgba(79,70,229,0)} }

        .lp-anim-up    { opacity:0; animation:lp-up    .75s cubic-bezier(.16,1,.3,1) forwards; }
        .lp-anim-left  { opacity:0; animation:lp-left  .75s cubic-bezier(.16,1,.3,1) forwards; }
        .lp-anim-right { opacity:0; animation:lp-right .75s cubic-bezier(.16,1,.3,1) forwards; }

        .lp-grad-text {
          background:linear-gradient(135deg,#4f46e5,#6366f1,#0ea5e9);
          background-size:200%; -webkit-background-clip:text;
          -webkit-text-fill-color:transparent; background-clip:text;
          animation:lp-grad 5s ease infinite;
        }

        .lp-btn {
          position:relative; overflow:hidden; border:none; cursor:pointer;
          background:linear-gradient(135deg,#4f46e5,#6366f1,#0ea5e9);
          background-size:200%; animation:lp-grad 4s ease infinite;
          color:#fff; font-weight:700; font-size:.9rem; letter-spacing:.02em;
          border-radius:14px; padding:15px 24px; width:100%;
          font-family:'Outfit',sans-serif;
          transition:transform .25s ease,box-shadow .25s ease;
        }
        .lp-btn:hover:not(:disabled){
          transform:translateY(-2px);
          box-shadow:0 16px 40px rgba(79,70,229,.28),0 6px 16px rgba(99,102,241,.2);
        }
        .lp-btn:active:not(:disabled){ transform:translateY(0); }
        .lp-btn:disabled{ opacity:.6; cursor:not-allowed; }
        .lp-btn::after{
          content:''; position:absolute; top:0; left:0; width:50%; height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent);
          animation:lp-shimmer 2.5s infinite; pointer-events:none;
        }

        .lp-input {
          width:100%; background:rgba(255,255,255,.85);
          border:1.5px solid #e2e8f0; border-radius:13px;
          padding:13px 14px 13px 44px; font-size:.9rem; color:#1e293b;
          font-family:'Outfit',sans-serif; transition:all .22s ease;
          box-shadow:0 1px 4px rgba(0,0,0,.05);
        }
        .lp-input::placeholder{ color:#94a3b8; }
        .lp-input:focus{
          outline:none; background:#fff; border-color:#6366f1;
          box-shadow:0 0 0 4px rgba(99,102,241,.1),0 2px 10px rgba(99,102,241,.08);
        }

        .lp-feat {
          display:flex; align-items:center; gap:14px; padding:14px 16px;
          border-radius:16px; background:rgba(255,255,255,.55);
          border:1px solid rgba(99,102,241,.1);
          transition:all .28s cubic-bezier(.16,1,.3,1);
        }
        .lp-feat:hover{
          background:rgba(255,255,255,.9); border-color:rgba(99,102,241,.22);
          transform:translateX(6px); box-shadow:0 4px 20px rgba(99,102,241,.1);
        }

        .lp-sep{
          width:1px;
          background:linear-gradient(to bottom,transparent,rgba(99,102,241,.55) 20%,rgba(99,102,241,.85) 50%,rgba(99,102,241,.55) 80%,transparent);
        }

        .lp-divider{ flex:1; height:1px; background:linear-gradient(90deg,transparent,rgba(99,102,241,.35),transparent); }

        .lp-ghost{
          display:flex; align-items:center; justify-content:center; gap:8px;
          width:100%; padding:13px; border-radius:13px;
          background:transparent; border:1.5px solid #e2e8f0;
          color:#64748b; font-size:.875rem; font-weight:600;
          font-family:'Outfit',sans-serif; cursor:pointer; text-decoration:none;
          transition:all .22s ease;
        }
        .lp-ghost:hover{
          border-color:#6366f1; background:rgba(99,102,241,.05);
          color:#4f46e5; transform:translateY(-1px);
          box-shadow:0 4px 16px rgba(99,102,241,.1);
        }

        .lp-check-wrap{ position:relative; width:20px; height:20px; flex-shrink:0; }
        .lp-check-wrap input{ position:absolute; opacity:0; width:100%; height:100%; cursor:pointer; margin:0; }
        .lp-check-box{
          width:20px; height:20px; border-radius:6px; border:1.5px solid #cbd5e1;
          background:#fff; display:flex; align-items:center; justify-content:center;
          transition:all .2s ease; pointer-events:none; box-shadow:0 1px 3px rgba(0,0,0,.06);
        }
        .lp-check-wrap input:checked ~ .lp-check-box{
          background:linear-gradient(135deg,#4f46e5,#6366f1); border-color:#4f46e5;
          box-shadow:0 4px 12px rgba(79,70,229,.28); animation:lp-check .3s cubic-bezier(.16,1,.3,1);
        }
        .lp-check-icon{ opacity:0; transform:scale(0); transition:all .2s ease; }
        .lp-check-wrap input:checked ~ .lp-check-box .lp-check-icon{ opacity:1; transform:scale(1); }

        .lp-root { display:flex; min-height:100vh; }
        .lp-left  { width:52%; display:flex; flex-direction:column; justify-content:space-between; padding:clamp(2rem,5vw,4.5rem); position:relative; overflow:hidden; }
        .lp-right { flex:1; display:flex; align-items:center; justify-content:center; padding:clamp(1.5rem,5vw,4rem); position:relative; z-index:1; overflow-y:auto; }

        @media(max-width:1023px){
          .lp-left{ display:none !important; }
          .lp-right{ width:100%; padding:1.75rem 1.5rem; align-items:flex-start; }
          .lp-mobile-logo{ display:flex !important; }
        }
        @media(min-width:1024px){ .lp-mobile-logo{ display:none !important; } }
      `}</style>

      <div
        className="lp-root"
        style={{
          background: "linear-gradient(135deg,#eef2ff 0%,#fafbff 45%,#eff6ff 100%)",
          fontFamily: "'Outfit',sans-serif",
        }}
      >
        {/* BG orbs */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            overflow: "hidden",
            zIndex: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              width: "650px",
              height: "650px",
              borderRadius: "50%",
              top: "-180px",
              left: "-160px",
              background: "radial-gradient(circle,rgba(99,102,241,.13) 0%,transparent 70%)",
              animation: "lp-orb1 14s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: "550px",
              height: "550px",
              borderRadius: "50%",
              bottom: "-130px",
              right: "-80px",
              background: "radial-gradient(circle,rgba(14,165,233,.1) 0%,transparent 70%)",
              animation: "lp-orb2 18s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: "380px",
              height: "380px",
              borderRadius: "50%",
              top: "38%",
              left: "42%",
              background: "radial-gradient(circle,rgba(139,92,246,.07) 0%,transparent 70%)",
              animation: "lp-orb3 12s ease-in-out infinite",
            }}
          />
        </div>

        {/* ── LEFT PANEL ── */}
        <div className="lp-left">
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
          />
          <div className="lp-sep" style={{ position: "absolute", right: 0, top: 0, bottom: 0 }} />

          {/* Logo */}
          <div
            className={mounted ? "lp-anim-left" : "opacity-0"}
            style={{ animationDelay: ".08s", position: "relative", zIndex: 1 }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg,#4f46e5,#0ea5e9)",
                  boxShadow: "0 8px 24px rgba(79,70,229,.25)",
                }}
              >
                <MessageCircle size={22} color="white" />
              </div>
              <span
                style={{
                  fontSize: "1.3rem",
                  fontWeight: 800,
                  color: "#1e293b",
                  letterSpacing: "-.02em",
                }}
              >
                ChatWave
              </span>
            </div>
          </div>

          {/* Hero */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              className={mounted ? "lp-anim-left" : "opacity-0"}
              style={{ animationDelay: ".18s", marginBottom: "10px" }}
            >
              <span
                style={{
                  fontSize: ".7rem",
                  fontWeight: 700,
                  color: "#6366f1",
                  letterSpacing: ".2em",
                  textTransform: "uppercase",
                }}
              >
                Real-time messaging platform
              </span>
            </div>
            <div
              className={mounted ? "lp-anim-left" : "opacity-0"}
              style={{ animationDelay: ".26s", marginBottom: "18px" }}
            >
              <h1
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontSize: "clamp(2.4rem,4vw,3.8rem)",
                  fontWeight: 900,
                  lineHeight: 1.08,
                  color: "#0f172a",
                  margin: 0,
                }}
              >
                Where great
                <br />
                conversations
                <br />
                <span className="lp-grad-text">begin.</span>
              </h1>
            </div>
            <div
              className={mounted ? "lp-anim-left" : "opacity-0"}
              style={{ animationDelay: ".33s", marginBottom: "32px" }}
            >
              <p
                style={{
                  color: "#64748b",
                  lineHeight: 1.7,
                  fontSize: ".95rem",
                  maxWidth: "380px",
                  margin: 0,
                }}
              >
                ChatWave brings your team together with instant messaging, rich media sharing, and
                live presence — beautifully crafted for modern teams.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {features.map((f, i) => (
                <div
                  key={f.title}
                  className={`lp-feat ${mounted ? "lp-anim-left" : "opacity-0"}`}
                  style={{ animationDelay: `${0.4 + i * 0.1}s` }}
                >
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "12px",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "linear-gradient(135deg,rgba(79,70,229,.12),rgba(14,165,233,.1))",
                    }}
                  >
                    <f.icon size={16} color="#6366f1" />
                  </div>
                  <div>
                    <p
                      style={{
                        color: "#1e293b",
                        fontWeight: 600,
                        fontSize: ".875rem",
                        marginBottom: "2px",
                      }}
                    >
                      {f.title}
                    </p>
                    <p style={{ color: "#94a3b8", fontSize: ".78rem" }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Social proof */}
          <div
            className={mounted ? "lp-anim-left" : "opacity-0"}
            style={{ animationDelay: ".7s", position: "relative", zIndex: 1 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ display: "flex" }}>
                {["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b"].map((c, i) => (
                  <div
                    key={i}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      border: "2.5px solid white",
                      background: c,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: ".7rem",
                      fontWeight: 700,
                      marginLeft: i ? "-9px" : "0",
                      boxShadow: "0 2px 8px rgba(0,0,0,.12)",
                    }}
                  >
                    {["A", "B", "C", "D"][i]}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ display: "flex", gap: "2px", marginBottom: "3px" }}>
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} width="12" height="12" viewBox="0 0 20 20" fill="#fbbf24">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p style={{ color: "#94a3b8", fontSize: ".75rem" }}>
                  Loved by 10,000+ users worldwide
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="lp-right">
          <div style={{ width: "100%", maxWidth: "440px" }}>
            {/* Mobile logo */}
            <div
              className="lp-mobile-logo"
              style={{ display: "none", alignItems: "center", gap: "10px", marginBottom: "2rem" }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg,#4f46e5,#0ea5e9)",
                }}
              >
                <MessageCircle size={20} color="white" />
              </div>
              <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "#1e293b" }}>
                ChatWave
              </span>
            </div>

            {/* Badge */}
            <div
              className={mounted ? "lp-anim-up" : "opacity-0"}
              style={{ animationDelay: ".14s", marginBottom: "24px" }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 14px",
                  borderRadius: "999px",
                  background: "rgba(99,102,241,.08)",
                  border: "1px solid rgba(99,102,241,.18)",
                  animation: "lp-badge 3s ease infinite",
                }}
              >
                <div
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: "#6366f1",
                  }}
                />
                <span
                  style={{
                    color: "#4f46e5",
                    fontSize: ".78rem",
                    fontWeight: 600,
                    letterSpacing: ".04em",
                  }}
                >
                  Secure Sign In — SSL Encrypted
                </span>
              </div>
            </div>

            {/* Heading */}
            <div
              className={mounted ? "lp-anim-up" : "opacity-0"}
              style={{ animationDelay: ".21s", marginBottom: "28px" }}
            >
              <h2
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontSize: "clamp(1.9rem,3.5vw,2.6rem)",
                  fontWeight: 900,
                  color: "#0f172a",
                  lineHeight: 1.1,
                  marginBottom: "8px",
                }}
              >
                Welcome back 👋
              </h2>
              <p style={{ color: "#64748b", fontSize: ".875rem", lineHeight: 1.65 }}>
                Sign in to continue your conversations and stay connected with your team.
              </p>
            </div>

            <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
              {/* Email */}
              <div
                className={mounted ? "lp-anim-up" : "opacity-0"}
                style={{ animationDelay: ".28s", marginBottom: "16px" }}
              >
                <label
                  style={{
                    display: "block",
                    fontSize: ".72rem",
                    fontWeight: 700,
                    color: "#64748b",
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
                    color={focusedField === "email" ? "#6366f1" : "#94a3b8"}
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      transition: "color .2s",
                    }}
                  />
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="you@example.com"
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    className="lp-input"
                  />
                </div>
                {errors.email && (
                  <p
                    style={{
                      color: "#ef4444",
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
                        background: "#ef4444",
                        flexShrink: 0,
                        display: "inline-block",
                      }}
                    />
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div
                className={mounted ? "lp-anim-up" : "opacity-0"}
                style={{ animationDelay: ".35s", marginBottom: "16px" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <label
                    style={{
                      fontSize: ".72rem",
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: ".12em",
                    }}
                  >
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    style={{
                      color: "#6366f1",
                      fontSize: ".8rem",
                      fontWeight: 600,
                      textDecoration: "none",
                      transition: "color .2s",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.color = "#4f46e5")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "#6366f1")}
                  >
                    Forgot password?
                  </Link>
                </div>
                <div style={{ position: "relative" }}>
                  <Lock
                    size={16}
                    color={focusedField === "password" ? "#6366f1" : "#94a3b8"}
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      transition: "color .2s",
                    }}
                  />
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    className="lp-input"
                    style={{ paddingRight: "44px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      color: "#94a3b8",
                      transition: "color .2s",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.color = "#6366f1")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "#94a3b8")}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p
                    style={{
                      color: "#ef4444",
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
                        background: "#ef4444",
                        flexShrink: 0,
                        display: "inline-block",
                      }}
                    />
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember */}
              <div
                className={mounted ? "lp-anim-up" : "opacity-0"}
                style={{
                  animationDelay: ".41s",
                  marginBottom: "24px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <label className="lp-check-wrap">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <div className="lp-check-box">
                    <svg
                      className="lp-check-icon"
                      width="11"
                      height="9"
                      viewBox="0 0 11 9"
                      fill="none"
                    >
                      <path
                        d="M1 4L4 7.5L10 1"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </label>
                <span
                  style={{
                    color: "#64748b",
                    fontSize: ".875rem",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                  onClick={() => setRemember(!remember)}
                >
                  Keep me signed in for 30 days
                </span>
              </div>

              {/* Submit */}
              <div
                className={mounted ? "lp-anim-up" : "opacity-0"}
                style={{ animationDelay: ".47s", marginBottom: "20px" }}
              >
                <button type="submit" disabled={mutation.isPending} className="lp-btn">
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
                    {mutation.isPending ? (
                      <>
                        <Loader2 size={17} className="animate-spin" />
                        Signing you in...
                      </>
                    ) : (
                      <>
                        Sign In{" "}
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
              </div>
            </form>

            {/* Divider */}
            <div
              style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}
            >
              <div className="lp-divider" />
              <span
                style={{
                  color: "#cbd5e1",
                  fontSize: ".72rem",
                  fontWeight: 700,
                  letterSpacing: ".15em",
                  whiteSpace: "nowrap",
                }}
              >
                NEW HERE?
              </span>
              <div className="lp-divider" />
            </div>

            {/* Register */}
            <Link to="/register" className="lp-ghost">
              Create a free account
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>

            {/* Trust */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                marginTop: "16px",
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span style={{ color: "#94a3b8", fontSize: ".75rem" }}>
                256-bit SSL · Your data stays private
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
