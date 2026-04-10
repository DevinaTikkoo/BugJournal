import { useEffect, useMemo, useState } from "react";
import { BUG_TYPE_OPTIONS } from "../constants/bugTypes";
import { supabase } from "../supabaseClient";
import {
  buildEntryPayload,
  emptyEntryForm,
  toEntryFormData,
  validateEntryForm,
} from "../utils/entryForm";

export default function Entries() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRepos, setExpandedRepos] = useState({});
  const [expandedEntries, setExpandedEntries] = useState({});
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [inlineFormData, setInlineFormData] = useState(null);
  const [inlineStatus, setInlineStatus] = useState("");
  const [inlineSaving, setInlineSaving] = useState(false);
  const [isCreatingEntry, setIsCreatingEntry] = useState(false);
  const [createFormData, setCreateFormData] = useState({ ...emptyEntryForm });
  const [createStatus, setCreateStatus] = useState("");
  const [createSaving, setCreateSaving] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedEntryIds, setSelectedEntryIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [selectedSeverities, setSelectedSeverities] = useState([]);
  const [selectedBugTypes, setSelectedBugTypes] = useState([]);

  useEffect(() => {
    fetchEntries();
  }, []);

  async function fetchEntries() {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("User fetch error:", userError);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("bug_entries")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching entries:", error);
    } else {
      setEntries(data || []);
    }

    setLoading(false);
  }

  function toggleRepo(repoName) {
    setExpandedRepos((prev) => ({
      ...prev,
      [repoName]: !prev[repoName],
    }));
  }

  function toggleEntry(entryId) {
    setExpandedEntries((prev) => ({
      ...prev,
      [entryId]: !prev[entryId],
    }));

    if (editingEntryId === entryId) {
      setEditingEntryId(null);
      setInlineFormData(null);
      setInlineStatus("");
    }
  }

  function startInlineEdit(entry) {
    setIsCreatingEntry(false);
    setCreateStatus("");
    setEditingEntryId(entry.id);
    setInlineFormData(toEntryFormData(entry));
    setInlineStatus("");
    setExpandedEntries((prev) => ({
      ...prev,
      [entry.id]: true,
    }));
  }

  function handleInlineChange(e) {
    const { name, value } = e.target;

    setInlineFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function cancelInlineEdit() {
    setEditingEntryId(null);
    setInlineFormData(null);
    setInlineStatus("");
  }

  async function saveInlineEdit(entryId) {
    if (!inlineFormData) return;

    setInlineStatus("");

    const validationError = validateEntryForm(inlineFormData);
    if (validationError) {
      setInlineStatus(validationError);
      return;
    }

    setInlineSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setInlineStatus("You must be logged in to edit this entry.");
      setInlineSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from("bug_entries")
      .update(buildEntryPayload(inlineFormData))
      .eq("id", entryId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      setInlineStatus(`Error: ${error.message}`);
      setInlineSaving(false);
      return;
    }

    setEntries((prev) => prev.map((item) => (item.id === entryId ? data : item)));
    setEditingEntryId(null);
    setInlineFormData(null);
    setInlineStatus("");
    setInlineSaving(false);
  }

  function startInlineCreate() {
    setEditingEntryId(null);
    setInlineFormData(null);
    setInlineStatus("");
    setCreateStatus("");
    setCreateFormData({ ...emptyEntryForm });
    setIsCreatingEntry(true);
  }

  function cancelInlineCreate() {
    setIsCreatingEntry(false);
    setCreateFormData({ ...emptyEntryForm });
    setCreateStatus("");
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
      .select()
      .single();

    if (error) {
      setCreateStatus(`Error: ${error.message}`);
      setCreateSaving(false);
      return;
    }

    const repoName = data.repo_name?.trim() || "No Repository";
    setEntries((prev) => [data, ...prev]);
    setExpandedRepos((prev) => ({
      ...prev,
      [repoName]: true,
    }));
    setExpandedEntries((prev) => ({
      ...prev,
      [data.id]: true,
    }));

    setCreateFormData({ ...emptyEntryForm });
    setCreateStatus("");
    setCreateSaving(false);
    setIsCreatingEntry(false);
  }

  function toggleEntrySelection(entryId) {
    if (!isSelectionMode) return;

    setSelectedEntryIds((prev) =>
      prev.includes(entryId) ? prev.filter((id) => id !== entryId) : [...prev, entryId]
    );
  }

  function startSelectionMode() {
    setBulkStatus("");
    setIsSelectionMode(true);
  }

  function cancelSelectionMode() {
    setIsSelectionMode(false);
    setSelectedEntryIds([]);
    setBulkStatus("");
  }

  async function deleteSelectedEntries() {
    if (selectedEntryIds.length === 0) return;

    const confirmDelete = window.confirm(
      `Delete ${selectedEntryIds.length} selected entr${selectedEntryIds.length === 1 ? "y" : "ies"}?`
    );
    if (!confirmDelete) return;

    setBulkStatus("");
    setBulkDeleting(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setBulkStatus("You must be logged in to delete entries.");
      setBulkDeleting(false);
      return;
    }

    const { error } = await supabase
      .from("bug_entries")
      .delete()
      .eq("user_id", user.id)
      .in("id", selectedEntryIds);

    if (error) {
      setBulkStatus(`Error: ${error.message}`);
      setBulkDeleting(false);
      return;
    }

    setEntries((prev) => prev.filter((entry) => !selectedEntryIds.includes(entry.id)));
    setSelectedEntryIds([]);
    setIsSelectionMode(false);
    setBulkStatus("Selected entries deleted.");
    setBulkDeleting(false);
  }

  function sortEntries(list) {
    const sorted = [...list];

    switch (sortOption) {
      case "newest":
        sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case "oldest":
        sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case "name-asc":
        sorted.sort((a, b) => (a.entry_name || "").localeCompare(b.entry_name || ""));
        break;
      case "name-desc":
        sorted.sort((a, b) => (b.entry_name || "").localeCompare(a.entry_name || ""));
        break;
      case "severity":
        sorted.sort((a, b) => (a.severity || "").localeCompare(b.severity || ""));
        break;
      default:
        break;
    }

    return sorted;
  }

  function toggleFilterValue(value, setter) {
    setter((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  }

  const severityOptions = ["Low", "Medium", "High", "Critical"];

  const groupedEntries = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = entries.filter((entry) => {
      const searchableText = `
        ${entry.entry_name || ""}
        ${entry.bug_type || ""}
        ${entry.bug_description || ""}
        ${entry.extra_details || ""}
        ${entry.repo_name || ""}
      `.toLowerCase();

      const entrySeverity = entry.severity?.trim() || "";
      const entryBugType = entry.bug_type?.trim() || "";

      const matchesSeverity =
        selectedSeverities.length === 0 || selectedSeverities.includes(entrySeverity);
      const matchesBugType =
        selectedBugTypes.length === 0 || selectedBugTypes.includes(entryBugType);

      return searchableText.includes(normalizedSearch) && matchesSeverity && matchesBugType;
    });

    const grouped = {};

    for (const entry of filtered) {
      const repo = entry.repo_name?.trim() || "No Repository";

      if (!grouped[repo]) {
        grouped[repo] = [];
      }

      grouped[repo].push(entry);
    }

    for (const repo in grouped) {
      grouped[repo] = sortEntries(grouped[repo]);
    }

    return grouped;
  }, [entries, searchTerm, sortOption, selectedSeverities, selectedBugTypes]);

  const repoNames = Object.keys(groupedEntries).sort((a, b) =>
    a.localeCompare(b)
  );

  if (loading) {
    return <div style={styles.page}>Loading entries...</div>;
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>My Bugs</h1>
      <div style={styles.searchRow}>
        <input
          type="text"
          placeholder="Search entry name, description, or repository..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div style={styles.mainContent}>
        <aside style={styles.sidebar}>
          <div style={styles.filterShell}>
            <h3 style={styles.filterTitle}>Sort</h3>
            <div style={styles.checkboxList}>
              <label style={styles.checkboxLabel}>
                <input
                  type="radio"
                  name="sort"
                  checked={sortOption === "newest"}
                  onChange={() => setSortOption("newest")}
                />
                Newest First
              </label>
              <label style={styles.checkboxLabel}>
                <input
                  type="radio"
                  name="sort"
                  checked={sortOption === "oldest"}
                  onChange={() => setSortOption("oldest")}
                />
                Oldest First
              </label>
              <label style={styles.checkboxLabel}>
                <input
                  type="radio"
                  name="sort"
                  checked={sortOption === "name-asc"}
                  onChange={() => setSortOption("name-asc")}
                />
                Entry Name A–Z
              </label>
              <label style={styles.checkboxLabel}>
                <input
                  type="radio"
                  name="sort"
                  checked={sortOption === "name-desc"}
                  onChange={() => setSortOption("name-desc")}
                />
                Entry Name Z–A
              </label>
              <label style={styles.checkboxLabel}>
                <input
                  type="radio"
                  name="sort"
                  checked={sortOption === "severity"}
                  onChange={() => setSortOption("severity")}
                />
                Severity
              </label>
            </div>
          </div>

          <div style={styles.filterShell}>
            <h3 style={styles.filterTitle}>Filters</h3>

            <h4 style={styles.filterSubheading}>Severity</h4>
            <div style={styles.checkboxList}>
              {severityOptions.map((severity) => (
                <label key={severity} style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedSeverities.includes(severity)}
                    onChange={() =>
                      toggleFilterValue(severity, setSelectedSeverities)
                    }
                  />
                  {severity}
                </label>
              ))}
            </div>

            <h4 style={styles.filterSubheading}>Bug Type</h4>
            <div style={styles.checkboxList}>
              {BUG_TYPE_OPTIONS.map((bugType) => (
                <label key={bugType} style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedBugTypes.includes(bugType)}
                    onChange={() =>
                      toggleFilterValue(bugType, setSelectedBugTypes)
                    }
                  />
                  {bugType}
                </label>
              ))}
            </div>
          </div>

          <div style={styles.filterShell}>
            {!isSelectionMode ? (
              <button
                type="button"
                onClick={startSelectionMode}
                style={styles.selectionPrimaryBtn}
              >
                Select
              </button>
            ) : (
              <>
                <p style={styles.selectionText}>Selected: {selectedEntryIds.length}</p>
                <div style={styles.selectionActionsInline}>
                  <button
                    type="button"
                    onClick={deleteSelectedEntries}
                    style={styles.selectionDeleteBtn}
                    disabled={selectedEntryIds.length === 0 || bulkDeleting}
                  >
                    {bulkDeleting ? "Deleting..." : "Delete"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelSelectionMode}
                    style={styles.selectionSecondaryBtn}
                    disabled={bulkDeleting}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
            {bulkStatus && <p style={styles.bulkStatus}>{bulkStatus}</p>}
          </div>
        </aside>

        <section style={styles.entriesColumn}>
          <div style={styles.repositoryBlock}>
            <div style={styles.repositoryHeaderRow}>
              <div style={styles.repositoryBlockHeader}>Repositories</div>
              {!isCreatingEntry && (
                <button
                  type="button"
                  onClick={startInlineCreate}
                  style={styles.manageButton}
                >
                  Create Entry
                </button>
              )}
            </div>

            {isCreatingEntry && (
              <div style={styles.createPanel}>
                <div style={styles.metaGrid}>
                  <div style={styles.metaItem}>
                    <div style={styles.metaLabel}>Entry Name</div>
                    <input
                      type="text"
                      name="entry_name"
                      value={createFormData.entry_name}
                      onChange={handleCreateChange}
                      style={styles.metaControl}
                    />
                  </div>

                  <div style={styles.metaItem}>
                    <div style={styles.metaLabel}>Bug Type</div>
                    <select
                      name="bug_type"
                      value={createFormData.bug_type}
                      onChange={handleCreateChange}
                      style={styles.metaControl}
                    >
                      <option value="">Select bug type</option>
                      {BUG_TYPE_OPTIONS.map((bugType) => (
                        <option key={bugType} value={bugType}>
                          {bugType}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.metaItem}>
                    <div style={styles.metaLabel}>Severity</div>
                    <select
                      name="severity"
                      value={createFormData.severity}
                      onChange={handleCreateChange}
                      style={styles.metaControl}
                    >
                      <option value="">Select severity</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>

                  <div style={styles.metaItem}>
                    <div style={styles.metaLabel}>Repository URL</div>
                    <input
                      type="url"
                      name="repo_url"
                      value={createFormData.repo_url}
                      onChange={handleCreateChange}
                      style={styles.metaControl}
                    />
                  </div>

                  <div style={styles.metaItemFull}>
                    <div style={styles.metaLabel}>Bug Description</div>
                    <textarea
                      name="bug_description"
                      value={createFormData.bug_description}
                      onChange={handleCreateChange}
                      style={styles.metaTextarea}
                    />
                  </div>

                  <div style={styles.metaItemFull}>
                    <div style={styles.metaLabel}>Code Snippet</div>
                    <textarea
                      name="code_snippet"
                      value={createFormData.code_snippet}
                      onChange={handleCreateChange}
                      style={styles.metaTextarea}
                    />
                  </div>

                  <div style={styles.metaItemFull}>
                    <div style={styles.metaLabel}>Extra Details</div>
                    <textarea
                      name="extra_details"
                      value={createFormData.extra_details}
                      onChange={handleCreateChange}
                      style={styles.metaTextarea}
                    />
                  </div>
                </div>

                <div style={styles.metaActions}>
                  <button
                    type="button"
                    onClick={cancelInlineCreate}
                    style={styles.secondaryButton}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveInlineCreate}
                    style={styles.manageButton}
                    disabled={createSaving}
                  >
                    {createSaving ? "Creating..." : "Create Entry"}
                  </button>
                </div>

                {createStatus && <p style={styles.inlineStatus}>{createStatus}</p>}
              </div>
            )}

            {repoNames.length === 0 ? (
              <p style={styles.emptyText}>No matching entries found.</p>
            ) : (
              <div style={styles.repositoryList}>
                {repoNames.map((repoName) => {
                  const isRepoExpanded = !!expandedRepos[repoName];
                  const repoEntries = groupedEntries[repoName];

                  return (
                    <div key={repoName} style={styles.repoShell}>
                      <div style={styles.repoHeader}>
                        <div>
                          <h2 style={styles.repoTitle}>{repoName}</h2>
                          <p style={styles.repoCount}>
                            {repoEntries.length} bug{repoEntries.length !== 1 ? "s" : ""}
                          </p>
                        </div>

                        <button
                          onClick={() => toggleRepo(repoName)}
                          style={styles.expandButton}
                          type="button"
                        >
                          {isRepoExpanded ? "Hide" : "Show"}
                        </button>
                      </div>

                      {isRepoExpanded && (
                        <div style={styles.entryList}>
                          {repoEntries.map((entry) => {
                            const isEntryExpanded = !!expandedEntries[entry.id];
                            const isEditingEntry = editingEntryId === entry.id;
                            const isSelected = selectedEntryIds.includes(entry.id);

                            return (
                              <div key={entry.id} style={styles.entryShell}>
                                <div style={styles.entryHeader}>
                                  <div>
                                    <h3 style={styles.entryName}>
                                      {entry.entry_name || "Untitled Entry"}
                                    </h3>
                                    <p style={styles.entryMetaInline}>
                                      {entry.severity || "No Severity"} | {entry.bug_type || "No Bug Type"}
                                    </p>
                                  </div>

                                  <div style={styles.entryHeaderActions}>
                                    {isSelectionMode && (
                                      <label style={styles.selectCheckWrap}>
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => toggleEntrySelection(entry.id)}
                                        />
                                        Select
                                      </label>
                                    )}

                                    <button
                                      onClick={() => toggleEntry(entry.id)}
                                      style={styles.entryToggleButton}
                                      type="button"
                                    >
                                      {isEntryExpanded ? "Hide" : "Show"}
                                    </button>
                                  </div>
                                </div>

                                {isEntryExpanded && (
                                  <div style={styles.entryMetaBlock}>
                                    <div style={styles.metaGrid}>
                                      <div style={styles.metaItem}>
                                        <div style={styles.metaLabel}>Entry Name</div>
                                        {isEditingEntry && inlineFormData ? (
                                          <input
                                            type="text"
                                            name="entry_name"
                                            value={inlineFormData.entry_name}
                                            onChange={handleInlineChange}
                                            style={styles.metaControl}
                                          />
                                        ) : (
                                          <div style={styles.metaValue}>{entry.entry_name || "Untitled Entry"}</div>
                                        )}
                                      </div>

                                      <div style={styles.metaItem}>
                                        <div style={styles.metaLabel}>Bug Type</div>
                                        {isEditingEntry && inlineFormData ? (
                                          <select
                                            name="bug_type"
                                            value={inlineFormData.bug_type}
                                            onChange={handleInlineChange}
                                            style={styles.metaControl}
                                          >
                                            <option value="">Select bug type</option>
                                            {BUG_TYPE_OPTIONS.map((bugType) => (
                                              <option key={bugType} value={bugType}>
                                                {bugType}
                                              </option>
                                            ))}
                                          </select>
                                        ) : (
                                          <div style={styles.metaValue}>{entry.bug_type || "Not provided"}</div>
                                        )}
                                      </div>

                                      <div style={styles.metaItem}>
                                        <div style={styles.metaLabel}>Severity</div>
                                        {isEditingEntry && inlineFormData ? (
                                          <select
                                            name="severity"
                                            value={inlineFormData.severity}
                                            onChange={handleInlineChange}
                                            style={styles.metaControl}
                                          >
                                            <option value="">Select severity</option>
                                            <option value="Low">Low</option>
                                            <option value="Medium">Medium</option>
                                            <option value="High">High</option>
                                            <option value="Critical">Critical</option>
                                          </select>
                                        ) : (
                                          <div style={styles.metaValue}>{entry.severity || "Not provided"}</div>
                                        )}
                                      </div>

                                      <div style={styles.metaItem}>
                                        <div style={styles.metaLabel}>Created</div>
                                        <div style={styles.metaValue}>
                                          {entry.created_at
                                            ? new Date(entry.created_at).toLocaleDateString()
                                            : "Unknown"}
                                        </div>
                                      </div>

                                      <div style={styles.metaItem}>
                                        <div style={styles.metaLabel}>Repository URL</div>
                                        {isEditingEntry && inlineFormData ? (
                                          <input
                                            type="url"
                                            name="repo_url"
                                            value={inlineFormData.repo_url}
                                            onChange={handleInlineChange}
                                            style={styles.metaControl}
                                          />
                                        ) : (
                                          <div style={styles.metaValue}>{entry.repo_url || "Not provided"}</div>
                                        )}
                                      </div>

                                      <div style={styles.metaItemFull}>
                                        <div style={styles.metaLabel}>Bug Description</div>
                                        {isEditingEntry && inlineFormData ? (
                                          <textarea
                                            name="bug_description"
                                            value={inlineFormData.bug_description}
                                            onChange={handleInlineChange}
                                            style={styles.metaTextarea}
                                          />
                                        ) : (
                                          <div style={styles.metaValue}>
                                            {entry.bug_description || "No description provided."}
                                          </div>
                                        )}
                                      </div>

                                      <div style={styles.metaItemFull}>
                                        <div style={styles.metaLabel}>Code Snippet</div>
                                        {isEditingEntry && inlineFormData ? (
                                          <textarea
                                            name="code_snippet"
                                            value={inlineFormData.code_snippet}
                                            onChange={handleInlineChange}
                                            style={styles.metaTextarea}
                                          />
                                        ) : (
                                          <div style={styles.metaValue}>{entry.code_snippet || "Not provided"}</div>
                                        )}
                                      </div>

                                      <div style={styles.metaItemFull}>
                                        <div style={styles.metaLabel}>Extra Details</div>
                                        {isEditingEntry && inlineFormData ? (
                                          <textarea
                                            name="extra_details"
                                            value={inlineFormData.extra_details}
                                            onChange={handleInlineChange}
                                            style={styles.metaTextarea}
                                          />
                                        ) : (
                                          <div style={styles.metaValue}>{entry.extra_details || "Not provided"}</div>
                                        )}
                                      </div>
                                    </div>

                                    <div style={styles.metaActions}>
                                      {isEditingEntry && inlineFormData ? (
                                        <>
                                          <button
                                            type="button"
                                            onClick={cancelInlineEdit}
                                            style={styles.secondaryButton}
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => saveInlineEdit(entry.id)}
                                            style={styles.manageButton}
                                            disabled={inlineSaving}
                                          >
                                            {inlineSaving ? "Saving..." : "Save Changes"}
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => startInlineEdit(entry)}
                                          style={styles.manageButton}
                                        >
                                          Edit
                                        </button>
                                      )}
                                    </div>

                                    {isEditingEntry && inlineStatus && (
                                      <p style={styles.inlineStatus}>{inlineStatus}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

const styles = {
  page: {
    padding: "24px",
  },
  title: {
    marginBottom: "20px",
  },
  searchRow: {
    marginBottom: "24px",
  },
  mainContent: {
    display: "flex",
    gap: "20px",
    alignItems: "flex-start",
  },
  sidebar: {
    width: "270px",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  filterShell: {
    border: "1px solid #ddd",
    borderRadius: "12px",
    backgroundColor: "#fff",
    padding: "14px",
  },
  filterTitle: {
    margin: "0 0 10px 0",
    fontSize: "15px",
  },
  filterSubheading: {
    margin: "14px 0 8px 0",
    fontSize: "14px",
  },
  checkboxList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
  },
  entriesColumn: {
    flex: 1,
    minWidth: 0,
  },
  repositoryBlock: {
    border: "1px solid #ddd",
    borderRadius: "14px",
    backgroundColor: "#fff",
    padding: "16px",
    display: "grid",
    gap: "14px",
  },
  repositoryBlockHeader: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#222",
  },
  repositoryHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },
  createPanel: {
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "14px",
    backgroundColor: "#ffffff",
    display: "grid",
    gap: "12px",
  },
  repositoryList: {
    display: "grid",
    gap: "14px",
  },
  emptyText: {
    margin: 0,
    color: "#666",
  },
  searchInput: {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },
  repoShell: {
    border: "1px solid #ddd",
    borderRadius: "12px",
    overflow: "hidden",
    backgroundColor: "#f8fafc",
  },
  repoHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px",
    backgroundColor: "#f8f8f8",
  },
  repoTitle: {
    margin: 0,
  },
  repoCount: {
    margin: "4px 0 0 0",
    color: "#666",
    fontSize: "14px",
  },
  expandButton: {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    backgroundColor: "#222",
    color: "#fff",
  },
  entryList: {
    padding: "16px",
    display: "grid",
    gap: "12px",
  },
  entryShell: {
    border: "1px solid #e3e3e3",
    borderRadius: "10px",
    padding: "14px",
    backgroundColor: "#fff",
    display: "grid",
    gap: "10px",
  },
  entryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
  },
  entryHeaderActions: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  selectCheckWrap: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    color: "#475569",
    fontWeight: 600,
  },
  entryName: {
    margin: 0,
    fontSize: "17px",
  },
  entryMetaInline: {
    margin: "6px 0 0 0",
    fontSize: "13px",
    color: "#555",
  },
  entryToggleButton: {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    cursor: "pointer",
    backgroundColor: "#fff",
    color: "#1f2937",
    fontWeight: 600,
  },
  entryMetaBlock: {
    borderTop: "1px solid #e2e8f0",
    paddingTop: "12px",
    display: "grid",
    gap: "12px",
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "10px",
  },
  metaItem: {
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "10px",
    backgroundColor: "#f8fafc",
  },
  metaItemFull: {
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "10px",
    backgroundColor: "#f8fafc",
    gridColumn: "1 / -1",
  },
  metaLabel: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: "6px",
  },
  metaValue: {
    margin: 0,
    fontSize: "14px",
    color: "#1f2937",
    lineHeight: 1.4,
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
  },
  metaControl: {
    width: "100%",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "10px",
    fontSize: "14px",
    color: "#1f2937",
    backgroundColor: "#f8fafc",
    outline: "none",
    fontFamily: "inherit",
    lineHeight: 1.4,
  },
  metaTextarea: {
    width: "100%",
    minHeight: "110px",
    resize: "vertical",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "10px",
    fontSize: "14px",
    color: "#1f2937",
    backgroundColor: "#f8fafc",
    outline: "none",
    fontFamily: "inherit",
    lineHeight: 1.4,
  },
  metaActions: {
    display: "flex",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: "8px",
  },
  secondaryButton: {
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    padding: "10px 14px",
    cursor: "pointer",
    backgroundColor: "#fff",
    color: "#1f2937",
    fontWeight: 600,
  },
  manageButton: {
    border: "none",
    borderRadius: "8px",
    padding: "10px 14px",
    cursor: "pointer",
    backgroundColor: "#26a036",
    color: "#fff",
    fontWeight: 700,
  },
  inlineStatus: {
    margin: 0,
    color: "#b91c1c",
    fontSize: "13px",
  },
  selectionText: {
    margin: "0 0 10px 0",
    color: "#475569",
    fontSize: "13px",
    fontWeight: 600,
  },
  selectionPrimaryBtn: {
    border: "none",
    borderRadius: "8px",
    padding: "10px 12px",
    cursor: "pointer",
    backgroundColor: "#1f2937",
    color: "#fff",
    fontWeight: 700,
    width: "100%",
  },
  selectionActionsInline: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
  },
  selectionSecondaryBtn: {
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    padding: "10px 12px",
    cursor: "pointer",
    backgroundColor: "#fff",
    color: "#1f2937",
    fontWeight: 600,
  },
  selectionDeleteBtn: {
    border: "none",
    borderRadius: "8px",
    padding: "10px 12px",
    cursor: "pointer",
    backgroundColor: "#26a036",
    color: "#fff",
    fontWeight: 700,
  },
  bulkStatus: {
    margin: "10px 0 0 0",
    color: "#475569",
    fontSize: "13px",
  },
};