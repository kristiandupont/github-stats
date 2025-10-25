/** @jsxImportSource @b9g/crank */

import type { Context } from "@b9g/crank";
import { WorkflowRunsTable } from "../components/WorkflowRunsTable";
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
  viewMode: "table" | "chart" | "success-rate" | "frequency" | "branches";
}

export function* WorkflowRunsPage(
  this: Context,
  { selectedRepository, onError }: WorkflowRunsPageProps
) {
  const state: WorkflowRunsPageState = {
    workflowRuns: [],
    isLoading: false,
    error: null,
    viewMode: "table",
  };

  const handleFetch = async (owner: string, repo: string) => {
    state.isLoading = true;
    state.error = null;
    state.workflowRuns = [];
    this.refresh();
    try {
      const workflowRuns = await fetchWorkflowRuns(owner, repo);
      console.log("Fetched workflow runs:", workflowRuns);
      state.workflowRuns = workflowRuns;
      state.isLoading = false;
      this.refresh();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      state.error = errorMessage;
      state.isLoading = false;
      onError(errorMessage);
      this.refresh();
    }
  };

  const handleViewModeChange = (mode: WorkflowRunsPageState["viewMode"]) =>
    this.refresh(() => {
      state.viewMode = mode;
    });

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
      console.log(
        "Triggering auto-fetch for:",
        selectedRepository.owner,
        selectedRepository.name
      );
      // Schedule the fetch to run after the current render completes
      Promise.resolve().then(() =>
        handleFetch(selectedRepository.owner, selectedRepository.name)
      );
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

    yield (
      <div class="flex flex-col h-full">
        <div class="flex-1 p-6">
          <div class="max-w-6xl mx-auto">
            <div class="mb-6">
              <h1 class="text-2xl font-bold text-slate-200 mb-2">
                Workflow Runs for {selectedRepository.owner}/
                {selectedRepository.name}
              </h1>
              <p class="text-slate-300">
                Showing {state.workflowRuns.length} workflow runs from the last
                30 days
              </p>
            </div>

            {state.error && (
              <div class="bg-rose-50 border border-rose-200 rounded-md p-4 mb-6">
                <div class="text-rose-800">
                  <strong>Error:</strong> {state.error}
                </div>
              </div>
            )}

            {/* View Mode Toggle */}
            <div class="mb-6">
              <div class="flex flex-wrap gap-2">
                {[
                  { mode: "table" as const, label: "Table", icon: "📋" },
                  { mode: "chart" as const, label: "Build Times", icon: "📈" },
                  {
                    mode: "success-rate" as const,
                    label: "Success Rate",
                    icon: "✅",
                  },
                  {
                    mode: "frequency" as const,
                    label: "Frequency",
                    icon: "📊",
                  },
                  { mode: "branches" as const, label: "By Branch", icon: "🌿" },
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
            {state.viewMode === "table" && (
              <WorkflowRunsTable
                runs={state.workflowRuns}
                isLoading={state.isLoading}
              />
            )}

            {state.viewMode === "chart" && (
              <BuildTimeChart
                runs={state.workflowRuns}
                isLoading={state.isLoading}
              />
            )}

            {state.viewMode === "success-rate" && (
              <SuccessRateChart
                runs={state.workflowRuns}
                isLoading={state.isLoading}
              />
            )}

            {state.viewMode === "frequency" && (
              <FrequencyChart
                runs={state.workflowRuns}
                isLoading={state.isLoading}
              />
            )}

            {state.viewMode === "branches" && (
              <BranchesChart
                runs={state.workflowRuns}
                isLoading={state.isLoading}
              />
            )}
          </div>
        </div>
      </div>
    );
  }
}

// Placeholder components for new charts - these will be implemented
function SuccessRateChart({
  isLoading,
}: {
  runs: WorkflowRun[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div class="flex justify-center items-center py-8">
        <div class="text-lg text-slate-300">Loading success rate chart...</div>
      </div>
    );
  }

  return (
    <div class="bg-white rounded-lg shadow-md p-6">
      <h3 class="text-xl font-semibold text-slate-200 mb-4">
        Success Rate Over Time
      </h3>
      <div class="h-96 flex items-center justify-center text-slate-300">
        <div class="text-center">
          <div class="text-4xl mb-2">✅</div>
          <p>Success rate chart coming soon...</p>
        </div>
      </div>
    </div>
  );
}

function FrequencyChart({
  isLoading,
}: {
  runs: WorkflowRun[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div class="flex justify-center items-center py-8">
        <div class="text-lg text-slate-300">Loading frequency chart...</div>
      </div>
    );
  }

  return (
    <div class="bg-white rounded-lg shadow-md p-6">
      <h3 class="text-xl font-semibold text-slate-200 mb-4">Build Frequency</h3>
      <div class="h-96 flex items-center justify-center text-slate-300">
        <div class="text-center">
          <div class="text-4xl mb-2">📊</div>
          <p>Frequency chart coming soon...</p>
        </div>
      </div>
    </div>
  );
}

function BranchesChart({
  isLoading,
}: {
  runs: WorkflowRun[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div class="flex justify-center items-center py-8">
        <div class="text-lg text-slate-300">Loading branches chart...</div>
      </div>
    );
  }

  return (
    <div class="bg-white rounded-lg shadow-md p-6">
      <h3 class="text-xl font-semibold text-slate-200 mb-4">
        Builds by Branch
      </h3>
      <div class="h-96 flex items-center justify-center text-gray-500">
        <div class="text-center">
          <div class="text-4xl mb-2">🌿</div>
          <p>Branches chart coming soon...</p>
        </div>
      </div>
    </div>
  );
}
