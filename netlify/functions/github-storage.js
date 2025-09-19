// GitHub-based storage helper for persistent app data

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'YCCCVRLab';
const REPO_NAME = 'PicoZen-Server';
const DATA_FILE_PATH = 'public/data/apps.json';

// Helper to read apps from GitHub
async function readAppsFromGitHub() {
  try {
    if (!GITHUB_TOKEN) {
      throw new Error('GitHub token not configured');
    }

    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_FILE_PATH}`, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    const content = Buffer.from(data.content, 'base64').toString('utf8');
    const apps = JSON.parse(content);
    
    return { apps, sha: data.sha };
  } catch (error) {
    console.error('Error reading from GitHub:', error);
    return null;
  }
}

// Helper to write apps to GitHub
async function writeAppsToGitHub(apps, sha, commitMessage) {
  try {
    if (!GITHUB_TOKEN) {
      throw new Error('GitHub token not configured');
    }

    const content = Buffer.from(JSON.stringify(apps, null, 2)).toString('base64');
    
    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_FILE_PATH}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: commitMessage,
        content: content,
        sha: sha,
        branch: 'main'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`GitHub API error: ${response.status} - ${errorData.message}`);
    }

    const result = await response.json();
    return { success: true, sha: result.content.sha };
  } catch (error) {
    console.error('Error writing to GitHub:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  readAppsFromGitHub,
  writeAppsToGitHub
};