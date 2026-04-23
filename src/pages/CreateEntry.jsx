import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BUG_TYPE_OPTIONS } from "../constants/bugTypes";
import { supabase } from "../supabaseClient";
import {
  buildEntryPayload,
  emptyEntryForm,
  validateEntryForm,
} from "../utils/entryForm";

export default function CreateEntry() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ ...emptyEntryForm });

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("");

    const formIssue = validateEntryForm(formData);
    if (formIssue) {
      setStatus(formIssue);
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setStatus("Please log in before creating an entry.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("bug_entries").insert([
        {
          user_id: user.id,
          ...buildEntryPayload(formData),
        },
      ]);

      if (error) {
        setStatus(`Could not save entry: ${error.message}`);
        setLoading(false);
        return;
      }

      setStatus("Entry saved.");

      setFormData({ ...emptyEntryForm });

      navigate("/dashboard");
    } catch (err) {
      setStatus("Something went wrong while saving this entry.");
    }

    setLoading(false);
  }

  return (
    <div style={styles.page}>
      <div style={styles.formCard}>
        <div style={styles.headerBlock}>
          <h1 style={styles.title}>Create New Bug Entry</h1>
          <p style={styles.subtitle}>
            Log a bug so you can track patterns, document fixes, and revisit useful debugging context later.
          </p>
        </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.fieldGrid}>
              <div style={styles.fieldBlock}>
                <label style={styles.label}>Entry Name</label>
                <input
                  type="text"
                  name="entry_name"
                  value={formData.entry_name}
                  onChange={handleChange}
                  placeholder="Ex: Login button not working"
                  style={styles.input}
                />
              </div>

              <div style={styles.fieldBlock}>
                <label style={styles.label}>Bug Description</label>
                <input
                  type="text"
                  name="bug_description"
                  value={formData.bug_description}
                  onChange={handleChange}
                  placeholder="Ex: Login button throws token error"
                  style={styles.input}
                />
              </div>

              <div style={styles.fieldBlock}>
                <label style={styles.label}>Bug Type</label>
                <select
                  name="bug_type"
                  value={formData.bug_type}
                  onChange={handleChange}
                  style={styles.input}
                >
                  <option value="">Select bug type</option>
                  {BUG_TYPE_OPTIONS.map((bugType) => (
                    <option key={bugType} value={bugType}>
                      {bugType}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.fieldBlock}>
                <label style={styles.label}>Severity</label>
                <select
                  name="severity"
                  value={formData.severity}
                  onChange={handleChange}
                  style={styles.input}
                >
                  <option value="">Select severity</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div style={styles.fieldBlockWide}>
                <label style={styles.label}>Repository URL</label>
                <input
                  type="url"
                  name="repo_url"
                  value={formData.repo_url}
                  onChange={handleChange}
                  placeholder="https://github.com/..."
                  style={styles.input}
                />
              </div>

              <div style={styles.fieldBlockWide}>
                <label style={styles.label}>Code Snippet</label>
                <textarea
                  name="code_snippet"
                  value={formData.code_snippet}
                  onChange={handleChange}
                  placeholder="Paste relevant code here..."
                  style={styles.textarea}
                />
              </div>

              <div style={styles.fieldBlockWide}>
                <label style={styles.label}>Extra Details</label>
                <textarea
                  name="extra_details"
                  value={formData.extra_details}
                  onChange={handleChange}
                  placeholder="Additional context, reproduction notes, or follow-up details..."
                  style={styles.textarea}
                />
              </div>
            </div>

            <div style={styles.actionsRow}>
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                style={styles.secondaryButton}
              >
                Cancel
              </button>

              <button type="submit" disabled={loading} style={styles.button}>
                {loading ? "Saving Entry..." : "Create Entry"}
              </button>
            </div>

            {status && <p style={styles.status}>{status}</p>}
          </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "calc(100vh - 60px - 48px)",
    display: "flex",
    justifyContent: "center",
    marginTop: 30,
    padding: "0 30px 30px",
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 24,
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
    width: "100%",
    maxWidth: 900,
    display: "grid",
    gap: 22,
  },
  headerBlock: {
    display: "grid",
    gap: 0,
  },
  title: {
    margin: 0,
    marginBottom: 10,
    fontSize: 30,
    fontWeight: 700,
    color: "#333",
  },
  subtitle: {
    margin: 0,
    color: "#555",
    fontSize: 15,
    lineHeight: 1.5,
  },
  form: {
    display: "grid",
    gap: 18,
  },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 18,
  },
  fieldBlock: {
    display: "grid",
    gap: 8,
  },
  fieldBlockWide: {
    display: "grid",
    gap: 8,
    gridColumn: "1 / -1",
  },
  label: {
    fontWeight: 600,
    color: "#444",
    fontSize: 14,
  },
  input: {
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    fontSize: 14,
    outline: "none",
    background: "#f7f7fb",
    color: "#333",
  },
  textarea: {
    minHeight: 120,
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    fontSize: 14,
    resize: "vertical",
    outline: "none",
    background: "#f7f7fb",
    color: "#333",
    fontFamily: "inherit",
  },
  actionsRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 4,
  },
  secondaryButton: {
    padding: "12px 16px",
    borderRadius: 10,
    border: "1px solid #ddd",
    background: "white",
    color: "#333",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
  },
  button: {
    padding: "12px 16px",
    border: "none",
    borderRadius: 10,
    backgroundColor: "#26a036",
    color: "white",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
  },
  status: {
    margin: 0,
    fontSize: 14,
    color: "#374151",
  },
};