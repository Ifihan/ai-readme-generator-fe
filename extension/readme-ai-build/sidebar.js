// README AI Side Panel Script

const sharedConstants =
  typeof window.ReadmeConstants === "object" && window.ReadmeConstants
    ? window.ReadmeConstants
    : {
        ui: { defaultCommitMessage: "docs: add generated README" },
        messages: {
          toBackground: {
            getPendingRepo: "GET_PENDING_REPO",
            fetchReadmeTemplates: "FETCH_README_TEMPLATES",
            generateReadme: "GENERATE_README",
            saveReadme: "SAVE_README",
            fetchBranches: "FETCH_BRANCHES",
            createBranch: "CREATE_BRANCH",
          },
        },
      };

const DEFAULT_COMMIT_MESSAGE =
  sharedConstants.ui?.defaultCommitMessage || "docs: add generated README";

const backgroundMessageTypes = sharedConstants.messages?.toBackground || {
  getPendingRepo: "GET_PENDING_REPO",
  fetchReadmeTemplates: "FETCH_README_TEMPLATES",
  generateReadme: "GENERATE_README",
  saveReadme: "SAVE_README",
  fetchBranches: "FETCH_BRANCHES",
  createBranch: "CREATE_BRANCH",
};

const {
  getPendingRepo: MESSAGE_GET_PENDING_REPO,
  fetchReadmeTemplates: MESSAGE_FETCH_README_TEMPLATES,
  generateReadme: MESSAGE_GENERATE_README,
  saveReadme: MESSAGE_SAVE_README,
  fetchBranches: MESSAGE_FETCH_BRANCHES,
  createBranch: MESSAGE_CREATE_BRANCH,
} = backgroundMessageTypes;

function toggleHidden(element, shouldHide) {
  if (!element) return;
  element.classList.toggle("hidden", Boolean(shouldHide));
}

// ---- Simple background messaging helper (no ports) ----
function sendBackgroundMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      if (!response || response.ok !== true) {
        return reject(
          new Error((response && response.error) || "Background request failed")
        );
      }
      resolve(response.data);
    });
  });
}

// ---- State ----
let currentRepo = null;
let sections = [];
let selectedSectionIds = new Set();
let includeBadges = true;
let badgeStyle = "flat";
let generatedReadme = "";
let editableReadme = "";
let entryId = null;
let sectionsGenerated = [];
let isGenerating = false;
let isSaving = false;
let branches = [];
let branchesLoaded = false;
let branchLoading = false;
let selectedBranchName = null;
let commitMessage = DEFAULT_COMMIT_MESSAGE;

// ---- Elements ----
let repoNameEl,
  statusEl,
  sectionsContainerEl,
  sectionsBlockEl,
  includeBadgesEl,
  badgeStyleEl,
  generateButtonEl,
  resultSectionEl,
  sectionsSummaryEl,
  editorEl,
  copyButtonEl,
  downloadButtonEl,
  saveButtonEl,
  editSectionsButtonEl,
  commitInputEl,
  branchStatusEl,
  branchSelectEl,
  branchCreateInputEl,
  branchCreateButtonEl,
  commitBlockEl,
  branchBlockEl,
  successSectionEl,
  commitSuccessDetailsEl,
  refreshPageButtonEl,
  startOverButtonEl,
  errorSectionEl;

// ---- Init ----
document.addEventListener("DOMContentLoaded", async () => {
  // Grab elements first
  repoNameEl = document.getElementById("repo-name");
  statusEl = document.getElementById("status-message");
  sectionsContainerEl = document.getElementById("sections-container");
  sectionsBlockEl = document.getElementById("sections-block");
  includeBadgesEl = document.getElementById("include-badges");
  badgeStyleEl = document.getElementById("badge-style");
  generateButtonEl = document.getElementById("generate-button");
  resultSectionEl = document.getElementById("result-section");
  sectionsSummaryEl = document.getElementById("sections-summary");
  editorEl = document.getElementById("editor");
  copyButtonEl = document.getElementById("copy-button");
  downloadButtonEl = document.getElementById("download-button");
  saveButtonEl = document.getElementById("save-button");
  editSectionsButtonEl = document.getElementById("edit-sections-button");
  commitInputEl = document.getElementById("commit-input");
  branchStatusEl = document.getElementById("branch-status");
  branchSelectEl = document.getElementById("branch-select");
  branchCreateInputEl = document.getElementById("branch-create-input");
  branchCreateButtonEl = document.getElementById("branch-create-button");
  commitBlockEl = document.getElementById("commit-block");
  branchBlockEl = document.getElementById("branch-block");
  successSectionEl = document.getElementById("success-section");
  commitSuccessDetailsEl = document.getElementById("commit-success-details");
  refreshPageButtonEl = document.getElementById("refresh-page-button");
  startOverButtonEl = document.getElementById("start-over-button");
  errorSectionEl = document.getElementById("error-section");

  try {
    // --- THIS IS THE NEW HANDSHAKE ---
    // 1. Ask the background script for the repo it's holding.
    const data = await sendBackgroundMessage({
      type: MESSAGE_GET_PENDING_REPO,
    });

    if (data && data.repo) {
      currentRepo = data.repo;
      // 2. Now that we have the repo, initialize the panel
      initializePanel();
    } else {
      // Show error view instead of generic error
      showErrorView();
    }
  } catch (e) {
    // Show error view for any repository loading issues
    showErrorView();
  }
});

function initializePanel() {
  // Seed repo name
  if (currentRepo) {
    repoNameEl.textContent =
      currentRepo.full_name || currentRepo.name || currentRepo.html_url;
  }

  // Attach events
  includeBadgesEl.addEventListener("change", () => {
    includeBadges = includeBadgesEl.checked;
  });
  badgeStyleEl.addEventListener("change", () => {
    badgeStyle = badgeStyleEl.value;
  });
  generateButtonEl.addEventListener("click", handleGenerateClick);
  copyButtonEl.addEventListener("click", handleCopyClick);
  downloadButtonEl.addEventListener("click", handleDownloadClick);
  saveButtonEl.addEventListener("click", handleSaveClick);
  editSectionsButtonEl.addEventListener("click", handleEditSectionsClick);
  if (editorEl) {
    // Keep in-memory content in sync with user edits
    editorEl.addEventListener("input", () => {
      editableReadme = editorEl.value || "";
    });
  }
  commitInputEl.addEventListener("input", () => {
    commitMessage = commitInputEl.value || DEFAULT_COMMIT_MESSAGE;
  });
  branchCreateButtonEl.addEventListener("click", async () => {
    const name = (branchCreateInputEl.value || "").trim();
    if (name) {
      await handleCreateBranch(name);
    }
  });
  refreshPageButtonEl.addEventListener("click", handleRefreshPageClick);
  startOverButtonEl.addEventListener("click", handleStartOverClick);

  if (commitInputEl && !commitInputEl.value) {
    commitInputEl.value = DEFAULT_COMMIT_MESSAGE;
  }

  // Load initial data
  fetchTemplates();
}

// ---- UI helpers ----
function setStatus(message, variant = "info") {
  if (!statusEl) return;
  statusEl.textContent = message || "";
  statusEl.style.color =
    variant === "error"
      ? "#f85149"
      : variant === "success"
      ? "#2ea043"
      : "var(--muted)";
}

function updateResultView() {
  if (!resultSectionEl || !editorEl || !sectionsSummaryEl) return;
  const hasContent = !!editableReadme;
  resultSectionEl.classList.toggle("hidden", !hasContent);

  // Update sections summary with better formatting
  if (sectionsGenerated.length > 0) {
    sectionsSummaryEl.textContent = `Generated ${
      sectionsGenerated.length
    } sections: ${sectionsGenerated.join(", ")}`;
  } else if (hasContent) {
    sectionsSummaryEl.textContent = "README successfully generated";
  } else {
    sectionsSummaryEl.textContent = "";
  }

  editorEl.value = editableReadme;
}

function renderSections(placeholder) {
  if (!sectionsContainerEl) return;
  sectionsContainerEl.innerHTML = "";

  if (!sections.length) {
    const p = document.createElement("p");
    p.className = "small";
    p.textContent = placeholder || "No templates available.";
    sectionsContainerEl.appendChild(p);
    return;
  }

  for (const s of sections) {
    const item = document.createElement("div");
    item.className = "section-item";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = s.is_default === true || selectedSectionIds.has(String(s.id));
    cb.addEventListener("change", () =>
      toggleSection(String(s.id), cb.checked)
    );

    const label = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = s.name;
    const desc = document.createElement("p");
    desc.textContent = s.description || "";
    label.appendChild(title);
    label.appendChild(desc);

    item.appendChild(cb);
    item.appendChild(label);
    sectionsContainerEl.appendChild(item);

    if (cb.checked) selectedSectionIds.add(String(s.id));
  }
}

function toggleSection(sectionId, checked) {
  if (checked) selectedSectionIds.add(sectionId);
  else selectedSectionIds.delete(sectionId);
}

// ---- Actions ----
async function fetchTemplates() {
  try {
    setStatus("Loading templates…");
    const data = await sendBackgroundMessage({
      type: MESSAGE_FETCH_README_TEMPLATES,
    });
    sections = (data && data.templates) || [];
    renderSections("Select sections to include");
    setStatus("Templates loaded.", "success");
  } catch (e) {
    setStatus(e.message || "Failed to load templates", "error");
  }
}

async function handleGenerateClick() {
  if (!currentRepo) return;
  if (isGenerating) return;
  isGenerating = true;
  generateButtonEl.disabled = true;
  setStatus("Generating README…");

  try {
    const chosen = sections.filter((s) => selectedSectionIds.has(String(s.id)));
    const payload = {
      repository_url: currentRepo.html_url,
      sections: chosen.map((s, index) => ({
        name: s.name,
        description: s.description || "",
        required: s.is_default === true,
        order: index,
      })),
      include_badges: includeBadges,
      badge_style: badgeStyle,
    };

    const result = await sendBackgroundMessage({
      type: MESSAGE_GENERATE_README,
      payload,
    });
    generatedReadme = (result && result.content) || "";
    sectionsGenerated = (result && result.sections_generated) || [];
    entryId = (result && result.entry_id) || null;
    editableReadme = generatedReadme;

    toggleHidden(sectionsBlockEl, true);

    updateResultView();
    toggleHidden(commitBlockEl, false);
    toggleHidden(branchBlockEl, false);
    setStatus("Generated.", "success");

    // Preload branches on first generate
    if (!branchesLoaded) {
      await ensureBranches();
    }
  } catch (e) {
    setStatus(e.message || "Failed to generate README", "error");
  } finally {
    isGenerating = false;
    generateButtonEl.disabled = false;
  }
}

function handleDownloadClick() {
  if (!editableReadme) return;
  const blob = new Blob([editableReadme], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "README.md";
  a.click();
  URL.revokeObjectURL(url);
}

async function handleCopyClick() {
  try {
    await navigator.clipboard.writeText(editableReadme || "");
    setStatus("Copied to clipboard.", "success");
  } catch {
    setStatus("Failed to copy.", "error");
  }
}

function handleEditSectionsClick() {
  // Show the sections block again and hide commit/branch blocks
  toggleHidden(sectionsBlockEl, false);
  toggleHidden(commitBlockEl, true);
  toggleHidden(branchBlockEl, true);
  // Keep the result section visible so users can see their previous generation
  setStatus("Edit your section selection and regenerate if needed.", "info");
}

async function handleSaveClick() {
  if (!currentRepo || isSaving) return;
  const branch =
    selectedBranchName || branches.find((b) => b.is_default)?.name || "main";
  // Always capture the latest editor content at save time
  const currentContent =
    editorEl && typeof editorEl.value === "string"
      ? editorEl.value
      : editableReadme || "";
  const payload = {
    repository_url: currentRepo.html_url,
    content: currentContent,
    path: "README.md",
    commit_message: commitMessage || DEFAULT_COMMIT_MESSAGE,
    branch,
  };

  try {
    isSaving = true;
    saveButtonEl.disabled = true;
    setStatus("Saving to repository…");
    await sendBackgroundMessage({ type: MESSAGE_SAVE_README, payload });

    // Show success section instead of just status
    showSuccessSection(branch, commitMessage);
  } catch (e) {
    setStatus(e.message || "Failed to save", "error");
  } finally {
    isSaving = false;
    saveButtonEl.disabled = false;
  }
}

async function ensureBranches(forceReload = false) {
  if (!currentRepo) return;
  if (branchesLoaded && !forceReload) return;
  try {
    branchLoading = true;
    branchStatusEl.textContent = "Loading branches…";
    const data = await sendBackgroundMessage({
      type: MESSAGE_FETCH_BRANCHES,
      payload: { repository_url: currentRepo.html_url },
    });
    branches = (data && data.branches) || [];
    branchesLoaded = true;
    renderBranches();
    branchStatusEl.textContent = `Found ${branches.length} branches.`;
  } catch (e) {
    branchStatusEl.textContent = e.message || "Failed to load branches";
  } finally {
    branchLoading = false;
  }
}

function renderBranches() {
  if (!branchSelectEl) return;
  branchSelectEl.innerHTML = "";
  for (const b of branches) {
    const opt = document.createElement("option");
    opt.value = b.name;
    opt.textContent = b.name + (b.is_default ? " (default)" : "");
    branchSelectEl.appendChild(opt);
  }
  branchSelectEl.onchange = () => {
    selectedBranchName = branchSelectEl.value || null;
  };
  selectedBranchName = branchSelectEl.value || null;
}

async function handleCreateBranch(name) {
  if (!currentRepo) return;
  try {
    branchStatusEl.textContent = `Creating branch \"${name}\"…`;
    await sendBackgroundMessage({
      type: MESSAGE_CREATE_BRANCH,
      payload: { repository_url: currentRepo.html_url, branch_name: name },
    });
    branchCreateInputEl.value = "";
    await ensureBranches(true); // Force reload

    // After reload, select the new branch
    branchSelectEl.value = name;
    selectedBranchName = name;

    branchStatusEl.textContent = `Created branch \"${name}\".`;
  } catch (e) {
    branchStatusEl.textContent = e.message || "Failed to create branch";
  }
}

function showSuccessSection(branch, commitMessage) {
  // Hide all other sections
  toggleHidden(sectionsBlockEl, true);
  toggleHidden(resultSectionEl, true);
  toggleHidden(commitBlockEl, true);
  toggleHidden(branchBlockEl, true);

  // Update success details
  if (commitSuccessDetailsEl) {
    commitSuccessDetailsEl.textContent = `Committed "${commitMessage}" to branch "${branch}"`;
  }

  // Show success section
  toggleHidden(successSectionEl, false);

  // Clear any status messages
  setStatus("", "success");
}

function showErrorView() {
  // Hide all other sections
  toggleHidden(sectionsBlockEl, true);
  toggleHidden(resultSectionEl, true);
  toggleHidden(commitBlockEl, true);
  toggleHidden(branchBlockEl, true);
  toggleHidden(successSectionEl, true);

  // Update header to show error state
  if (repoNameEl) {
    repoNameEl.textContent = "No Repository Selected";
  }

  // Hide status message
  toggleHidden(statusEl, true);

  // Show error section
  toggleHidden(errorSectionEl, false);
}

function handleRefreshPageClick() {
  // Refresh the current repository page
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.reload(tabs[0].id);
    }
  });
}

function handleStartOverClick() {
  // Reset the entire interface to start fresh
  toggleHidden(successSectionEl, true);
  toggleHidden(sectionsBlockEl, false);
  toggleHidden(resultSectionEl, true);
  toggleHidden(commitBlockEl, true);
  toggleHidden(branchBlockEl, true);

  // Reset form values
  if (editorEl) editorEl.value = "";
  if (commitInputEl) commitInputEl.value = DEFAULT_COMMIT_MESSAGE;

  // Reset variables
  editableReadme = "";
  generatedReadme = "";
  sectionsGenerated = [];
  commitMessage = DEFAULT_COMMIT_MESSAGE;

  setStatus("Ready to generate a new README", "info");
}
