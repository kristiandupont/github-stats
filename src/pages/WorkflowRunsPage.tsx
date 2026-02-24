/** @jsxImportSource @b9g/crank */

import type { Context } from "@b9g/crank";
import { BuildTimeChart } from "../components/BuildTimeChart";
import { fetchWorkflowRuns, type WorkflowRun } from "../services/github";

interface WorkflowRunsPageProps {
  selectedRepository: { owner: string; name: string } | null;
  onError: (error: string | null) => void;
}

interface WorkflowRunsPageState {
  workflowRuns: WorkflowRun[];
  isLoading: boolean;
  error: string | null;
}

export function* WorkflowRunsPage(
  this: Context,
  { selectedRepository, onError }: WorkflowRunsPageProps
) {
  const state: WorkflowRunsPageState = {
    workflowRuns: [],
    isLoading: false,
    error: null,
  };

  const handleFetch = async (owner: string, repo: string) => {
    this.refresh(() => {
      state.isLoading = true;
      state.error = null;
      state.workflowRuns = [];
    });
    try {
      const workflowRuns = await fetchWorkflowRuns(owner, repo);
      console.log("Fetched workflow runs:", workflowRuns);
      this.refresh(() => {
        state.workflowRuns = workflowRuns;
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
      state.isLoading
    );
    if (
      selectedRepository &&
      state.workflowRuns.length === 0 &&
      !state.isLoading
    ) {
      const repo = selectedRepository;
      console.log("Triggering auto-fetch for:", repo.owner, repo.name);
      Promise.resolve().then(() => handleFetch(repo.owner, repo.name));
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
              <p class="text-slate-300">
                Showing {state.workflowRuns.length} workflow runs from the last
                30 days
              </p>
            </div>

            {state.error && (
              <div class="bg-rose-500/20 border border-rose-400/30 rounded-md p-4 mb-6">
                <div class="text-rose-200">
                  <strong>Error:</strong> {state.error}
                </div>
              </div>
            )}

            <BuildTimeChart
              runs={state.workflowRuns}
              isLoading={state.isLoading}
            />
          </div>
        </div>
      </div>
    );
  }
}
