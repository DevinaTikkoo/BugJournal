import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import bugBlotzLogo from "../components/BugBlotzLogo.png";

export default function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

    setLoading(true);
    setStatus("Creating account...");

    try {
      // Optional: username availability check (nice UX)
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

      // Sign up with username stored in metadata (trigger should insert into profiles)
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { username: cleanUsername },
        },
      });

      if (error) throw error;

      if (!data.session) {
        setStatus("Success! Check your email to confirm your account.");
        return;
      }

      setStatus("Success! Redirecting...");
      navigate("/dashboard");
    } catch (err) {
      setStatus(`Error: ${err?.message || "Signup failed."}`);
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