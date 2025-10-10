import { Octokit } from "@octokit/rest";

// TypeScript interfaces for GitHub API responses
export interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  workflow_id: number;
  workflow_url: string;
  pull_requests: Array<{
    number: number;
    url: string;
    html_url?: string;
    title?: string;
  }>;
  head_branch: string;
  run_number: number;
  display_title?: string;
}

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

export async function fetchWorkflowRuns(
  owner: string,
  repo: string,
  limit: number = 20
): Promise<WorkflowRun[]> {
  try {
    const octokit = getOctokitClient();
    const response = await octokit.rest.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      per_page: limit,
    });

    return response.data.workflow_runs;
  } catch (error) {
    console.error("Error fetching workflow runs:", error);

    // Check if it's a rate limiting error
    if (error instanceof Error && error.message.includes("rate limit")) {
      throw new Error(
        `Rate limit exceeded. Please add a GitHub Personal Access Token to increase your rate limit from 60 to 5,000 requests per hour.`
      );
    }

    throw new Error(
      `Failed to fetch workflow runs for ${owner}/${repo}. Make sure the repository exists and is public.`
    );
  }
}

// Helper function to calculate duration in minutes
export function calculateDuration(
  createdAt: string,
  updatedAt: string
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
