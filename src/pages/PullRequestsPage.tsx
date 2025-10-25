/** @jsxImportSource @b9g/crank */

import type { Context } from "@b9g/crank";
import { fetchPullRequests, type PullRequest } from "../services/github";

interface PullRequestsPageProps {
  selectedRepository: { owner: string; name: string } | null;
  onError: (error: string | null) => void;
}

interface PullRequestsPageState {
  pullRequests: PullRequest[];
  isLoading: boolean;
  error: string | null;
  hasLoaded: boolean;
  viewMode: "overview" | "duration" | "throughput" | "distribution";
}

export function* PullRequestsPage(
  this: Context,
  { selectedRepository, onError }: PullRequestsPageProps
) {
  const state: PullRequestsPageState = {
    pullRequests: [],
    isLoading: false,
    error: null,
    hasLoaded: false,
    viewMode: "overview",
  };

  const handleFetch = (owner: string, repo: string) =>
    this.refresh(async () => {
      state.isLoading = true;
      state.error = null;
      state.pullRequests = [];
      this.refresh();
      try {
        const pullRequests = await fetchPullRequests(owner, repo);
        console.log("Fetched pull requests:", pullRequests);
        state.pullRequests = pullRequests;
        state.isLoading = false;
        state.hasLoaded = true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred";
        state.error = errorMessage;
        state.isLoading = false;
        onError(errorMessage);
      }
    });

  const handleViewModeChange = (mode: PullRequestsPageState["viewMode"]) =>
    this.refresh(() => {
      state.viewMode = mode;
    });

  // Auto-fetch when repository changes (lazy loading)
  if (selectedRepository && !state.hasLoaded && !state.isLoading) {
    handleFetch(selectedRepository.owner, selectedRepository.name);
  }

  for ({ selectedRepository } of this) {
    if (!selectedRepository) {
      yield (
        <div class="flex flex-col h-full">
          <div class="flex-1 p-6">
            <div class="max-w-4xl mx-auto">
              <div class="text-center py-12">
                <svg
                  class="w-24 h-24 mx-auto mb-4 text-slate-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M7 0h11a1 1 0 011 1v18a1 1 0 01-1 1H7a1 1 0 01-1-1V1a1 1 0 011-1zM4 4a1 1 0 00-1 1v14a1 1 0 001 1h10v2H4a3 3 0 01-3-3V5a3 3 0 013-3h5v2H4z" />
                </svg>
                <h2 class="text-2xl font-bold text-slate-200 mb-2">
                  No Repository Selected
                </h2>
                <p class="text-slate-300 mb-6">
                  Please select a repository from the Settings page to view pull
                  request analytics.
                </p>
                <button
                  onclick={() =>
                    this.refresh(() => {
                      window.location.hash = "/";
                    })
                  }
                  class="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  Go to Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      );
      continue;
    }

    yield (
      <div class="flex flex-col h-full">
        <div class="flex-1 p-6">
          <div class="max-w-6xl mx-auto">
            <div class="mb-6">
              <h1 class="text-2xl font-bold text-slate-200 mb-2">
                Pull Requests for {selectedRepository.owner}/
                {selectedRepository.name}
              </h1>
              <p class="text-slate-300">
                {state.hasLoaded
                  ? `Showing ${state.pullRequests.length} pull requests from the last 30 days`
                  : "Pull request data will be loaded when you visit this page"}
              </p>
            </div>

            {state.error && (
              <div class="bg-rose-50 border border-rose-200 rounded-md p-4 mb-6">
                <div class="text-rose-800">
                  <strong>Error:</strong> {state.error}
                </div>
              </div>
            )}

            {state.isLoading && (
              <div class="bg-indigo-50 border border-indigo-200 rounded-md p-4 mb-6">
                <div class="flex items-center">
                  <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-3"></div>
                  <div class="text-indigo-800">
                    Loading pull request data...
                  </div>
                </div>
              </div>
            )}

            {/* View Mode Toggle */}
            <div class="mb-6">
              <div class="flex flex-wrap gap-2">
                {[
                  { mode: "overview" as const, label: "Overview", icon: "📊" },
                  { mode: "duration" as const, label: "Duration", icon: "⏱️" },
                  {
                    mode: "throughput" as const,
                    label: "Throughput",
                    icon: "📈",
                  },
                  {
                    mode: "distribution" as const,
                    label: "Distribution",
                    icon: "📋",
                  },
                ].map(({ mode, label, icon }) => (
                  <button
                    key={mode}
                    class={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center ${
                      state.viewMode === mode
                        ? "bg-indigo-600 text-white"
                        : "bg-white/80 text-slate-700 hover:bg-white border border-slate-200"
                    }`}
                    onclick={() => handleViewModeChange(mode)}
                  >
                    <span class="mr-2">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content based on view mode */}
            {state.viewMode === "overview" && (
              <OverviewChart
                prs={state.pullRequests}
                isLoading={state.isLoading}
              />
            )}

            {state.viewMode === "duration" && (
              <DurationChart
                prs={state.pullRequests}
                isLoading={state.isLoading}
              />
            )}

            {state.viewMode === "throughput" && (
              <ThroughputChart
                prs={state.pullRequests}
                isLoading={state.isLoading}
              />
            )}

            {state.viewMode === "distribution" && (
              <DistributionChart
                prs={state.pullRequests}
                isLoading={state.isLoading}
              />
            )}
          </div>
        </div>
      </div>
    );
  }
}

// Placeholder components for PR charts - these will be implemented
function OverviewChart({
  prs,
  isLoading,
}: {
  prs: PullRequest[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div class="flex justify-center items-center py-8">
        <div class="text-lg text-slate-300">Loading overview...</div>
      </div>
    );
  }

  const openPRs = prs.filter((pr) => pr.state === "open");
  const mergedPRs = prs.filter((pr) => pr.merged_at);

  return (
    <div class="space-y-6">
      {/* Summary Cards */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white rounded-lg shadow-md p-6">
          <div class="flex items-center">
            <div class="text-3xl mr-4">📝</div>
            <div>
              <div class="text-2xl font-bold text-slate-200">{prs.length}</div>
              <div class="text-sm text-slate-600">Total PRs (30 days)</div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-md p-6">
          <div class="flex items-center">
            <div class="text-3xl mr-4">🔓</div>
            <div>
              <div class="text-2xl font-bold text-emerald-600">
                {openPRs.length}
              </div>
              <div class="text-sm text-slate-600">Currently Open</div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-md p-6">
          <div class="flex items-center">
            <div class="text-3xl mr-4">✅</div>
            <div>
              <div class="text-2xl font-bold text-indigo-600">
                {mergedPRs.length}
              </div>
              <div class="text-sm text-slate-600">Merged</div>
            </div>
          </div>
        </div>
      </div>

      {/* Open PRs Over Time Chart */}
      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-xl font-semibold text-slate-800 mb-4">
          Open PRs Over Time
        </h3>
        <div class="h-96 flex items-center justify-center text-slate-500">
          <div class="text-center">
            <div class="text-4xl mb-2">📊</div>
            <p>Open PRs over time chart coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DurationChart({
  isLoading,
}: {
  prs: PullRequest[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div class="flex justify-center items-center py-8">
        <div class="text-lg text-gray-600">Loading duration chart...</div>
      </div>
    );
  }

  return (
    <div class="bg-white rounded-lg shadow-md p-6">
      <h3 class="text-xl font-semibold text-gray-800 mb-4">
        Average PR Duration
      </h3>
      <div class="h-96 flex items-center justify-center text-gray-500">
        <div class="text-center">
          <div class="text-4xl mb-2">⏱️</div>
          <p>PR duration chart coming soon...</p>
        </div>
      </div>
    </div>
  );
}

function ThroughputChart({
  isLoading,
}: {
  prs: PullRequest[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div class="flex justify-center items-center py-8">
        <div class="text-lg text-gray-600">Loading throughput chart...</div>
      </div>
    );
  }

  return (
    <div class="bg-white rounded-lg shadow-md p-6">
      <h3 class="text-xl font-semibold text-gray-800 mb-4">PR Throughput</h3>
      <div class="h-96 flex items-center justify-center text-gray-500">
        <div class="text-center">
          <div class="text-4xl mb-2">📈</div>
          <p>PR throughput chart coming soon...</p>
        </div>
      </div>
    </div>
  );
}

function DistributionChart({
  isLoading,
}: {
  prs: PullRequest[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div class="flex justify-center items-center py-8">
        <div class="text-lg text-gray-600">Loading distribution chart...</div>
      </div>
    );
  }

  return (
    <div class="bg-white rounded-lg shadow-md p-6">
      <h3 class="text-xl font-semibold text-gray-800 mb-4">
        PR Duration Distribution
      </h3>
      <div class="h-96 flex items-center justify-center text-gray-500">
        <div class="text-center">
          <div class="text-4xl mb-2">📋</div>
          <p>PR duration distribution chart coming soon...</p>
        </div>
      </div>
    </div>
  );
}
