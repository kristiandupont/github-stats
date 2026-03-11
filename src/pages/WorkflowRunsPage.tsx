/** @jsxImportSource @b9g/crank */

import type { Context } from "@b9g/crank";
import { BuildTimeChart } from "../components/BuildTimeChart/BuildTimeChart";
import { fetchWorkflowRuns, type WorkflowRun } from "../services/github";
import { storageService } from "../services/storage";

interface WorkflowRunsPageProps {
  selectedRepository: { owner: string; name: string } | null;
  onError: (error: string | null) => void;
}

interface WorkflowRunsPageState {
  workflowRuns: WorkflowRun[];
  isLoading: boolean;
  error: string | null;
  fromDate: Date;
}

export function* WorkflowRunsPage(
  this: Context,
  { selectedRepository, onError }: WorkflowRunsPageProps,
) {
  // Default to 30 days ago
  const defaultFromDate = new Date();
  defaultFromDate.setDate(defaultFromDate.getDate() - 30);

  const state: WorkflowRunsPageState = {
    workflowRuns: [],
    isLoading: false,
    error: null,
    fromDate: defaultFromDate,
  };

  // Load all cached runs from IndexedDB and refresh state
  const loadFromCache = async (repository: string) => {
    try {
      const cachedRuns = await storageService.getWorkflowRuns(repository);
      this.refresh(() => {
        state.workflowRuns = cachedRuns;
      });
    } catch (error) {
      console.warn("Failed to load from cache:", error);
    }
  };

  // Initial fetch: load from cache first
  const handleInitialLoad = async (owner: string, repo: string) => {
    const repository = `${owner}/${repo}`;

    try {
      // Load any cached data
      await loadFromCache(repository);

      // If we have no cached data, fetch the default range
      if (state.workflowRuns.length === 0) {
        const now = new Date();
        await handleFetchDateRange(owner, repo, state.fromDate, now);
      }
    } catch (error) {
      console.error("Initial load error:", error);
    }
  };

  // Fetch workflow runs for a date range (with pagination support)
  const handleFetchDateRange = async (
    owner: string,
    repo: string,
    startDate: Date,
    endDate: Date,
  ) => {
    const repository = `${owner}/${repo}`;

    this.refresh(() => {
      state.isLoading = true;
      state.error = null;
    });

    try {
      // First, load any cached data
      await loadFromCache(repository);

      // Fetch the date range (this will handle pagination internally)
      await fetchWorkflowRuns(owner, repo, {
        start: startDate,
        end: endDate,
      });

      // After fetch completes, reload from cache
      await loadFromCache(repository);

      this.refresh(() => {
        state.isLoading = false;
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      onError(errorMessage);
      this.refresh(() => {
        state.error = errorMessage;
        state.isLoading = false;
      });
    }
  };

  for ({ selectedRepository } of this) {
    // Auto-fetch when repository changes
    console.log(
      "WorkflowRunsPage render - selectedRepository:",
      selectedRepository,
      "workflowRuns.length:",
      state.workflowRuns.length,
      "isLoading:",
      state.isLoading,
    );
    if (
      selectedRepository &&
      state.workflowRuns.length === 0 &&
      !state.isLoading
    ) {
      const repo = selectedRepository;
      console.log("Triggering initial load for:", repo.owner, repo.name);
      Promise.resolve().then(() => handleInitialLoad(repo.owner, repo.name));
    }
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
                  <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z M20 12c0-3.042-1.135-5.824-3-7.938l-3 2.647A7.962 7.962 0 0116 12h4zm-9 8c6.627 0 12-5.373 12-12h-4a8 8 0 01-8 8v4z" />
                </svg>
                <h2 class="text-2xl font-bold text-slate-200 mb-2">
                  No Repository Selected
                </h2>
                <p class="text-slate-300 mb-6">
                  Please select a repository from the Settings page to view
                  workflow run analytics.
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

    const repo = selectedRepository;
    yield (
      <div class="flex flex-col h-full">
        <div class="flex-1 p-6">
          <div class="max-w-6xl mx-auto">
            <div class="mb-6">
              <h1 class="text-2xl font-bold text-slate-200 mb-2">
                Build times — {repo.owner}/{repo.name}
              </h1>
              <div class="flex items-center gap-4">
                <p class="text-slate-300">
                  Showing {state.workflowRuns.length} workflow runs
                </p>
                <div class="flex items-center gap-2">
                  <label class="text-sm text-slate-300">From:</label>
                  <input
                    type="date"
                    class="px-3 py-1 bg-slate-800 border border-slate-600 rounded text-slate-200 text-sm"
                    value={state.fromDate.toISOString().split("T")[0]}
                    onchange={(e: Event) => {
                      const target = e.target as HTMLInputElement;
                      const newDate = new Date(target.value);
                      this.refresh(() => {
                        state.fromDate = newDate;
                      });
                    }}
                  />
                  <button
                    class="px-4 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={state.isLoading}
                    onclick={() => {
                      const now = new Date();
                      handleFetchDateRange(
                        repo.owner,
                        repo.name,
                        state.fromDate,
                        now,
                      );
                    }}
                  >
                    {state.isLoading ? "Loading..." : "Fetch Data"}
                  </button>
                </div>
              </div>
            </div>

            {state.error && (
              <div class="bg-rose-500/20 border border-rose-400/30 rounded-md p-4 mb-6">
                <div class="text-rose-200">
                  <strong>Error:</strong> {state.error}
                </div>
              </div>
            )}

            <BuildTimeChart runs={state.workflowRuns} />
          </div>
        </div>
      </div>
    );
  }
}
