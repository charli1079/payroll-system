// ==========================================
// GITHUB STORAGE & API CONFIGURATION
// ==========================================
const GITHUB_OWNER = "YOUR_GITHUB_USERNAME"; // Replace with your GitHub username
const GITHUB_REPO = "payroll-system";        // Repository name
const GITHUB_BRANCH = "main";
const FILE_PATH = "storage/members.json";

// Optional: Admin GitHub Fine-Grained Token (Only needed if Admin wants to write directly to GitHub repo)
let GITHUB_TOKEN = localStorage.getItem("github_pat") || "";

// Load Members from GitHub Storage File
async function loadMembersFromGitHub() {
    const rawUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${FILE_PATH}?t=${Date.now()}`;
    
    try {
        const response = await fetch(rawUrl);
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem("members", JSON.stringify(data));
            console.log("Member data loaded successfully from GitHub storage.");
            return data;
        }
    } catch (err) {
        console.warn("Falling back to local cache or default data:", err);
    }
    
    // Fallback to local storage if network request fails
    return JSON.parse(localStorage.getItem("members")) || [];
}

// Save Updated Members Array Back to GitHub Storage File via REST API
async function saveMembersToGitHub(updatedMembersList) {
    if (!GITHUB_TOKEN) {
        // If token isn't provided, save locally in browser storage
        localStorage.setItem("members", JSON.stringify(updatedMembersList));
        alert("Saved locally! To sync automatically with GitHub, configure your GitHub Personal Access Token in Admin Settings.");
        return;
    }

    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;

    try {
        // 1. Get current file SHA hash required by GitHub API
        const getFileRes = await fetch(apiUrl, {
            headers: { "Authorization": `token ${GITHUB_TOKEN}` }
        });
        const fileData = await getFileRes.json();
        const fileSha = fileData.sha;

        // 2. Encode JSON content into Base64
        const jsonContent = JSON.stringify(updatedMembersList, null, 2);
        const encodedContent = btoa(unescape(encodeURIComponent(jsonContent)));

        // 3. Commit updated content to GitHub repository
        const updateRes = await fetch(apiUrl, {
            method: "PUT",
            headers: {
                "Authorization": `token ${GITHUB_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Update storage/members.json via Admin Portal",
                content: encodedContent,
                sha: fileSha,
                branch: GITHUB_BRANCH
            })
        });

        if (updateRes.ok) {
            localStorage.setItem("members", JSON.stringify(updatedMembersList));
            alert("Member data successfully saved and committed to GitHub repo storage!");
        } else {
            const errData = await updateRes.json();
            alert("GitHub Sync Error: " + (errData.message || "Failed to commit changes."));
        }
    } catch (error) {
        console.error("Error saving to GitHub storage:", error);
        alert("Network error while communicating with GitHub API.");
    }
}

// Call on startup
document.addEventListener("DOMContentLoaded", () => {
    loadMembersFromGitHub();
});
