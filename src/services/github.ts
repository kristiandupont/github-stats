import { graphql } from "@octokit/graphql";

// TypeScript interfaces for GitHub API responses
export interface WorkflowRun {
  id: string;
  name: string;
  status: string;
  conclusion: string | null;
  createdAt: string;
  updatedAt: string;
  url: string;
  workflowDatabaseId: number;
  pullRequests: {
    nodes: Array<{
      number: number;
      title: string;
      url: string;
    }>;
  };
}

export interface Workflow {
  id: string;
  name: string;
  path: string;
  runs: {
    nodes: WorkflowRun[];
  };
}

export interface RepositoryData {
  repository: {
    name: string;
    owner: {
      login: string;
    };
    workflows: {
      nodes: Workflow[];
    };
  };
}

// GraphQL query to fetch workflow runs
const WORKFLOW_RUNS_QUERY = `
  query GetWorkflowRuns($owner: String!, $repo: String!, $first: Int!) {
    repository(owner: $owner, name: $repo) {
      name
      owner {
        login
      }
      workflows(first: 10) {
        nodes {
          id
          name
          path
          runs(first: $first, orderBy: {field: CREATED_AT, direction: DESC}) {
            nodes {
              id
              name
              status
              conclusion
              createdAt
              updatedAt
              url
              workflowDatabaseId
              pullRequests(first: 5) {
                nodes {
                  number
                  title
                  url
                }
              }
            }
          }
        }
      }
    }
  }
`;

// Create unauthenticated GraphQL client for public repos
const graphqlClient = graphql.defaults({
  headers: {
    "User-Agent": "github-stats-app",
  },
});

export async function fetchWorkflowRuns(
  owner: string,
  repo: string,
  limit: number = 20
): Promise<RepositoryData> {
  try {
    const response = await graphqlClient<RepositoryData>(WORKFLOW_RUNS_QUERY, {
      owner,
      repo,
      first: limit,
    });

    return response;
  } catch (error) {
    console.error("Error fetching workflow runs:", error);
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
