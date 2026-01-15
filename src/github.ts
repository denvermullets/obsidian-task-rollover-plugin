import { isCalloutHeader } from "./util";
import { moment } from "obsidian";
import type { DailyNoteRolloverSettings } from "./types";
import { CALLOUT_PREFIX } from "./constants";
import { logger } from "./logger";

export interface PRInfo {
  title: string;
  url: string;
  repo: string;
}

export interface GitHubRecapStats {
  prsOpened: number;
  prsMerged: number;
  prsReviewed: number;
  reviewComments: number;
  issuesOpened: number;
  issuesClosed: number;
  mostActiveRepo: string | null;
  mostActiveRepoCount: number;
  prList: PRInfo[];
}

interface GitHubSearchResponse {
  total_count: number;
  items: Array<{
    html_url: string;
    title: string;
    repository_url?: string;
    user?: { login: string };
    assignees?: Array<{ login: string }>;
  }>;
}

interface GitHubPR {
  html_url: string;
  title: string;
  draft: boolean;
  updated_at: string;
  merged_at: string | null;
  user?: { login: string };
  labels: Array<{ name: string }>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Track last request time to respect rate limits
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 4000; // 4 seconds between requests to avoid secondary rate limits

async function githubApiRequest<T>(
  url: string,
  settings: DailyNoteRolloverSettings,
  retryCount = 0
): Promise<T | null> {
  const MAX_RETRIES = 3;

  // Rate limiting: ensure minimum interval between requests
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS) {
    await sleep(MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest);
  }
  lastRequestTime = Date.now();

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${settings.githubToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  // Handle rate limiting (both primary and secondary)
  if (response.status === 403 || response.status === 429) {
    if (retryCount >= MAX_RETRIES) {
      console.error(`GitHub API rate limit: max retries (${MAX_RETRIES}) exceeded`);
      return null;
    }

    const retryAfter = response.headers.get("Retry-After");
    const rateLimitReset = response.headers.get("X-RateLimit-Reset");

    let waitTime: number;

    if (retryAfter) {
      waitTime = parseInt(retryAfter) * 1000;
    } else if (rateLimitReset) {
      const resetTime = parseInt(rateLimitReset) * 1000;
      waitTime = Math.max(0, resetTime - Date.now()) + 1000;
    } else {
      // Secondary rate limit - exponential backoff starting at 60s
      waitTime = 60000 * Math.pow(2, retryCount);
    }

    logger.info(`Rate limited, waiting ${Math.ceil(waitTime / 1000)} seconds before retry...`);
    await sleep(waitTime);
    return githubApiRequest<T>(url, settings, retryCount + 1);
  }

  if (!response.ok) {
    console.error(`GitHub API error: ${response.status} ${response.statusText}`);
    return null;
  }
  return (await response.json()) as T;
}

function parseRepos(input: string): string[] {
  return input
    .split(",")
    .map((r) => {
      r = r.trim();
      const match = r.match(/github\.com\/([^/]+\/[^/]+)/);
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
    const reviewRequests = await githubApiRequest<GitHubSearchResponse>(
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

    const allOpenPRs = await githubApiRequest<GitHubPR[]>(
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
          const prLabelNames = pr.labels.map((l) => l.name);
          const matchingLabels = prLabelNames.filter((label: string) =>
            trackedLabels.includes(label)
          );

          if (matchingLabels.length > 0) {
            labeledPRs.push(`${labeledCalloutPrefix}- [ ] *${repo}* [${pr.title}](${pr.html_url})`);
          }
        }
      }
    }

    const closedPRs = await githubApiRequest<GitHubPR[]>(
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

function getDateRange(month: number, year: number): { start: string; end: string } {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  const start = startDate.toISOString().split("T")[0];
  const end = endDate.toISOString().split("T")[0];

  return { start, end };
}

function buildRepoFilter(settings: DailyNoteRolloverSettings): string {
  if (settings.githubRecapAllRepos) {
    return "";
  }

  const repos = parseRepos(settings.githubRepos);
  if (repos.length === 0) {
    return "";
  }

  return repos.map((repo) => `repo:${repo}`).join(" ");
}

export async function fetchGitHubRecap(
  settings: DailyNoteRolloverSettings,
  month: number,
  year: number
): Promise<GitHubRecapStats> {
  const stats: GitHubRecapStats = {
    prsOpened: 0,
    prsMerged: 0,
    prsReviewed: 0,
    reviewComments: 0,
    issuesOpened: 0,
    issuesClosed: 0,
    mostActiveRepo: null,
    mostActiveRepoCount: 0,
    prList: [],
  };

  if (!settings.githubToken || !settings.githubUsername) {
    logger.error("GitHub token or username not configured");
    return stats;
  }

  const { start, end } = getDateRange(month, year);
  const dateRange = `${start}..${end}`;
  const repoFilter = buildRepoFilter(settings);
  const repoContributions: Record<string, number> = {};

  const trackRepo = (repoFullName: string) => {
    repoContributions[repoFullName] = (repoContributions[repoFullName] || 0) + 1;
  };

  try {
    // PRs opened by user
    const prsOpenedQuery =
      `type:pr author:${settings.githubUsername} created:${dateRange} ${repoFilter}`.trim();
    const prsOpenedResult = await githubApiRequest<GitHubSearchResponse>(
      `https://api.github.com/search/issues?q=${encodeURIComponent(prsOpenedQuery)}&per_page=100`,
      settings
    );
    if (prsOpenedResult?.items) {
      stats.prsOpened = prsOpenedResult.total_count;
      for (const pr of prsOpenedResult.items) {
        const repoMatch = pr.repository_url?.match(/repos\/(.+)$/);
        const repoName = repoMatch ? repoMatch[1] : "unknown";
        if (repoMatch) trackRepo(repoMatch[1]);
        stats.prList.push({
          title: pr.title,
          url: pr.html_url,
          repo: repoName,
        });
      }
    }

    // PRs merged by user
    const prsMergedQuery =
      `type:pr author:${settings.githubUsername} merged:${dateRange} ${repoFilter}`.trim();
    const prsMergedResult = await githubApiRequest<GitHubSearchResponse>(
      `https://api.github.com/search/issues?q=${encodeURIComponent(prsMergedQuery)}&per_page=100`,
      settings
    );
    if (prsMergedResult?.items) {
      stats.prsMerged = prsMergedResult.total_count;
    }

    // PRs reviewed by user (excluding own PRs)
    const prsReviewedQuery =
      `type:pr reviewed-by:${settings.githubUsername} -author:${settings.githubUsername} created:${dateRange} ${repoFilter}`.trim();
    const prsReviewedResult = await githubApiRequest<GitHubSearchResponse>(
      `https://api.github.com/search/issues?q=${encodeURIComponent(prsReviewedQuery)}&per_page=100`,
      settings
    );
    if (prsReviewedResult?.items) {
      stats.prsReviewed = prsReviewedResult.total_count;
      for (const pr of prsReviewedResult.items) {
        const repoMatch = pr.repository_url?.match(/repos\/(.+)$/);
        if (repoMatch) trackRepo(repoMatch[1]);
      }
    }

    // Review comments by user
    const reviewCommentsQuery =
      `type:pr commenter:${settings.githubUsername} created:${dateRange} ${repoFilter}`.trim();
    const reviewCommentsResult = await githubApiRequest<GitHubSearchResponse>(
      `https://api.github.com/search/issues?q=${encodeURIComponent(
        reviewCommentsQuery
      )}&per_page=100`,
      settings
    );
    if (reviewCommentsResult?.items) {
      stats.reviewComments = reviewCommentsResult.total_count;
    }

    // Issues opened by user
    const issuesOpenedQuery =
      `type:issue author:${settings.githubUsername} created:${dateRange} ${repoFilter}`.trim();
    const issuesOpenedResult = await githubApiRequest<GitHubSearchResponse>(
      `https://api.github.com/search/issues?q=${encodeURIComponent(
        issuesOpenedQuery
      )}&per_page=100`,
      settings
    );
    if (issuesOpenedResult?.items) {
      stats.issuesOpened = issuesOpenedResult.total_count;
      for (const issue of issuesOpenedResult.items) {
        const repoMatch = issue.repository_url?.match(/repos\/(.+)$/);
        if (repoMatch) trackRepo(repoMatch[1]);
      }
    }

    // Issues closed by user (issues where user was the one who closed it)
    const issuesClosedQuery =
      `type:issue closed:${dateRange} involves:${settings.githubUsername} ${repoFilter}`.trim();
    const issuesClosedResult = await githubApiRequest<GitHubSearchResponse>(
      `https://api.github.com/search/issues?q=${encodeURIComponent(
        issuesClosedQuery
      )}&per_page=100`,
      settings
    );
    if (issuesClosedResult?.items) {
      // Filter to issues actually authored or assigned to the user that were closed
      const userClosedIssues = issuesClosedResult.items.filter(
        (issue) =>
          issue.user?.login === settings.githubUsername ||
          issue.assignees?.some((a) => a.login === settings.githubUsername)
      );
      stats.issuesClosed = userClosedIssues.length;
    }

    // Find most active repo
    let maxCount = 0;
    let mostActive: string | null = null;
    for (const [repo, count] of Object.entries(repoContributions)) {
      if (count > maxCount) {
        maxCount = count;
        mostActive = repo;
      }
    }
    stats.mostActiveRepo = mostActive;
    stats.mostActiveRepoCount = maxCount;
  } catch (e) {
    logger.error("Error fetching GitHub recap:", e);
  }

  return stats;
}

export interface GitHubYearlyRecap {
  year: number;
  totals: GitHubRecapStats;
  monthly: Array<{
    month: number;
    stats: GitHubRecapStats;
  }>;
}

export async function fetchGitHubYearlyRecap(
  settings: DailyNoteRolloverSettings,
  year: number
): Promise<GitHubYearlyRecap> {
  const monthly: Array<{ month: number; stats: GitHubRecapStats }> = [];
  const totals: GitHubRecapStats = {
    prsOpened: 0,
    prsMerged: 0,
    prsReviewed: 0,
    reviewComments: 0,
    issuesOpened: 0,
    issuesClosed: 0,
    mostActiveRepo: null,
    mostActiveRepoCount: 0,
    prList: [],
  };

  const repoContributions: Record<string, number> = {};

  for (let month = 0; month < 12; month++) {
    const stats = await fetchGitHubRecap(settings, month, year);
    monthly.push({ month, stats });

    totals.prsOpened += stats.prsOpened;
    totals.prsMerged += stats.prsMerged;
    totals.prsReviewed += stats.prsReviewed;
    totals.reviewComments += stats.reviewComments;
    totals.issuesOpened += stats.issuesOpened;
    totals.issuesClosed += stats.issuesClosed;
    totals.prList.push(...stats.prList);

    if (stats.mostActiveRepo) {
      repoContributions[stats.mostActiveRepo] =
        (repoContributions[stats.mostActiveRepo] || 0) + stats.mostActiveRepoCount;
    }
  }

  // Find overall most active repo
  let maxCount = 0;
  let mostActive: string | null = null;
  for (const [repo, count] of Object.entries(repoContributions)) {
    if (count > maxCount) {
      maxCount = count;
      mostActive = repo;
    }
  }
  totals.mostActiveRepo = mostActive;
  totals.mostActiveRepoCount = maxCount;

  return { year, totals, monthly };
}
