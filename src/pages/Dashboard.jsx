import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CartesianGrid,
  Label,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BUG_TYPE_OPTIONS } from "../constants/bugTypes";
import { supabase } from "../supabaseClient";
import {
  buildEntryPayload,
  emptyEntryForm,
  validateEntryForm,
} from "../utils/entryForm";

export default function Dashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("User");
  const [entries, setEntries] = useState([]);
  const [expandedEntries, setExpandedEntries] = useState({});
  const [isCreatingEntry, setIsCreatingEntry] = useState(false);
  const [createFormData, setCreateFormData] = useState({ ...emptyEntryForm });
  const [createStatus, setCreateStatus] = useState("");
  const [createSaving, setCreateSaving] = useState(false);
  const [chartRange, setChartRange] = useState("month");
  const entryCount = entries.length;
  const monthlyBugsSeries = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dailyCounts = new Array(daysInMonth).fill(0);

    entries.forEach((entry) => {
      if (!entry?.created_at) return;

      const createdAt = new Date(entry.created_at);
      if (Number.isNaN(createdAt.getTime())) return;
      if (createdAt.getFullYear() !== year || createdAt.getMonth() !== month) return;

      const dayIndex = createdAt.getDate() - 1;
      dailyCounts[dayIndex] += 1;
    });

    return dailyCounts.map((count, index) => {
      const runningTotal = dailyCounts
        .slice(0, index + 1)
        .reduce((sum, currentCount) => sum + currentCount, 0);

      return {
        label: `${month + 1}/${index + 1}`,
        count,
        total: runningTotal,
      };
    });
  }, [entries]);

  const yearlyBugsSeries = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const monthlyCounts = new Array(12).fill(0);

    entries.forEach((entry) => {
      if (!entry?.created_at) return;

      const createdAt = new Date(entry.created_at);
      if (Number.isNaN(createdAt.getTime())) return;
      if (createdAt.getFullYear() !== year) return;

      monthlyCounts[createdAt.getMonth()] += 1;
    });

    return monthlyCounts.map((count, index) => {
      const runningTotal = monthlyCounts
        .slice(0, index + 1)
        .reduce((sum, currentCount) => sum + currentCount, 0);

      return {
        label: `${index + 1}/1`,
        count,
        total: runningTotal,
      };
    });
  }, [entries]);

  const activeChartSeries = chartRange === "year" ? yearlyBugsSeries : monthlyBugsSeries;

  function toggleEntry(id) {
    setExpandedEntries((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function startInlineCreate() {
    setCreateStatus("");
    setCreateFormData({ ...emptyEntryForm });
    setIsCreatingEntry(true);
  }

  function cancelInlineCreate() {
    setCreateStatus("");
    setCreateFormData({ ...emptyEntryForm });
    setIsCreatingEntry(false);
  }

  function handleCreateChange(e) {
    const { name, value } = e.target;

    setCreateFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function saveInlineCreate() {
    setCreateStatus("");

    const validationError = validateEntryForm(createFormData);
    if (validationError) {
      setCreateStatus(validationError);
      return;
    }

    setCreateSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setCreateStatus("You must be logged in to create an entry.");
      setCreateSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from("bug_entries")
      .insert([
        {
          user_id: user.id,
          ...buildEntryPayload(createFormData),
        },
      ])
      .select(
        "id, entry_name, created_at, bug_type, severity, bug_description, extra_details, repo_url"
      )
      .single();

    if (error) {
      setCreateStatus(`Error: ${error.message}`);
      setCreateSaving(false);
      return;
    }

    setEntries((prev) => [data, ...prev]);
    setExpandedEntries((prev) => ({
      ...prev,
      [data.id]: true,
    }));

    setCreateFormData({ ...emptyEntryForm });
    setCreateStatus("");
    setCreateSaving(false);
    setIsCreatingEntry(false);
  }

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

      // 3) Get entries for the logged-in user
      const { data: bugEntries, error: entriesErr } = await supabase
        .from("bug_entries")
        .select(
          "id, entry_name, created_at, bug_type, severity, bug_description, extra_details, repo_url"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!entriesErr && Array.isArray(bugEntries)) setEntries(bugEntries);

      setLoading(false);
    })();
  }, [navigate]);

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;

  return (
    <div style={pageWrap}>
      <div style={mainArea}>
        <div style={leftCol}>
          <div style={greetingCard}>
            <div style={helloText}>Hello {username}!</div>
          </div>

          <div style={bugsCard}>
            <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Bugs</div>

            {entries.length === 0 ? (
              <div style={{ color: "#555", fontSize: 14, lineHeight: 1.45 }}>
                No entries yet. Click "Create Entry" to add your first bug.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {entries.map((e) => (
                  <div key={e.id} style={entryWindow}>
                    <div style={entryTopRow}>
                      <div>
                        <div style={entryName}>{e.entry_name}</div>
                        <div style={entryDate}>Created {formatDate(e.created_at)}</div>
                      </div>

                      <button
                        onClick={() => toggleEntry(e.id)}
                        style={toggleBtn}
                        type="button"
                      >
                        {expandedEntries[e.id] ? "Hide" : "Show"}
                      </button>
                    </div>

                    {expandedEntries[e.id] && (
                      <div style={entryDetailsWrap}>
                        <div style={detailsGrid}>
                          <div style={detailItem}>
                            <div style={detailLabel}>Bug Type</div>
                            <div style={detailValue}>{e.bug_type || "-"}</div>
                          </div>

                          <div style={detailItem}>
                            <div style={detailLabel}>Severity</div>
                            <div style={detailValue}>{e.severity || "-"}</div>
                          </div>

                          <div style={detailItemFull}>
                            <div style={detailLabel}>Description</div>
                            <div style={detailValue}>
                              {e.bug_description || e.extra_details || "No details provided."}
                            </div>
                          </div>

                          {e.repo_url && (
                            <div style={detailItemFull}>
                              <div style={detailLabel}>Repository</div>
                              <a href={e.repo_url} target="_blank" rel="noreferrer" style={repoLink}>
                                {e.repo_url}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={rightCol}>
          <div style={reportedCard}>
            <div style={reportedLines}>
              <div>You’ve reported...</div>
              <div><b>{entryCount}</b> bugs</div>
            </div>
          </div>

          <div style={createWrap}>
            {!isCreatingEntry && (
              <button
                style={primaryBtn}
                onClick={startInlineCreate}
                type="button"
              >
                Create Entry
              </button>
            )}

            {isCreatingEntry && (
              <div style={createPanel}>
                <div style={createGrid}>
                  <div style={detailItem}>
                    <div style={detailLabel}>Entry Name</div>
                    <input
                      type="text"
                      name="entry_name"
                      value={createFormData.entry_name}
                      onChange={handleCreateChange}
                      style={createControl}
                    />
                  </div>

                  <div style={detailItem}>
                    <div style={detailLabel}>Bug Type</div>
                    <select
                      name="bug_type"
                      value={createFormData.bug_type}
                      onChange={handleCreateChange}
                      style={createControl}
                    >
                      <option value="">Select bug type</option>
                      {BUG_TYPE_OPTIONS.map((bugType) => (
                        <option key={bugType} value={bugType}>
                          {bugType}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={detailItem}>
                    <div style={detailLabel}>Severity</div>
                    <select
                      name="severity"
                      value={createFormData.severity}
                      onChange={handleCreateChange}
                      style={createControl}
                    >
                      <option value="">Select severity</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>

                  <div style={detailItem}>
                    <div style={detailLabel}>Repository URL</div>
                    <input
                      type="url"
                      name="repo_url"
                      value={createFormData.repo_url}
                      onChange={handleCreateChange}
                      style={createControl}
                    />
                  </div>

                  <div style={detailItemFull}>
                    <div style={detailLabel}>Bug Description</div>
                    <textarea
                      name="bug_description"
                      value={createFormData.bug_description}
                      onChange={handleCreateChange}
                      style={createTextarea}
                    />
                  </div>

                  <div style={detailItemFull}>
                    <div style={detailLabel}>Code Snippet</div>
                    <textarea
                      name="code_snippet"
                      value={createFormData.code_snippet}
                      onChange={handleCreateChange}
                      style={createTextarea}
                    />
                  </div>

                  <div style={detailItemFull}>
                    <div style={detailLabel}>Extra Details</div>
                    <textarea
                      name="extra_details"
                      value={createFormData.extra_details}
                      onChange={handleCreateChange}
                      style={createTextarea}
                    />
                  </div>
                </div>

                <div style={createActions}>
                  <button
                    type="button"
                    onClick={cancelInlineCreate}
                    style={secondaryBtn}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveInlineCreate}
                    style={primaryBtnInline}
                    disabled={createSaving}
                  >
                    {createSaving ? "Creating..." : "Create Entry"}
                  </button>
                </div>

                {createStatus && <p style={createStatusText}>{createStatus}</p>}
              </div>
            )}
          </div>

          <div style={graphCard}>
            <div style={graphHeaderRow}>
              <div style={graphTitle}>Total Bugs Reported</div>

              <div style={graphToggleGroup}>
                <button
                  type="button"
                  style={{
                    ...graphToggleBtn,
                    ...(chartRange === "month" ? graphToggleBtnActive : null),
                  }}
                  onClick={() => setChartRange("month")}
                >
                  This Month
                </button>
                <button
                  type="button"
                  style={{
                    ...graphToggleBtn,
                    ...(chartRange === "year" ? graphToggleBtnActive : null),
                  }}
                  onClick={() => setChartRange("year")}
                >
                  This Year
                </button>
              </div>
            </div>

            <div style={graphInner}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={activeChartSeries}
                  margin={{ top: 10, right: 14, left: 18, bottom: 16 }}
                >
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 4" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: "#6b7280" }}
                    tickLine={false}
                    axisLine={{ stroke: "#d1d5db" }}
                    interval={chartRange === "year" ? 0 : 2}
                  >
                    <Label value="Date" position="insideBottom" offset={-2} fill="#374151" />
                  </XAxis>
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: "#6b7280" }}
                    tickLine={false}
                    axisLine={{ stroke: "#d1d5db" }}
                  >
                    <Label
                      value="Number of Bugs Reported"
                      angle={-90}
                      position="insideLeft"
                      offset={2}
                      fill="#374151"
                    />
                  </YAxis>
                  <Tooltip
                    formatter={(value) => [`${value}`, "Total Bugs"]}
                    labelFormatter={(value) => `Date ${value}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#16a34a"
                    strokeWidth={3}
                    dot={(props) => {
                      if (!props?.payload?.count) return false;

                      return (
                        <circle
                          cx={props.cx}
                          cy={props.cy}
                          r={3}
                          fill="#16a34a"
                          stroke="#16a34a"
                        />
                      );
                    }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
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
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 24,
  alignItems: "start",
  minHeight: "calc(100vh - 60px - 48px - 30px)",
  maxWidth: 1200,
  width: "100%",
  marginTop: 30,
  marginLeft: "auto",
  marginRight: "auto",
};

const leftCol = {
  display: "grid",
  gap: 20,
  alignContent: "start",
};

const rightCol = {
  display: "grid",
  gap: 14,
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
  minHeight: 120,
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
  width: "100%",
  display: "grid",
  gap: 12,
};

const createPanel = {
  borderTop: "1px solid #e2e8f0",
  paddingTop: 12,
  display: "grid",
  gap: 12,
};

const createGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const graphCard = {
  background: "white",
  borderRadius: 14,
  minHeight: 260,
  padding: 16,
  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
};

const graphHeaderRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const graphTitle = {
  color: "#111827",
  fontSize: 18,
  fontWeight: 700,
};

const graphToggleGroup = {
  display: "inline-flex",
  gap: 8,
  alignItems: "center",
};

const graphToggleBtn = {
  border: "1px solid #d1d5db",
  background: "white",
  color: "#374151",
  borderRadius: 999,
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const graphToggleBtnActive = {
  background: "#166534",
  borderColor: "#166534",
  color: "white",
};

const graphInner = {
  width: "100%",
  height: 200,
  marginTop: 12,
};

const bugsCard = {
  background: "white",
  borderRadius: 14,
  padding: 24,
  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  display: "grid",
  gap: 10,
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

const primaryBtnInline = {
  ...primaryBtn,
  width: "auto",
  padding: "10px 14px",
  fontSize: 14,
};

const secondaryBtn = {
  border: "1px solid #d1d5db",
  background: "white",
  color: "#1f2937",
  borderRadius: 10,
  padding: "10px 14px",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
};

const entryWindow = {
  border: "1px solid #ddd",
  background: "#f7f7fb",
  borderRadius: 14,
  padding: 14,
  display: "grid",
  gap: 12,
};

const entryTopRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const entryName = {
  fontWeight: 700,
  fontSize: 16,
  color: "#222",
};

const entryDate = {
  marginTop: 4,
  fontSize: 12,
  color: "#666",
};

const toggleBtn = {
  border: "1px solid #c5cad3",
  background: "white",
  borderRadius: 10,
  padding: "8px 12px",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
  color: "#2d3748",
};

const entryDetailsWrap = {
  borderTop: "1px solid #d8dce3",
  paddingTop: 12,
  display: "grid",
  gap: 12,
};

const detailsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const detailItem = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "10px 12px",
};

const detailItemFull = {
  ...detailItem,
  gridColumn: "1 / -1",
};

const detailLabel = {
  fontSize: 12,
  fontWeight: 700,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: 0.4,
  marginBottom: 6,
};

const detailValue = {
  color: "#1f2937",
  fontSize: 14,
  lineHeight: 1.45,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const repoLink = {
  color: "#1d4ed8",
  fontSize: 14,
  textDecoration: "underline",
  wordBreak: "break-all",
};

const createControl = {
  width: "100%",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: "10px",
  fontSize: 14,
  color: "#1f2937",
  backgroundColor: "#f8fafc",
  outline: "none",
  fontFamily: "inherit",
  lineHeight: 1.4,
};

const createTextarea = {
  ...createControl,
  minHeight: 100,
  resize: "vertical",
};

const createActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  flexWrap: "wrap",
};

const createStatusText = {
  margin: 0,
  color: "#b91c1c",
  fontSize: 13,
};
