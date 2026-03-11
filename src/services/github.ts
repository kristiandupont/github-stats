import { Octokit } from "@octokit/rest";
import { storageService, type DateRange } from "./storage";

// Use the actual GitHub API types for better compatibility
export type WorkflowRun = NonNullable<
  Awaited<
    ReturnType<Octokit["rest"]["actions"]["listWorkflowRunsForRepo"]>
  >["data"]["workflow_runs"][0]
>;

export type PullRequest = NonNullable<
  Awaited<ReturnType<Octokit["rest"]["pulls"]["list"]>>["data"][0]
>;

// Create REST API client - will use token if available, otherwise unauthenticated
const getOctokitClient = () => {
  const token = localStorage.getItem("github-token");

  if (token) {
    return new Octokit({
      auth: token,
      userAgent: "github-stats-app",
    });
  }

  // Fallback to unauthenticated client
  return new Octokit({
    userAgent: "github-stats-app",
  });
};

// Helper function to fetch a single date range (up to 1000 results due to GitHub API limit)
async function fetchSingleDateRange(
  octokit: Octokit,
  owner: string,
  repo: string,
  startDate: Date,
  endDate: Date,
): Promise<WorkflowRun[]> {
  const runs: WorkflowRun[] = [];
  let page = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    console.log(
      `  Fetching page ${page} for date range ${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}...`,
    );

    const response = await octokit.rest.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      per_page: 100, // Maximum per page
      page,
      created: `${startDate.toISOString().split("T")[0]}..${endDate.toISOString().split("T")[0]}`,
    });

    const workflowRuns = response.data.workflow_runs;
    runs.push(...workflowRuns);

    console.log(
      `  Fetched ${workflowRuns.length} runs (page ${page}), total for this range: ${runs.length}`,
    );

    // Check if there are more pages
    hasMorePages = workflowRuns.length === 100;

    if (hasMorePages) {
      page++;
      // Small delay to avoid rate limiting (reduced from 100ms to 50ms)
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // GitHub API limit: can only get 1000 results per query with date filter
    if (runs.length >= 1000) {
      console.log(`  Hit 1000-result limit for this date range`);
      break;
    }
  }

  return runs;
}

// Helper function to fetch date range with automatic chunking if needed
async function fetchDateRangeWithChunking(
  octokit: Octokit,
  owner: string,
  repo: string,
  startDate: Date,
  endDate: Date,
): Promise<WorkflowRun[]> {
  console.log(
    `Fetching date range: ${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`,
  );

  const runs = await fetchSingleDateRange(
    octokit,
    owner,
    repo,
    startDate,
    endDate,
  );

  // If we hit the 1000-result limit, split the date range and fetch each half
  if (runs.length >= 1000) {
    console.log(
      `Hit 1000-result limit! Splitting date range and fetching chunks...`,
    );

    const midDate = new Date((startDate.getTime() + endDate.getTime()) / 2);

    console.log(
      `Chunk 1: ${startDate.toISOString().split("T")[0]} to ${midDate.toISOString().split("T")[0]}`,
    );
    const firstHalf = await fetchDateRangeWithChunking(
      octokit,
      owner,
      repo,
      startDate,
      midDate,
    );

    console.log(
      `Chunk 2: ${new Date(midDate.getTime() + 86400000).toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`,
    );
    const secondHalf = await fetchDateRangeWithChunking(
      octokit,
      owner,
      repo,
      new Date(midDate.getTime() + 86400000), // Next day after midDate
      endDate,
    );

    // Combine and deduplicate by run ID
    const allRuns = [...firstHalf, ...secondHalf];
    const uniqueRuns = Array.from(
      new Map(allRuns.map((run) => [run.id, run])).values(),
    );

    console.log(
      `Combined ${firstHalf.length} + ${secondHalf.length} = ${uniqueRuns.length} unique runs`,
    );
    return uniqueRuns;
  }

  return runs;
}

export async function fetchWorkflowRuns(
  owner: string,
  repo: string,
  dateRange?: DateRange,
  useCache: boolean = true,
): Promise<WorkflowRun[]> {
  const repository = `${owner}/${repo}`;

  // Check cache first if enabled
  if (useCache) {
    try {
      const cachedRuns = await storageService.getWorkflowRuns(
        repository,
        dateRange,
      );
      if (cachedRuns.length > 0) {
        console.log(
          `Found ${cachedRuns.length} cached workflow runs for ${repository}`,
        );

        // If we have cached data and no specific date range requested, return cached data
        if (!dateRange) {
          return cachedRuns;
        }

        // If we have a date range, check if we need to fetch more data
        const cachedRange =
          await storageService.getWorkflowRunsDateRange(repository);
        if (cachedRange.oldest && cachedRange.newest) {
          const needsOlderData = dateRange.start < cachedRange.oldest;
          const needsNewerData = dateRange.end > cachedRange.newest;

          // If we have all the data we need, return cached
          if (!needsOlderData && !needsNewerData) {
            return cachedRuns;
          }
        }
      }
    } catch (error) {
      console.warn("Failed to read from cache:", error);
    }
  }

  try {
    const octokit = getOctokitClient();

    // Default to last 30 days if no date range specified
    const endDate = dateRange?.end || new Date();
    const startDate =
      dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    console.log(
      `Fetching workflow runs for ${repository} from ${startDate.toISOString()} to ${endDate.toISOString()}`,
    );

    const allWorkflowRuns = await fetchDateRangeWithChunking(
      octokit,
      owner,
      repo,
      startDate,
      endDate,
    );

    console.log(
      `Finished fetching: ${allWorkflowRuns.length} total workflow runs`,
    );

    // Cache the results
    if (useCache && allWorkflowRuns.length > 0) {
      try {
        await storageService.saveWorkflowRuns(allWorkflowRuns, repository);
        console.log(
          `Cached ${allWorkflowRuns.length} workflow runs for ${repository}`,
        );
      } catch (error) {
        console.warn("Failed to cache workflow runs:", error);
      }
    }

    return allWorkflowRuns;
  } catch (error) {
    console.error("Error fetching workflow runs:", error);

    // Check if it's a rate limiting error
    if (error instanceof Error && error.message.includes("rate limit")) {
      throw new Error(
        `Rate limit exceeded. Please add a GitHub Personal Access Token to increase your rate limit from 60 to 5,000 requests per hour.`,
      );
    }

    throw new Error(
      `Failed to fetch workflow runs for ${owner}/${repo}. Make sure the repository exists and is public.`,
    );
  }
}

export async function fetchPullRequests(
  owner: string,
  repo: string,
  dateRange?: DateRange,
  useCache: boolean = true,
): Promise<PullRequest[]> {
  const repository = `${owner}/${repo}`;

  // Check cache first if enabled
  if (useCache) {
    try {
      const cachedPRs = await storageService.getPullRequests(
        repository,
        dateRange,
      );
      if (cachedPRs.length > 0) {
        console.log(
          `Found ${cachedPRs.length} cached pull requests for ${repository}`,
        );

        // If we have cached data and no specific date range requested, return cached data
        if (!dateRange) {
          return cachedPRs;
        }

        // If we have a date range, check if we need to fetch more data
        const cachedRange =
          await storageService.getPullRequestsDateRange(repository);
        if (cachedRange.oldest && cachedRange.newest) {
          const needsOlderData = dateRange.start < cachedRange.oldest;
          const needsNewerData = dateRange.end > cachedRange.newest;

          // If we have all the data we need, return cached
          if (!needsOlderData && !needsNewerData) {
            return cachedPRs;
          }
        }
      }
    } catch (error) {
      console.warn("Failed to read from cache:", error);
    }
  }

  try {
    const octokit = getOctokitClient();

    // Default to last 30 days if no date range specified
    const endDate = dateRange?.end || new Date();
    const startDate =
      dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    console.log(
      `Fetching pull requests for ${repository} from ${startDate.toISOString()} to ${endDate.toISOString()}`,
    );

    const response = await octokit.rest.pulls.list({
      owner,
      repo,
      state: "all", // Get both open and closed PRs
      per_page: 100, // Maximum per page
      sort: "created",
      direction: "desc",
    });

    // Filter by date range since GitHub API doesn't support date filtering for PRs
    let pullRequests = response.data;

    if (dateRange) {
      pullRequests = pullRequests.filter((pr) => {
        const createdAt = new Date(pr.created_at);
        return createdAt >= startDate && createdAt <= endDate;
      });
    }

    // Cache the results
    if (useCache && pullRequests.length > 0) {
      try {
        await storageService.savePullRequests(pullRequests, repository);
        console.log(
          `Cached ${pullRequests.length} pull requests for ${repository}`,
        );
      } catch (error) {
        console.warn("Failed to cache pull requests:", error);
      }
    }

    return pullRequests;
  } catch (error) {
    console.error("Error fetching pull requests:", error);

    // Check if it's a rate limiting error
    if (error instanceof Error && error.message.includes("rate limit")) {
      throw new Error(
        `Rate limit exceeded. Please add a GitHub Personal Access Token to increase your rate limit from 60 to 5,000 requests per hour.`,
      );
    }

    throw new Error(
      `Failed to fetch pull requests for ${owner}/${repo}. Make sure the repository exists and is public.`,
    );
  }
}

// Helper function to calculate duration in minutes
export function calculateDuration(
  createdAt: string,
  updatedAt: string,
): number {
  const start = new Date(createdAt);
  const end = new Date(updatedAt);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
}

// Helper function to format duration for display
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}
