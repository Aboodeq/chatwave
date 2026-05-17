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
  User,
  ShieldCheck,
  Star,
  Globe,
} from "lucide-react";
import { register as registerUser } from "../api/auth";
import { useAuthStore } from "../stores/authStore";
import { useEffect, useRef, useState } from "react";

const schema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    password_confirmation: z.string(),
  })
  .refine((d) => d.password === d.password_confirmation, {
    message: "Passwords don't match",
    path: ["password_confirmation"],
  });
type FormData = z.infer<typeof schema>;

const perks = [
  { icon: ShieldCheck, text: "End-to-end encrypted messages" },
  { icon: Star, text: "Free forever — no credit card needed" },
  { icon: Globe, text: "Available on web, iOS and Android" },
];

function StrengthBar({ password }: { password: string }) {
  const s = !password
    ? 0
    : [
        password.length >= 8,
        /[A-Z]/.test(password),
        /[0-9]/.test(password),
        /[^A-Za-z0-9]/.test(password),
      ].filter(Boolean).length;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "#ef4444", "#f59e0b", "#10b981", "#6366f1"];
  if (!password) return null;
  return (
    <div style={{ marginTop: "8px" }}>
      <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: "3px",
              borderRadius: "999px",
              transition: "background .3s ease",
              background: i <= s ? colors[s] : "#e2e8f0",
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: ".72rem", color: colors[s], fontWeight: 600 }}>{labels[s]}</span>
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mounted, setMounted] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [watchedPass, setWatchedPass] = useState("");
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
    watch,
  } = useForm<FormData>({ resolver: zodResolver(schema) });
  useEffect(() => {
    const sub = watch((val) => setWatchedPass(val.password ?? ""));
    return () => sub.unsubscribe();
  }, [watch]);

  const mutation = useMutation({
    mutationFn: registerUser,
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      toast.success(`Welcome to ChatWave, ${data.user.name}!`);
      navigate("/chat");
    },
    onError: () => toast.error("Registration failed. Please try again."),
  });

  const onSubmit = (data: FormData) => {
    if (!agreed) {
      toast.error("Please agree to the Terms of Service.");
      return;
    }
    mutation.mutate(data);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Fraunces:wght@700;900&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

        @keyframes rp-up    { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes rp-left  { from{opacity:0;transform:translateX(-28px)} to{opacity:1;transform:translateX(0)} }
        @keyframes rp-right { from{opacity:0;transform:translateX(28px)} to{opacity:1;transform:translateX(0)} }
        @keyframes rp-grad  { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes rp-shimmer{ 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        @keyframes rp-orb1  { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-40px,30px)} }
        @keyframes rp-orb2  { 0%,100%{transform:translate(0,0)} 50%{transform:translate(30px,-40px)} }
        @keyframes rp-orb3  { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-20px,-25px)} }
        @keyframes rp-check { 0%{transform:scale(0)} 60%{transform:scale(1.2)} 100%{transform:scale(1)} }
        @keyframes rp-badge { 0%,100%{box-shadow:0 0 0 0 rgba(79,70,229,.35)} 50%{box-shadow:0 0 0 6px rgba(79,70,229,0)} }

        .rp-anim-up    { opacity:0; animation:rp-up    .75s cubic-bezier(.16,1,.3,1) forwards; }
        .rp-anim-left  { opacity:0; animation:rp-left  .75s cubic-bezier(.16,1,.3,1) forwards; }
        .rp-anim-right { opacity:0; animation:rp-right .75s cubic-bezier(.16,1,.3,1) forwards; }

        .rp-grad-text {
          background:linear-gradient(135deg,#4f46e5,#6366f1,#0ea5e9);
          background-size:200%; -webkit-background-clip:text;
          -webkit-text-fill-color:transparent; background-clip:text;
          animation:rp-grad 5s ease infinite;
        }

        .rp-btn {
          position:relative; overflow:hidden; border:none; cursor:pointer;
          background:linear-gradient(135deg,#4f46e5,#6366f1,#0ea5e9);
          background-size:200%; animation:rp-grad 4s ease infinite;
          color:#fff; font-weight:700; font-size:.9rem; letter-spacing:.02em;
          border-radius:14px; padding:15px 24px; width:100%;
          font-family:'Outfit',sans-serif;
          transition:transform .25s ease,box-shadow .25s ease;
        }
        .rp-btn:hover:not(:disabled){ transform:translateY(-2px); box-shadow:0 16px 40px rgba(79,70,229,.28),0 6px 16px rgba(99,102,241,.2); }
        .rp-btn:active:not(:disabled){ transform:translateY(0); }
        .rp-btn:disabled{ opacity:.6; cursor:not-allowed; }
        .rp-btn::after{
          content:''; position:absolute; top:0; left:0; width:50%; height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent);
          animation:rp-shimmer 2.5s infinite; pointer-events:none;
        }

        .rp-input {
          width:100%; background:rgba(255,255,255,.85);
          border:1.5px solid #e2e8f0; border-radius:13px;
          padding:13px 14px 13px 44px; font-size:.9rem; color:#1e293b;
          font-family:'Outfit',sans-serif; transition:all .22s ease;
          box-shadow:0 1px 4px rgba(0,0,0,.05);
        }
        .rp-input::placeholder{ color:#94a3b8; }
        .rp-input:focus{
          outline:none; background:#fff; border-color:#6366f1;
          box-shadow:0 0 0 4px rgba(99,102,241,.1),0 2px 10px rgba(99,102,241,.08);
        }
        .rp-input.err{ border-color:#fca5a5; }

        .rp-perk {
          display:flex; align-items:center; gap:14px; padding:13px 16px;
          border-radius:15px; background:rgba(255,255,255,.55);
          border:1px solid rgba(99,102,241,.1);
          transition:all .28s cubic-bezier(.16,1,.3,1);
        }
        .rp-perk:hover{ background:rgba(255,255,255,.9); border-color:rgba(99,102,241,.22); transform:translateX(6px); box-shadow:0 4px 20px rgba(99,102,241,.1); }

        .rp-sep{ width:1px; background:linear-gradient(to bottom,transparent,rgba(99,102,241,.55) 20%,rgba(99,102,241,.85) 50%,rgba(99,102,241,.55) 80%,transparent); }
        .rp-divider{ flex:1; height:1px; background:linear-gradient(90deg,transparent,rgba(99,102,241,.35),transparent); }

        .rp-ghost{
          display:flex; align-items:center; justify-content:center; gap:8px;
          width:100%; padding:13px; border-radius:13px;
          background:transparent; border:1.5px solid #e2e8f0;
          color:#64748b; font-size:.875rem; font-weight:600;
          font-family:'Outfit',sans-serif; cursor:pointer; text-decoration:none;
          transition:all .22s ease;
        }
        .rp-ghost:hover{ border-color:#6366f1; background:rgba(99,102,241,.05); color:#4f46e5; transform:translateY(-1px); box-shadow:0 4px 16px rgba(99,102,241,.1); }

        .rp-check-wrap{ position:relative; width:20px; height:20px; flex-shrink:0; }
        .rp-check-wrap input{ position:absolute; opacity:0; width:100%; height:100%; cursor:pointer; margin:0; }
        .rp-check-box{
          width:20px; height:20px; border-radius:6px; border:1.5px solid #cbd5e1;
          background:#fff; display:flex; align-items:center; justify-content:center;
          transition:all .2s ease; pointer-events:none; box-shadow:0 1px 3px rgba(0,0,0,.06);
        }
        .rp-check-wrap input:checked ~ .rp-check-box{
          background:linear-gradient(135deg,#4f46e5,#6366f1); border-color:#4f46e5;
          box-shadow:0 4px 12px rgba(79,70,229,.28); animation:rp-check .3s cubic-bezier(.16,1,.3,1);
        }
        .rp-check-icon{ opacity:0; transform:scale(0); transition:all .2s ease; }
        .rp-check-wrap input:checked ~ .rp-check-box .rp-check-icon{ opacity:1; transform:scale(1); }

        .rp-root { display:flex; min-height:100vh; }
        .rp-left  { flex:1; display:flex; align-items:center; justify-content:center; padding:clamp(1.5rem,5vw,4rem); position:relative; z-index:1; overflow-y:auto; }
        .rp-right { width:46%; display:flex; flex-direction:column; justify-content:space-between; padding:clamp(2rem,5vw,4.5rem); position:relative; overflow:hidden; }

        @media(max-width:1023px){
          .rp-right{ display:none !important; }
          .rp-left{ width:100%; padding:1.75rem 1.5rem; align-items:flex-start; }
          .rp-mobile-logo{ display:flex !important; }
        }
        @media(min-width:1024px){ .rp-mobile-logo{ display:none !important; } }
      `}</style>

      <div
        className="rp-root"
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
              right: "-160px",
              background: "radial-gradient(circle,rgba(99,102,241,.12) 0%,transparent 70%)",
              animation: "rp-orb1 14s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: "550px",
              height: "550px",
              borderRadius: "50%",
              bottom: "-130px",
              left: "-80px",
              background: "radial-gradient(circle,rgba(14,165,233,.09) 0%,transparent 70%)",
              animation: "rp-orb2 18s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: "380px",
              height: "380px",
              borderRadius: "50%",
              top: "38%",
              right: "42%",
              background: "radial-gradient(circle,rgba(139,92,246,.06) 0%,transparent 70%)",
              animation: "rp-orb3 12s ease-in-out infinite",
            }}
          />
        </div>

        {/* ── LEFT — FORM ── */}
        <div className="rp-left">
          <div style={{ width: "100%", maxWidth: "440px" }}>
            {/* Mobile logo */}
            <div
              className="rp-mobile-logo"
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
              className={mounted ? "rp-anim-up" : "opacity-0"}
              style={{ animationDelay: ".1s", marginBottom: "22px" }}
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
                  animation: "rp-badge 3s ease infinite",
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
                  Free account — No credit card required
                </span>
              </div>
            </div>

            {/* Heading */}
            <div
              className={mounted ? "rp-anim-up" : "opacity-0"}
              style={{ animationDelay: ".17s", marginBottom: "26px" }}
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
                Create your account ✨
              </h2>
              <p style={{ color: "#64748b", fontSize: ".875rem", lineHeight: 1.65 }}>
                Join thousands of teams already using ChatWave to collaborate faster and smarter.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Name */}
              <div
                className={mounted ? "rp-anim-up" : "opacity-0"}
                style={{ animationDelay: ".23s", marginBottom: "14px" }}
              >
                <label
                  style={{
                    display: "block",
                    fontSize: ".72rem",
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: ".12em",
                    marginBottom: "7px",
                  }}
                >
                  Full Name
                </label>
                <div style={{ position: "relative" }}>
                  <User
                    size={16}
                    color={focusedField === "name" ? "#6366f1" : "#94a3b8"}
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      transition: "color .2s",
                    }}
                  />
                  <input
                    {...register("name")}
                    type="text"
                    placeholder="Your full name"
                    onFocus={() => setFocusedField("name")}
                    onBlur={() => setFocusedField(null)}
                    className={`rp-input${errors.name ? " err" : ""}`}
                  />
                </div>
                {errors.name && (
                  <p
                    style={{
                      color: "#ef4444",
                      fontSize: ".78rem",
                      marginTop: "5px",
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
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div
                className={mounted ? "rp-anim-up" : "opacity-0"}
                style={{ animationDelay: ".29s", marginBottom: "14px" }}
              >
                <label
                  style={{
                    display: "block",
                    fontSize: ".72rem",
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: ".12em",
                    marginBottom: "7px",
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
                    className={`rp-input${errors.email ? " err" : ""}`}
                  />
                </div>
                {errors.email && (
                  <p
                    style={{
                      color: "#ef4444",
                      fontSize: ".78rem",
                      marginTop: "5px",
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
                className={mounted ? "rp-anim-up" : "opacity-0"}
                style={{ animationDelay: ".35s", marginBottom: "14px" }}
              >
                <label
                  style={{
                    display: "block",
                    fontSize: ".72rem",
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: ".12em",
                    marginBottom: "7px",
                  }}
                >
                  Password
                </label>
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
                    type={showPass ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    className={`rp-input${errors.password ? " err" : ""}`}
                    style={{ paddingRight: "44px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
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
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <StrengthBar password={watchedPass} />
                {errors.password && (
                  <p
                    style={{
                      color: "#ef4444",
                      fontSize: ".78rem",
                      marginTop: "5px",
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

              {/* Confirm */}
              <div
                className={mounted ? "rp-anim-up" : "opacity-0"}
                style={{ animationDelay: ".41s", marginBottom: "18px" }}
              >
                <label
                  style={{
                    display: "block",
                    fontSize: ".72rem",
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: ".12em",
                    marginBottom: "7px",
                  }}
                >
                  Confirm Password
                </label>
                <div style={{ position: "relative" }}>
                  <Lock
                    size={16}
                    color={focusedField === "confirm" ? "#6366f1" : "#94a3b8"}
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      transition: "color .2s",
                    }}
                  />
                  <input
                    {...register("password_confirmation")}
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repeat your password"
                    onFocus={() => setFocusedField("confirm")}
                    onBlur={() => setFocusedField(null)}
                    className={`rp-input${errors.password_confirmation ? " err" : ""}`}
                    style={{ paddingRight: "44px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
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
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password_confirmation && (
                  <p
                    style={{
                      color: "#ef4444",
                      fontSize: ".78rem",
                      marginTop: "5px",
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
                    {errors.password_confirmation.message}
                  </p>
                )}
              </div>

              {/* Terms */}
              <div
                className={mounted ? "rp-anim-up" : "opacity-0"}
                style={{
                  animationDelay: ".46s",
                  marginBottom: "20px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                }}
              >
                <label className="rp-check-wrap" style={{ marginTop: "2px" }}>
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                  />
                  <div className="rp-check-box">
                    <svg
                      className="rp-check-icon"
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
                    fontSize: ".84rem",
                    lineHeight: 1.55,
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                  onClick={() => setAgreed(!agreed)}
                >
                  I agree to the{" "}
                  <span style={{ color: "#6366f1", fontWeight: 600 }}>Terms of Service</span> and{" "}
                  <span style={{ color: "#6366f1", fontWeight: 600 }}>Privacy Policy</span>
                </span>
              </div>

              {/* Submit */}
              <div
                className={mounted ? "rp-anim-up" : "opacity-0"}
                style={{ animationDelay: ".51s", marginBottom: "20px" }}
              >
                <button type="submit" disabled={mutation.isPending} className="rp-btn">
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
                        Creating account...
                      </>
                    ) : (
                      <>
                        Create Account{" "}
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
              style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}
            >
              <div className="rp-divider" />
              <span
                style={{
                  color: "#cbd5e1",
                  fontSize: ".72rem",
                  fontWeight: 700,
                  letterSpacing: ".15em",
                  whiteSpace: "nowrap",
                }}
              >
                HAVE AN ACCOUNT?
              </span>
              <div className="rp-divider" />
            </div>

            <Link to="/login" className="rp-ghost">
              Sign in instead
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

        {/* ── RIGHT — INFO ── */}
        <div className="rp-right">
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
          <div className="rp-sep" style={{ position: "absolute", left: 0, top: 0, bottom: 0 }} />

          {/* Logo */}
          <div
            className={mounted ? "rp-anim-right" : "opacity-0"}
            style={{ animationDelay: ".1s", position: "relative", zIndex: 1 }}
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
              className={mounted ? "rp-anim-right" : "opacity-0"}
              style={{ animationDelay: ".2s", marginBottom: "10px" }}
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
                Join ChatWave today
              </span>
            </div>
            <div
              className={mounted ? "rp-anim-right" : "opacity-0"}
              style={{ animationDelay: ".28s", marginBottom: "16px" }}
            >
              <h1
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontSize: "clamp(2.2rem,3.5vw,3.4rem)",
                  fontWeight: 900,
                  lineHeight: 1.1,
                  color: "#0f172a",
                  margin: 0,
                }}
              >
                Everything your
                <br />
                team needs,
                <br />
                <span className="rp-grad-text">in one place.</span>
              </h1>
            </div>
            <div
              className={mounted ? "rp-anim-right" : "opacity-0"}
              style={{ animationDelay: ".35s", marginBottom: "28px" }}
            >
              <p
                style={{
                  color: "#64748b",
                  lineHeight: 1.7,
                  fontSize: ".92rem",
                  maxWidth: "340px",
                  margin: 0,
                }}
              >
                Real-time messaging, file sharing, reactions, and presence indicators — beautifully
                designed for how modern teams actually work.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {perks.map((p, i) => (
                <div
                  key={p.text}
                  className={`rp-perk ${mounted ? "rp-anim-right" : "opacity-0"}`}
                  style={{ animationDelay: `${0.42 + i * 0.1}s` }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "11px",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "linear-gradient(135deg,rgba(79,70,229,.12),rgba(14,165,233,.1))",
                    }}
                  >
                    <p.icon size={16} color="#6366f1" />
                  </div>
                  <span style={{ color: "#334155", fontSize: ".875rem", fontWeight: 500 }}>
                    {p.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div
            className={mounted ? "rp-anim-right" : "opacity-0"}
            style={{ animationDelay: ".7s", position: "relative", zIndex: 1 }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {[
                { value: "10K+", label: "Active users" },
                { value: "99.9%", label: "Uptime SLA" },
                { value: "< 50ms", label: "Avg. latency" },
                { value: "Free", label: "Forever plan" },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    padding: "14px 16px",
                    borderRadius: "14px",
                    background: "rgba(255,255,255,.6)",
                    border: "1px solid rgba(99,102,241,.1)",
                    boxShadow: "0 2px 8px rgba(99,102,241,.06)",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'Fraunces',serif",
                      fontSize: "1.5rem",
                      fontWeight: 900,
                      marginBottom: "2px",
                    }}
                    className="rp-grad-text"
                  >
                    {s.value}
                  </p>
                  <p style={{ color: "#94a3b8", fontSize: ".75rem" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
