import { isCalloutHeader } from "./util";
import { moment } from "obsidian";
import type { DailyNoteRolloverSettings } from "./types";
import { CALLOUT_PREFIX } from "./constants";

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
  labeledItems: string[];
}> {
  if (!settings.enableGithubIntegration || !settings.githubToken || !settings.githubUsername) {
    return { reviewItems: [], openPRItems: [], labeledItems: [] };
  }

  const reviewItems: string[] = [];
  const openPRItems: string[] = [];
  const labeledItems: string[] = [];
  const repos = parseRepos(settings.githubRepos);
  const sinceIso = moment().subtract(1, "days").toISOString();

  try {
    // Review requests
    const reviewPRUrls = new Set<string>();
    const searchQuery = `type:pr state:open review-requested:${settings.githubUsername}`;
    const reviewRequests = await githubApiRequest(
      `https://api.github.com/search/issues?q=${encodeURIComponent(
        searchQuery
      )}&sort=updated&order=desc`,
      settings
    );
    if (reviewRequests?.items) {
      const calloutPrefix = isCalloutHeader(settings.githubSectionHeading)
        ? `${CALLOUT_PREFIX} `
        : "";
      for (const pr of reviewRequests.items) {
        reviewItems.push(`${calloutPrefix}- [ ] Review requested: [${pr.title}](${pr.html_url})`);
        reviewPRUrls.add(pr.html_url);
      }
    }

    // Your open & merged PRs, and labeled PRs
    const { openPRs, labeledPRs } = await fetchYourOpenAndMergedPRs(
      repos,
      sinceIso,
      settings,
      reviewPRUrls
    );
    openPRItems.push(...openPRs);
    labeledItems.push(...labeledPRs);

    return { reviewItems, openPRItems, labeledItems };
  } catch (e) {
    console.error("Error fetching GitHub PRs:", e);
    return { reviewItems: [], openPRItems: [], labeledItems: [] };
  }
}

async function fetchYourOpenAndMergedPRs(
  repos: string[],
  since: string,
  settings: DailyNoteRolloverSettings,
  reviewPRUrls: Set<string>
): Promise<{ openPRs: string[]; labeledPRs: string[] }> {
  const openPRs: string[] = [];
  const labeledPRs: string[] = [];

  const trackedLabels = settings.githubTrackedLabels
    ? settings.githubTrackedLabels
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean)
    : [];

  for (const repo of repos) {
    if (!repo.includes("/")) continue;

    const allOpenPRs = await githubApiRequest(
      `https://api.github.com/repos/${repo}/pulls?state=open&per_page=100`,
      settings
    );
    const labeledCalloutPrefix = isCalloutHeader(settings.githubLabeledPRsHeading)
      ? `${CALLOUT_PREFIX} `
      : "";
    const openCalloutPrefix = isCalloutHeader(settings.githubOpenPRsHeading)
      ? `${CALLOUT_PREFIX} `
      : "";

    if (Array.isArray(allOpenPRs)) {
      for (const pr of allOpenPRs) {
        // Your own PRs
        if (pr.user?.login === settings.githubUsername) {
          const hasActivity = new Date(pr.updated_at) >= new Date(since);
          openPRs.push(
            hasActivity
              ? `${openCalloutPrefix}- [ ] 🔥 [${pr.title}](${pr.html_url}) *(activity since yesterday)*`
              : `${openCalloutPrefix}- [ ] [${pr.title}](${pr.html_url})`
          );
        }
        // Labeled PRs (not yours, not assigned to you for review)
        else if (
          trackedLabels.length > 0 &&
          !reviewPRUrls.has(pr.html_url) &&
          !pr.draft &&
          Array.isArray(pr.labels)
        ) {
          const prLabelNames = pr.labels.map((l: any) => l.name);
          const matchingLabels = prLabelNames.filter((label: string) =>
            trackedLabels.includes(label)
          );

          if (matchingLabels.length > 0) {
            labeledPRs.push(`${labeledCalloutPrefix}- [ ] *${repo}* [${pr.title}](${pr.html_url})`);
          }
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
          openPRs.push(`${openCalloutPrefix}- [x] ✅ [${pr.title}](${pr.html_url}) *(merged)*`);
        }
      }
    }
  }

  return { openPRs, labeledPRs };
}
