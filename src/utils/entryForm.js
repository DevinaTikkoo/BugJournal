export const emptyEntryForm = {
  entry_name: "",
  bug_description: "",
  extra_details: "",
  repo_url: "",
  bug_type: "",
  severity: "",
  code_snippet: "",
};

export function toEntryFormData(entry) {
  if (!entry) return { ...emptyEntryForm };

  return {
    entry_name: entry.entry_name || "",
    bug_description: entry.bug_description || entry.bug_details || entry.extra_details || "",
    extra_details: entry.extra_details || "",
    repo_url: entry.repo_url || "",
    bug_type: entry.bug_type || "",
    severity: entry.severity || "",
    code_snippet: entry.code_snippet || "",
  };
}

export function validateEntryForm(formData) {
  if (!formData.entry_name.trim()) {
    return "Please enter an entry name.";
  }

  if (!formData.bug_type.trim()) {
    return "Please select a bug type.";
  }

  if (!formData.severity.trim()) {
    return "Please select a severity.";
  }

  return "";
}

export function extractRepoName(repoUrl) {
  if (!repoUrl) return null;

  try {
    const parsed = new URL(repoUrl.trim());
    const segments = parsed.pathname.split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1] || "";
    const cleanSegment = lastSegment.replace(/\.git$/i, "");
    const normalized = cleanSegment.replace(/-/g, "").trim();
    return normalized || null;
  } catch {
    return null;
  }
}

export function buildEntryPayload(formData) {
  return {
    entry_name: formData.entry_name,
    bug_description: formData.bug_description || null,
    extra_details: formData.extra_details || null,
    bug_type: formData.bug_type,
    severity: formData.severity,
    repo_name: extractRepoName(formData.repo_url),
    repo_url: formData.repo_url || null,
    code_snippet: formData.code_snippet || null,
  };
}
