import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import bugBlotzLogo from "../components/BugBlotzLogo.png";

export default function ForgotPassword() {
  // Step state: "request" (send email) -> "emailSent" -> "reset" (has recovery session)
  const [step, setStep] = useState("request");

  const [identifier, setIdentifier] = useState(""); // username OR email
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // When user clicks the email link and returns, Supabase creates a recovery session.
  // We detect that and swap to the reset UI on the same page.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        // If a session exists here, it's often the recovery session from the link.
        setStep("reset");
        setStatus("");
      }
    })();

    // Also listen for auth state changes (more reliable across browsers)
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setStep("reset");
        setStatus("");
      }
    });

    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, []);

  async function handleSendLink(e) {
    e.preventDefault();
    setStatus("");
    setLoading(true);

    try {
      const id = identifier.trim().toLowerCase();
      if (!id) throw new Error("Enter your email or username.");

      let emailToUse = id;

      // If it's a username, lookup email in profiles (MVP behavior)
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
        emailToUse = data.email.toLowerCase();
      }

      const { error } = await supabase.auth.resetPasswordForEmail(emailToUse, {
        redirectTo: `${window.location.origin}/forgot-password`,
      });

      if (error) throw error;

      setStep("emailSent");
      setStatus("Check your email for a reset link. Keep this tab open.");
    } catch (err) {
      setStatus(`Error: ${err?.message || "Failed to send reset link."}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePassword(e) {
    e.preventDefault();
    setStatus("");
    setLoading(true);

    try {
      if (password !== confirmPassword) {
        setStatus("Passwords do not match.");
        return;
      }
      if (password.length < 6) {
        setStatus("Password must be at least 8 characters.");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setStatus("Password updated! Redirecting to login...");

      // Sign out to ensure clean login after reset
      await supabase.auth.signOut();
      setTimeout(() => navigate("/login"), 700);
    } catch (err) {
      setStatus(`Error: ${err?.message || "Failed to update password."}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <CenterCard title="Forgot Password" logoSrc={bugBlotzLogo}>
      {step === "request" || step === "emailSent" ? (
        <form onSubmit={handleSendLink} style={{ display: "grid", gap: 10 }}>
          <label style={fieldLabel}>Email or Username</label>
          <input
            style={inputStyle}
            placeholder="example_user example@ufl.edu"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoComplete="username"
            disabled={step === "emailSent"}
          />

          <button
            type="submit"
            style={{ ...primaryBtn, opacity: loading || step === "emailSent" ? 0.7 : 1, marginTop: 10 }}
            disabled={loading || step === "emailSent"}
          >
            {loading ? "Sending..." : step === "emailSent" ? "Link Sent" : "Send reset link"}
          </button>

          <div style={{ color: "#444", fontSize: 14 }}>{status}</div>

          {step === "emailSent" ? (
            <div style={{ fontSize: 13, color: "#666", marginTop: 6 }}>
              Once the link is clicked. "New Password" options will appear.
            </div>
          ) : null}

          <div style={{ textAlign: "center", marginTop: 10 }}>
            <Link to="/login" style={linkStyle}>Back to login</Link>
          </div>
        </form>
      ) : (
        <form onSubmit={handleUpdatePassword} style={{ display: "grid", gap: 10 }}>
          <label style={fieldLabel}>New Password</label>
          <input
            style={inputStyle}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          <label style={{ ...fieldLabel, marginTop: 4 }}>Confirm New Password</label>
          <input
            style={inputStyle}
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          <button
            type="submit"
            style={{ ...primaryBtn, opacity: loading ? 0.7 : 1, marginTop: 10 }}
            disabled={loading}
          >
            {loading ? "Updating..." : "Update password"}
          </button>

          <div style={{ color: "#444", fontSize: 14 }}>{status}</div>
        </form>
      )}
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

const linkStyle = {
  textDecoration: "none",
  color: "#666",
  fontWeight: 600,
  fontSize: 13,
};