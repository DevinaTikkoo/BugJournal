import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Dashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("User");
  const [entries, setEntries] = useState([]);
  const entryCount = entries.length;

  useEffect(() => {
    (async () => {
      // 1) Require auth
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes?.user;

      if (!user) {
        navigate("/login");
        return;
      }

      // 2) Get username from profiles
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

      if (!profileErr && profile?.username) setUsername(profile.username);

      // 3) Get entries (RLS filters to this user automatically)
      const { data: bugEntries, error: entriesErr } = await supabase
        .from("bug_entries")
        .select("id, entry_name, created_at")
        .order("created_at", { ascending: false });

      if (!entriesErr && Array.isArray(bugEntries)) setEntries(bugEntries);

      setLoading(false);
    })();
  }, [navigate]);

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;

  return (
    <div style={pageWrap}>
      <div style={mainArea}>
        {/* LEFT */}
        <div style={leftCol}>
          <div style={greetingCard}>
            <div style={helloText}>Hello {username}!</div>
          </div>

          <div style={reportedCard}>
            <div style={reportedLines}>
              <div>You’ve reported...</div>
              <div><b>{entryCount}</b> bugs</div>
            </div>
          </div>

          <div style={createWrap}>
            <button
              style={primaryBtn}
              onClick={() => navigate("/create-entry")}
            >
              Create Entry
            </button>
          </div>
        </div>

        {/* RIGHT */}
        <div style={rightCard}>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 14 }}>
            Your Entries
          </div>

          {entries.length === 0 ? (
            <div style={{ color: "#555", fontSize: 14, lineHeight: 1.45 }}>
              No entries yet. Click “Create Entry” to add your first bug.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {entries.map((e) => (
                <button
                  key={e.id}
                  onClick={() => navigate(`/entry/${e.id}`)}
                  style={entryRow}
                >
                  {e.entry_name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const pageWrap = {
  minHeight: "calc(100vh - 60px - 48px)",
};

const mainArea = {
  display: "grid",
  gridTemplateColumns: "320px 1fr",
  gap: 24,
  alignItems: "stretch",
  minHeight: "calc(100vh - 60px - 48px - 30px)",
  marginTop: 30,
  marginLeft: 30,
};

const leftCol = {
  display: "grid",
  gap: 35,
  alignContent: "start",
};

const card = {
  background: "white",
  borderRadius: 14,
  padding: 24,
  minHeight: 120,
  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
};

const greetingCard = {
  ...card,
  display: "flex",
  alignItems: "center",
};

const reportedCard = {
  ...card,
  minHeight: 180,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const reportedText = {
  color: "#333",
  fontSize: 32,
  fontWeight: 500,
  lineHeight: 1,
};

const reportedLines = {
  ...reportedText,
  display: "grid",
  gap: 14,
  textAlign: "center",
  width: "100%",
};

const createWrap = {
  background: "white",
  borderRadius: 14,
  padding: 12,
  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
};

const rightCard = {
  background: "white",
  borderRadius: 14,
  padding: 24,
  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  minHeight: "100%",
  height: "100%",
};

const helloText = {
  fontSize: 32,
  fontWeight: 700,
  lineHeight: 1,
};

const primaryBtn = {
  border: "none",
  background: "#26a036",
  color: "white",
  borderRadius: 10,
  padding: "12px 14px",
  width: "100%",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
};

const entryRow = {
  textAlign: "left",
  border: "1px solid #ddd",
  background: "#f7f7fb",
  borderRadius: 14,
  padding: "12px 14px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 16,
};