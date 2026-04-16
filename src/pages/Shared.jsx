import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BUG_TYPE_OPTIONS } from "../constants/bugTypes";
import { supabase } from "../supabaseClient";
import {
  buildEntryPayload,
  toEntryFormData,
  validateEntryForm,
} from "../utils/entryForm";

export default function Shared() {
  const navigate = useNavigate();

  const [allEntries, setAllEntries] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedRepos, setExpandedRepos] = useState({});
  const [expandedEntries, setExpandedEntries] = useState({});
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [inlineFormData, setInlineFormData] = useState(null);
  const [inlineStatus, setInlineStatus] = useState("");
  const [inlineSaving, setInlineSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSeverities, setSelectedSeverities] = useState([]);
  const [selectedBugTypes, setSelectedBugTypes] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [creatorNamesById, setCreatorNamesById] = useState({});
  const [sortOption, setSortOption] = useState("newest");
  const [commentsByEntryId, setCommentsByEntryId] = useState({});
  const [commentDraftByEntryId, setCommentDraftByEntryId] = useState({});
  const [commentSavingByEntryId, setCommentSavingByEntryId] = useState({});
  const [commentStatusByEntryId, setCommentStatusByEntryId] = useState({});
  const [commentAuthorNamesById, setCommentAuthorNamesById] = useState({});

  useEffect(() => {
    fetchSharedEntries();
  }, []);

  function formatDateTime(value) {
    if (!value) return "Unknown";

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Unknown";

    return parsed.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function normalizeRepositoryKey(entry) {
    const rawUrl = entry?.repo_url?.trim();

    if (rawUrl) {
      try {
        const parsed = new URL(rawUrl);
        const host = parsed.hostname.toLowerCase();
        const path = parsed.pathname.replace(/\/+$/, "").toLowerCase();
        return `${host}${path}`;
      } catch {
      }
    }

    return entry?.repo_name?.trim().toLowerCase() || "";
  }

  function getRepositoryLabel(entry) {
    const repoName = entry?.repo_name?.trim();
    if (repoName) return repoName;

    const rawUrl = entry?.repo_url?.trim();
    if (rawUrl) {
      try {
        const parsed = new URL(rawUrl);
        const path = parsed.pathname.replace(/\/+$/, "").replace(/^\/+/, "");
        if (path) return path;
      } catch {
      }
    }

    return "No Repository";
  }

  async function fetchSharedEntries() {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      navigate("/login");
      return;
    }

    setCurrentUserId(user.id);

    // Fetch current user's entries
    const { data: userEntries, error: userEntriesErr } = await supabase
      .from("bug_entries")
      .select("*")
      .eq("user_id", user.id);

    if (userEntriesErr) {
      console.error("Error fetching user entries:", userEntriesErr);
      setLoading(false);
      return;
    }

    // Build match keys from user's repository links (fallback to repo_name)
    const userRepoKeys = new Set(
      (userEntries || [])
        .map((entry) => normalizeRepositoryKey(entry))
        .filter(Boolean)
    );

    // Fetch entries from other users, then keep only those with matching repository keys
    let otherEntries = [];
    if (userRepoKeys.size > 0) {
      const { data: shared, error: sharedErr } = await supabase
        .from("bug_entries")
        .select("*")
        .neq("user_id", user.id);

      if (sharedErr) {
        console.error("Error fetching shared entries:", sharedErr);
      } else {
        otherEntries = (shared || []).filter((entry) =>
          userRepoKeys.has(normalizeRepositoryKey(entry))
        );
      }
    }

    const combinedEntries = [...(userEntries || []), ...otherEntries];
    setAllEntries(combinedEntries);

    const userIds = [...new Set(combinedEntries.map((entry) => entry.user_id).filter(Boolean))];
    if (userIds.length > 0) {
      const { data: profiles, error: profilesErr } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", userIds);

      if (!profilesErr && Array.isArray(profiles)) {
        const nameMap = {};
        for (const profile of profiles) {
          if (profile?.id) {
            nameMap[profile.id] = profile.username || "another user";
          }
        }
        setCreatorNamesById(nameMap);
      } else {
        setCreatorNamesById({});
      }
    } else {
      setCreatorNamesById({});
    }

    await fetchCommentsForEntries(combinedEntries);

    setLoading(false);
  }

  async function fetchCommentsForEntries(entriesList) {
    const entryIds = [...new Set((entriesList || []).map((entry) => entry.id).filter(Boolean))];

    if (entryIds.length === 0) {
      setCommentsByEntryId({});
      return;
    }

    const initialMap = {};
    entryIds.forEach((entryId) => {
      initialMap[entryId] = [];
    });

    const { data: comments, error: commentsErr } = await supabase
      .from("bug_entry_comments")
      .select("id, entry_id, user_id, body, created_at")
      .in("entry_id", entryIds)
      .order("created_at", { ascending: true });

    if (commentsErr) {
      console.error("Error fetching comments:", commentsErr);
      setCommentsByEntryId(initialMap);
      return;
    }

    (comments || []).forEach((comment) => {
      if (!comment?.entry_id) return;
      if (!initialMap[comment.entry_id]) initialMap[comment.entry_id] = [];
      initialMap[comment.entry_id].push(comment);
    });

    setCommentsByEntryId(initialMap);

    const commentUserIds = [
      ...new Set((comments || []).map((comment) => comment.user_id).filter(Boolean)),
    ];

    if (commentUserIds.length === 0) return;

    const { data: commentProfiles, error: commentProfilesErr } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", commentUserIds);

    if (commentProfilesErr || !Array.isArray(commentProfiles)) return;

    const nameMap = {};
    commentProfiles.forEach((profile) => {
      if (!profile?.id) return;
      nameMap[profile.id] = profile.username || "another user";
    });

    setCommentAuthorNamesById((prev) => ({
      ...prev,
      ...nameMap,
    }));
  }

  function handleCommentDraftChange(entryId, value) {
    setCommentDraftByEntryId((prev) => ({
      ...prev,
      [entryId]: value,
    }));
  }

  async function addComment(entryId) {
    const body = (commentDraftByEntryId[entryId] || "").trim();

    if (!body) {
      setCommentStatusByEntryId((prev) => ({
        ...prev,
        [entryId]: "Comment cannot be empty.",
      }));
      return;
    }

    setCommentSavingByEntryId((prev) => ({
      ...prev,
      [entryId]: true,
    }));

    setCommentStatusByEntryId((prev) => ({
      ...prev,
      [entryId]: "",
    }));

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setCommentSavingByEntryId((prev) => ({
        ...prev,
        [entryId]: false,
      }));
      setCommentStatusByEntryId((prev) => ({
        ...prev,
        [entryId]: "You must be logged in to comment.",
      }));
      return;
    }

    const { data: inserted, error: insertErr } = await supabase
      .from("bug_entry_comments")
      .insert([
        {
          entry_id: entryId,
          user_id: user.id,
          body,
        },
      ])
      .select("id, entry_id, user_id, body, created_at")
      .single();

    if (insertErr || !inserted) {
      setCommentSavingByEntryId((prev) => ({
        ...prev,
        [entryId]: false,
      }));
      setCommentStatusByEntryId((prev) => ({
        ...prev,
        [entryId]: `Error: ${insertErr?.message || "Unable to post comment."}`,
      }));
      return;
    }

    setCommentsByEntryId((prev) => ({
      ...prev,
      [entryId]: [...(prev[entryId] || []), inserted],
    }));

    if (!commentAuthorNamesById[user.id]) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.id) {
        setCommentAuthorNamesById((prev) => ({
          ...prev,
          [profile.id]: profile.username || "You",
        }));
      }
    }

    setCommentDraftByEntryId((prev) => ({
      ...prev,
      [entryId]: "",
    }));

    setCommentSavingByEntryId((prev) => ({
      ...prev,
      [entryId]: false,
    }));
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
    if (entry.user_id !== currentUserId) return;

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

    setAllEntries((prev) => prev.map((item) => (item.id === entryId ? data : item)));
    setEditingEntryId(null);
    setInlineFormData(null);
    setInlineStatus("");
    setInlineSaving(false);
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

    const filtered = allEntries.filter((entry) => {
      const searchableText = `
        ${entry.entry_name || ""}
        ${entry.bug_type || ""}
        ${entry.bug_description || ""}
        ${entry.extra_details || ""}
        ${entry.repo_name || ""}
      `.toLowerCase();

      const entrySeverity = entry.severity?.trim() || "";
      const entryBugType = entry.bug_type?.trim() || "";
      const isOwn = entry.user_id === currentUserId;

      const matchesSeverity =
        selectedSeverities.length === 0 || selectedSeverities.includes(entrySeverity);
      const matchesBugType =
        selectedBugTypes.length === 0 || selectedBugTypes.includes(entryBugType);

      // Filter by Users: if nothing selected, show all; if "Mine" selected, show own; if "Others" selected, show others
      let matchesUser = true;
      if (selectedUsers.length > 0) {
        const hasMine = selectedUsers.includes("Mine");
        const hasOthers = selectedUsers.includes("Others");
        matchesUser = (hasMine && isOwn) || (hasOthers && !isOwn);
      }

      return (
        searchableText.includes(normalizedSearch) &&
        matchesSeverity &&
        matchesBugType &&
        matchesUser
      );
    });

    const grouped = {};

    for (const entry of filtered) {
      const repoKey = normalizeRepositoryKey(entry) || "no-repository";
      const repoLabel = getRepositoryLabel(entry);

      if (!grouped[repoKey]) {
        grouped[repoKey] = {
          label: repoLabel,
          entries: [],
        };
      }

      if (grouped[repoKey].label === "No Repository" && repoLabel !== "No Repository") {
        grouped[repoKey].label = repoLabel;
      }

      grouped[repoKey].entries.push(entry);
    }

    for (const repoKey in grouped) {
      grouped[repoKey].entries = sortEntries(grouped[repoKey].entries);
    }

    return grouped;
  }, [allEntries, searchTerm, sortOption, selectedSeverities, selectedBugTypes, selectedUsers, currentUserId]);

  const repoKeys = Object.keys(groupedEntries).sort((a, b) =>
    groupedEntries[a].label.localeCompare(groupedEntries[b].label)
  );

  if (loading) {
    return <div style={styles.page}>Loading shared entries...</div>;
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Shared Entries</h1>
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

            <h4 style={styles.filterSubheading}>Users</h4>
            <div style={styles.checkboxList}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedUsers.includes("Mine")}
                  onChange={() => toggleFilterValue("Mine", setSelectedUsers)}
                />
                Mine
              </label>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedUsers.includes("Others")}
                  onChange={() => toggleFilterValue("Others", setSelectedUsers)}
                />
                Others
              </label>
            </div>

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
        </aside>

        <section style={styles.entriesColumn}>
          <div style={styles.repositoryBlock}>
            <div style={styles.repositoryBlockHeader}>Repositories</div>

            {repoKeys.length === 0 ? (
              <p style={styles.emptyText}>No matching entries found.</p>
            ) : (
              <div style={styles.repositoryList}>
                {repoKeys.map((repoKey) => {
                  const isExpanded = !!expandedRepos[repoKey];
                  const repoGroup = groupedEntries[repoKey];
                  const repoEntries = repoGroup.entries;

                  return (
                    <div key={repoKey} style={styles.repoShell}>
                      <div style={styles.repoHeader}>
                        <div>
                          <h2 style={styles.repoTitle}>{repoGroup.label}</h2>
                          <p style={styles.repoCount}>
                            {repoEntries.length} bug{repoEntries.length !== 1 ? "s" : ""}
                          </p>
                        </div>

                        <button
                          onClick={() => toggleRepo(repoKey)}
                          style={styles.expandButton}
                          type="button"
                        >
                          {isExpanded ? "Hide" : "Show"}
                        </button>
                      </div>

                      {isExpanded && (
                        <div style={styles.entryList}>
                          {repoEntries.map((entry) => {
                            const isEntryExpanded = !!expandedEntries[entry.id];
                            const isEditingEntry = editingEntryId === entry.id;
                            const isOwn = entry.user_id === currentUserId;
                            const entryComments = commentsByEntryId[entry.id] || [];
                            const commentDraft = commentDraftByEntryId[entry.id] || "";
                            const commentSaving = !!commentSavingByEntryId[entry.id];
                            const commentStatus = commentStatusByEntryId[entry.id] || "";

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

                                  <button
                                    onClick={() => toggleEntry(entry.id)}
                                    style={styles.entryToggleButton}
                                    type="button"
                                  >
                                    {isEntryExpanded ? "Hide" : "Show"}
                                  </button>
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
                                        <div style={styles.metaLabel}>Created By</div>
                                        <div style={styles.metaValue}>
                                          {entry.user_id === currentUserId
                                            ? "You"
                                            : creatorNamesById[entry.user_id] || "another user"}
                                        </div>
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
                                      {isOwn ? (
                                        isEditingEntry && inlineFormData ? (
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
                                        )
                                      ) : (
                                        <span style={styles.readOnlyText}>Read only</span>
                                      )}
                                    </div>

                                    <div style={styles.commentSection}>
                                      <div style={styles.commentTitle}>Comments</div>

                                      {entryComments.length === 0 ? (
                                        <p style={styles.commentEmpty}>No comments yet.</p>
                                      ) : (
                                        <div style={styles.commentList}>
                                          {entryComments.map((comment) => {
                                            const authorName = comment.user_id === currentUserId
                                              ? "You"
                                              : commentAuthorNamesById[comment.user_id] || "another user";

                                            return (
                                              <div key={comment.id} style={styles.commentItem}>
                                                <div style={styles.commentHeader}>
                                                  <span style={styles.commentAuthor}>{authorName}</span>
                                                  <span style={styles.commentDate}>
                                                    {formatDateTime(comment.created_at)}
                                                  </span>
                                                </div>
                                                <p style={styles.commentBody}>{comment.body}</p>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}

                                      <div style={styles.commentComposer}>
                                        <textarea
                                          value={commentDraft}
                                          onChange={(e) => handleCommentDraftChange(entry.id, e.target.value)}
                                          placeholder="Add a comment..."
                                          style={styles.commentTextarea}
                                        />
                                        <div style={styles.commentActions}>
                                          <button
                                            type="button"
                                            onClick={() => addComment(entry.id)}
                                            style={styles.manageButton}
                                            disabled={commentSaving}
                                          >
                                            {commentSaving ? "Posting..." : "Post Comment"}
                                          </button>
                                        </div>
                                        {commentStatus && (
                                          <p style={styles.inlineStatus}>{commentStatus}</p>
                                        )}
                                      </div>
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
  readOnlyText: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
    fontWeight: 600,
  },
  inlineStatus: {
    margin: 0,
    color: "#b91c1c",
    fontSize: "13px",
  },
  commentSection: {
    borderTop: "1px solid #e2e8f0",
    paddingTop: "12px",
    display: "grid",
    gap: "10px",
  },
  commentTitle: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#334155",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  commentEmpty: {
    margin: 0,
    fontSize: "13px",
    color: "#64748b",
  },
  commentList: {
    display: "grid",
    gap: "8px",
  },
  commentItem: {
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    padding: "10px",
    display: "grid",
    gap: "6px",
  },
  commentHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  commentAuthor: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#1e293b",
  },
  commentDate: {
    fontSize: "12px",
    color: "#64748b",
  },
  commentBody: {
    margin: 0,
    color: "#1f2937",
    fontSize: "14px",
    lineHeight: 1.45,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  commentComposer: {
    display: "grid",
    gap: "8px",
  },
  commentTextarea: {
    width: "100%",
    minHeight: "90px",
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
  commentActions: {
    display: "flex",
    justifyContent: "flex-end",
  },
};
