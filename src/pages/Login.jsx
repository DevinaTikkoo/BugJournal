import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import bugBlotzLogo from "../components/BugBlotzLogo.png";

export default function Login() {
  const [identifier, setIdentifier] = useState(""); // username OR email
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setStatus("");
    setLoading(true);

    try {
      const raw = identifier.trim();
      const id = raw.toLowerCase();

      let email = id;

      // If not an email, treat as username
      if (!id.includes("@")) {
        const { data, error } = await supabase
          .from("profiles")
          .select("email")
          .eq("username", id)
          .maybeSingle();

        if (error) throw error;
        if (!data?.email) {
          setStatus("Username not found.");
          return;
        }

        email = data.email.toLowerCase();
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setStatus(`Error: ${error.message}`);
        return;
      }

      if (!data?.session) {
        setStatus("Signed in, but no session found. Check email confirmation settings.");
        return;
      }

      setStatus("Success! Redirecting...");
      navigate("/dashboard");
    } catch (err) {
      setStatus(`Error: ${err?.message || "Login failed."}`);
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
          marginTop: -250,
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