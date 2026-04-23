import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { supabase } from "../supabaseClient";
import bugBlotzLogo from "../components/BugBlotzLogo.png";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [hcaptchaToken, setHcaptchaToken] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const hcaptchaRef = useRef(null);
  const navigate = useNavigate();
  const hcaptchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY;

  function resetCaptcha() {
    hcaptchaRef.current?.resetCaptcha();
    setHcaptchaToken("");
  }

  async function handleLogin(e) {
    e.preventDefault();
    setStatus("");

    if (!hcaptchaSiteKey) {
      setStatus("Security check is unavailable right now.");
      return;
    }

    if (!hcaptchaToken) {
      setStatus("Please complete the hCaptcha challenge.");
      return;
    }

    setLoading(true);

    try {
      const normalizedIdentifier = identifier.trim().toLowerCase();

      let email = normalizedIdentifier;

      // If it's not an email, look it up as a username.
      if (!normalizedIdentifier.includes("@")) {
        const { data, error } = await supabase
          .from("profiles")
          .select("email")
          .eq("username", normalizedIdentifier)
          .maybeSingle();

        if (error) throw error;
        if (!data?.email) {
          setStatus("We couldn't find that username.");
          return;
        }

        email = data.email.toLowerCase();
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          captchaToken: hcaptchaToken,
        },
      });

      if (error) {
        setStatus(`Could not log in: ${error.message}`);
        return;
      }

      if (!data?.session) {
        setStatus("Signed in, but no active session was returned.");
        return;
      }

      setStatus("You're in. Taking you to your dashboard...");
      resetCaptcha();
      navigate("/dashboard");
    } catch (err) {
      setStatus(`Could not log in: ${err?.message || "Please try again."}`);
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  }

  return (
    <CenterCard title="Log In" logoSrc={bugBlotzLogo}>
      <form onSubmit={handleLogin} style={{ display: "grid", gap: 10 }}>
        <label style={fieldLabel}>Email or Username</label>
        <input
          style={inputStyle}
          placeholder="example_user or example@ufl.edu"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          autoComplete="username"
        />

        <label style={{ ...fieldLabel, marginTop: 4 }}>Password</label>
        <input
          style={inputStyle}
          placeholder="••••••••"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        <div style={{ textAlign: "right" }}>
          <Link to="/forgot-password" style={forgotStyle}>Forgot password?</Link>
        </div>

        <div style={captchaWrap}>
          <HCaptcha
            ref={hcaptchaRef}
            sitekey={hcaptchaSiteKey || ""}
            onVerify={(token) => {
              setHcaptchaToken(token || "");
              if (status) setStatus("");
            }}
            onExpire={() => setHcaptchaToken("")}
            onError={() => setStatus("hCaptcha failed to load. Please refresh and try again.")}
          />
        </div>

        <button
          type="submit"
          style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}
          disabled={loading}
        >
          {loading ? "Logging in..." : "Log in"}
        </button>

        <div style={{ color: "#444", fontSize: 14 }}>{status}</div>
      </form>

      <div style={signupPrompt}>Don’t have an account?</div>
      <Link to="/signup" style={signupBtn}>
        Sign Up
      </Link>
    </CenterCard>
  );
}

function CenterCard({ title, children, logoSrc }) {
  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "calc(100vh - 60px)",
        padding: 24,
        transform: "translateY(-70px)",
      }}
    >
      {logoSrc ? (
        <img
          src={logoSrc}
          alt="Bug Blotz"
          style={{
            width: 540,
            maxWidth: "96vw",
            marginBottom: 2,
            transform: "translateY(-28px)",
          }}
        />
      ) : null}

      <div
        style={{
          width: 410,
          background: "white",
          padding: 24,
          borderRadius: 14,
          marginTop: -150,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{title}</div>
        </div>
        {children}
      </div>
    </div>
  );
}

const primaryBtn = {
  border: "none",
  background: "#26a036",
  color: "white",
  padding: "12px 14px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 16,
};

const inputStyle = {
  padding: "12px 14px",
  fontSize: 16,
  borderRadius: 10,
  border: "1px solid #ccc",
};

const fieldLabel = {
  color: "#444",
  fontWeight: 600,
  fontSize: 13,
};

const forgotStyle = {
  textDecoration: "none",
  color: "#666",
  fontWeight: 500,
  fontSize: 13,
};

const captchaWrap = {
  display: "flex",
  justifyContent: "center",
};

const signupPrompt = {
  marginTop: 14,
  marginBottom: 8,
  textAlign: "center",
  color: "#666",
  fontSize: 13,
  fontWeight: 500,
};

const signupBtn = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  textAlign: "center",
  textDecoration: "none",
  border: "none",
  background: "#26a036",
  color: "white",
  padding: "12px 14px",
  borderRadius: 10,
  fontWeight: 700,
  fontSize: 16,
};