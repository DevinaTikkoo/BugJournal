import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BUG_TYPE_OPTIONS } from "../constants/bugTypes";
import { supabase } from "../supabaseClient";

export default function Entries() {
  const navigate = useNavigate();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRepos, setExpandedRepos] = useState({});
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
      <h1 style={styles.title}>All Entries</h1>
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
        </aside>

        <section style={styles.entriesColumn}>
          {repoNames.length === 0 ? (
            <p>No matching entries found.</p>
          ) : (
            repoNames.map((repoName) => {
              const isExpanded = !!expandedRepos[repoName];
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
                    >
                      {isExpanded ? "Hide" : "Show"}
                    </button>
                  </div>

                  {isExpanded && (
                    <div style={styles.entryList}>
                      {repoEntries.map((entry) => (
                        <div
                          key={entry.id}
                          style={styles.entryCard}
                          onClick={() => navigate(`/entry/${entry.id}`)}
                        >
                          <div style={styles.entryTopRow}>
                            <h3 style={styles.entryName}>
                              {entry.entry_name || "Untitled Entry"}
                            </h3>
                            <span style={styles.entrySeverity}>
                              {entry.severity || "No Severity"}
                            </span>
                          </div>

                          <p style={styles.entryType}>
                            {entry.bug_type || "No Bug Type"}
                          </p>

                          <p style={styles.entryDescription}>
                            {entry.bug_description || "No description provided."}
                          </p>

                          <p style={styles.entryDate}>
                            Created:{" "}
                            {entry.created_at
                              ? new Date(entry.created_at).toLocaleDateString()
                              : "Unknown"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
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
  searchInput: {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },
  repoShell: {
    border: "1px solid #ddd",
    borderRadius: "12px",
    marginBottom: "18px",
    overflow: "hidden",
    backgroundColor: "#fff",
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
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  entryCard: {
    border: "1px solid #e3e3e3",
    borderRadius: "10px",
    padding: "14px",
    cursor: "pointer",
    transition: "0.2s",
  },
  entryTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },
  entryName: {
    margin: 0,
  },
  entrySeverity: {
    fontSize: "13px",
    color: "#555",
    whiteSpace: "nowrap",
  },
  entryType: {
    margin: "8px 0 6px 0",
    fontWeight: "500",
  },
  entryDescription: {
    margin: "0 0 8px 0",
    color: "#444",
  },
  entryDate: {
    margin: 0,
    fontSize: "13px",
    color: "#777",
  },
};