import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { supabase } from "../supabaseClient";
import bugBlotzLogo from "../components/BugBlotzLogo.png";

export default function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  async function handleSignup(e) {
    e.preventDefault();
    setStatus("");

    if (password !== confirmPassword) {
      setStatus("Passwords do not match.");
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanUsername.length < 3) {
      setStatus("Username must be at least 3 characters.");
      return;
    }

    if (!hcaptchaSiteKey) {
      setStatus("Security check is unavailable right now.");
      return;
    }

    if (!hcaptchaToken) {
      setStatus("Please complete the hCaptcha challenge.");
      return;
    }

    setLoading(true);
    setStatus("Creating your account...");

    try {
      // Check username availability first for clearer feedback.
      const { data: existing, error: checkErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", cleanUsername)
        .maybeSingle();

      if (checkErr) throw checkErr;
      if (existing) {
        setStatus("Username is already taken.");
        return;
      }

      // Store username in metadata; the DB trigger writes the profiles row.
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { username: cleanUsername },
          captchaToken: hcaptchaToken,
        },
      });

      if (error) throw error;

      if (!data.session) {
        setStatus("Account created. Check your email to confirm it.");
        resetCaptcha();
        return;
      }

      setStatus("Account ready. Redirecting...");
      resetCaptcha();
      navigate("/dashboard");
    } catch (err) {
      setStatus(`Could not create account: ${err?.message || "Please try again."}`);
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  }

  return (
    <CenterCard title="Create Account" logoSrc={bugBlotzLogo}>
      <form onSubmit={handleSignup} style={{ display: "grid", gap: 10 }}>
        <label style={fieldLabel}>Username</label>
        <input
          style={inputStyle}
          placeholder="your_username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoComplete="username"
        />

        <label style={{ ...fieldLabel, marginTop: 4 }}>Email</label>
        <input
          style={inputStyle}
          placeholder="example@ufl.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <label style={{ ...fieldLabel, marginTop: 4 }}>Password</label>
        <input
          style={inputStyle}
          placeholder="••••••••"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />

        <label style={{ ...fieldLabel, marginTop: 4 }}>Confirm Password</label>
        <input
          style={inputStyle}
          placeholder="••••••••"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
        />

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
          style={{ ...primaryBtn, marginTop: 14, opacity: loading ? 0.7 : 1 }}
          disabled={loading}
        >
          {loading ? "Creating..." : "Sign up"}
        </button>

        <div style={{ color: "#444", fontSize: 14 }}>{status}</div>
      </form>
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
          marginTop: -100,
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

const captchaWrap = {
  display: "flex",
  justifyContent: "center",
};
