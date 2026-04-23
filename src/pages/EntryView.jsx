import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BUG_TYPE_OPTIONS } from "../constants/bugTypes";
import { supabase } from "../supabaseClient";
import {
  buildEntryPayload,
  emptyEntryForm,
  toEntryFormData,
  validateEntryForm,
} from "../utils/entryForm";

export default function EntryView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [entry, setEntry] = useState(null);
  const [formData, setFormData] = useState({ ...emptyEntryForm });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetchEntry();
  }, [id]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function fetchEntry() {
    setLoading(true);
    setStatus("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      navigate("/login");
      return;
    }

    const { data, error } = await supabase
      .from("bug_entries")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data) {
      setStatus("Error loading entry.");
      setLoading(false);
      return;
    }

    setEntry(data);
    setFormData(toEntryFormData(data));
    setLoading(false);
  }

  async function saveEntry() {
    setStatus("");

    const formIssue = validateEntryForm(formData);
    if (formIssue) {
      setStatus(formIssue);
      return;
    }

    setSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setStatus("Please log in to update this entry.");
      setSaving(false);
      return;
    }

    const payload = buildEntryPayload(formData);

    const { data, error } = await supabase
      .from("bug_entries")
      .update(payload)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      setStatus(`Could not update entry: ${error.message}`);
      setSaving(false);
      return;
    }

    setEntry(data);
    setFormData(toEntryFormData(data));
    setIsEditing(false);
    setStatus("Entry updated.");
    setSaving(false);
  }

  function cancelEdit() {
    if (!entry) return;

    setFormData(toEntryFormData(entry));
    setIsEditing(false);
    setStatus("");
  }

  async function deleteEntry() {
    const confirmDelete = window.confirm("Are you sure you want to delete this entry?");
    if (!confirmDelete) return;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setStatus("Please log in to delete this entry.");
      return;
    }

    const { error } = await supabase
      .from("bug_entries")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      setStatus("Could not delete entry.");
      return;
    }

    navigate("/dashboard");
  }

  if (loading) {
    return <div style={styles.page}>Loading entry...</div>;
  }

  if (!entry) {
    return <div style={styles.page}>Entry not found.</div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.formCard}>
        <div style={styles.headerBlock}>
          <h1 style={styles.title}>{isEditing ? "Edit Bug Entry" : "Bug Entry"}</h1>
          <p style={styles.subtitle}>
            {isEditing
              ? "Update the fields below, then save your changes."
              : "Review the saved details for this bug entry. Press edit to make changes."}
          </p>
        </div>

        <div style={styles.form}>
          <div style={styles.fieldGrid}>
            <div style={styles.fieldBlock}>
              <label style={styles.label}>Entry Name</label>
              <input
                type="text"
                name="entry_name"
                value={formData.entry_name}
                onChange={handleChange}
                style={readOnlyStyle(styles.input, isEditing)}
                readOnly={!isEditing}
              />
            </div>

            <div style={styles.fieldBlock}>
              <label style={styles.label}>Bug Description</label>
              <input
                type="text"
                name="bug_description"
                value={formData.bug_description}
                onChange={handleChange}
                style={readOnlyStyle(styles.input, isEditing)}
                readOnly={!isEditing}
              />
            </div>

            <div style={styles.fieldBlock}>
              <label style={styles.label}>Bug Type</label>
              {isEditing ? (
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
              ) : (
                <input
                  type="text"
                  value={formData.bug_type}
                  style={readOnlyStyle(styles.input, false)}
                  readOnly
                />
              )}
            </div>

            <div style={styles.fieldBlock}>
              <label style={styles.label}>Severity</label>
              {isEditing ? (
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
              ) : (
                <input
                  type="text"
                  value={formData.severity}
                  style={readOnlyStyle(styles.input, false)}
                  readOnly
                />
              )}
            </div>

            <div style={styles.fieldBlockWide}>
              <label style={styles.label}>Repository URL</label>
              <input
                type="url"
                name="repo_url"
                value={formData.repo_url}
                onChange={handleChange}
                style={readOnlyStyle(styles.input, isEditing)}
                readOnly={!isEditing}
              />
            </div>

            <div style={styles.fieldBlockWide}>
              <label style={styles.label}>Code Snippet</label>
              <textarea
                name="code_snippet"
                value={formData.code_snippet}
                onChange={handleChange}
                style={readOnlyStyle(styles.textarea, isEditing)}
                readOnly={!isEditing}
              />
            </div>

            <div style={styles.fieldBlockWide}>
              <label style={styles.label}>Extra Details</label>
              <textarea
                name="extra_details"
                value={formData.extra_details}
                onChange={handleChange}
                style={readOnlyStyle(styles.textarea, isEditing)}
                readOnly={!isEditing}
              />
            </div>
          </div>

          <div style={styles.actionsRow}>
            <button type="button" onClick={() => navigate("/dashboard")} style={styles.secondaryButton}>
              Back
            </button>

            {isEditing ? (
              <>
                <button type="button" onClick={cancelEdit} style={styles.secondaryButton}>
                  Cancel
                </button>
                <button type="button" onClick={saveEntry} disabled={saving} style={styles.button}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setIsEditing(true)} style={styles.button}>
                  Edit
                </button>
                <button type="button" onClick={deleteEntry} style={styles.deleteButton}>
                  Delete
                </button>
              </>
            )}
          </div>

          {status && <p style={styles.status}>{status}</p>}
        </div>
      </div>
    </div>
  );
}

function readOnlyStyle(baseStyle, isEditing) {
  return {
    ...baseStyle,
    background: isEditing ? "#f7f7fb" : "#ffffff",
    cursor: isEditing ? "text" : "default",
  };
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
  deleteButton: {
    padding: "12px 16px",
    border: "none",
    borderRadius: 10,
    backgroundColor: "#5b2ca5",
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