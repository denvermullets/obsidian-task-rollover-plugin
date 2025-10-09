import { moment } from "obsidian";
import type { DailyNoteRolloverSettings } from "./types";

async function githubApiRequest(url: string, settings: DailyNoteRolloverSettings): Promise<any> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${settings.githubToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) {
    console.error(`GitHub API error: ${response.status} ${response.statusText}`);
    return null;
  }
  return await response.json();
}

function parseRepos(input: string): string[] {
  return input
    .split(",")
    .map((r) => {
      r = r.trim();
      const match = r.match(/github\.com\/([^\/]+\/[^\/]+)/);
      return match ? match[1] : r;
    })
    .filter(Boolean);
}

export async function fetchGitHubPRs(settings: DailyNoteRolloverSettings): Promise<{
  reviewItems: string[];
  openPRItems: string[];
}> {
  if (!settings.enableGithubIntegration || !settings.githubToken || !settings.githubUsername) {
    return { reviewItems: [], openPRItems: [] };
  }

  const reviewItems: string[] = [];
  const openPRItems: string[] = [];
  const repos = parseRepos(settings.githubRepos);
  const sinceIso = moment().subtract(1, "days").toISOString();

  try {
    // Review requests
    const searchQuery = `type:pr state:open review-requested:${settings.githubUsername}`;
    const reviewRequests = await githubApiRequest(
      `https://api.github.com/search/issues?q=${encodeURIComponent(
        searchQuery
      )}&sort=updated&order=desc`,
      settings
    );
    if (reviewRequests?.items) {
      for (const pr of reviewRequests.items) {
        reviewItems.push(`- [ ] Review requested: [${pr.title}](${pr.html_url})`);
      }
    }

    // Your open & merged PRs
    const prItems = await fetchYourOpenAndMergedPRs(repos, sinceIso, settings);
    openPRItems.push(...prItems);

    return { reviewItems, openPRItems };
  } catch (e) {
    console.error("Error fetching GitHub PRs:", e);
    return { reviewItems: [], openPRItems: [] };
  }
}

export async function fetchYourOpenAndMergedPRs(
  repos: string[],
  since: string,
  settings: DailyNoteRolloverSettings
): Promise<string[]> {
  const prItems: string[] = [];

  for (const repo of repos) {
    if (!repo.includes("/")) continue;

    const openPRs = await githubApiRequest(
      `https://api.github.com/repos/${repo}/pulls?state=open&per_page=100`,
      settings
    );

    if (Array.isArray(openPRs)) {
      for (const pr of openPRs) {
        if (pr.user?.login === settings.githubUsername) {
          const hasActivity = new Date(pr.updated_at) >= new Date(since);
          prItems.push(
            hasActivity
              ? `- [ ] 🔥 [${pr.title}](${pr.html_url}) *(activity since yesterday)*`
              : `- [ ] [${pr.title}](${pr.html_url})`
          );
        }
      }
    }

    const closedPRs = await githubApiRequest(
      `https://api.github.com/repos/${repo}/pulls?state=closed&per_page=100&sort=updated&direction=desc`,
      settings
    );

    if (Array.isArray(closedPRs)) {
      for (const pr of closedPRs) {
        if (
          pr.user?.login === settings.githubUsername &&
          pr.merged_at &&
          new Date(pr.merged_at) >= new Date(since)
        ) {
          prItems.push(`- [x] ✅ [${pr.title}](${pr.html_url}) *(merged)*`);
        }
      }
    }
  }

  return prItems;
}
