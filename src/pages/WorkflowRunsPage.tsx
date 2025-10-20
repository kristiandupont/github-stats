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
    console.log("WorkflowRunsPage render - selectedRepository:", selectedRepository, "workflowRuns.length:", state.workflowRuns.length, "isLoading:", state.isLoading);
    if (
      selectedRepository &&
      state.workflowRuns.length === 0 &&
      !state.isLoading
    ) {
      console.log("Triggering auto-fetch for:", selectedRepository.owner, selectedRepository.name);
      // Schedule the fetch to run after the current render completes
      Promise.resolve().then(() => handleFetch(selectedRepository.owner, selectedRepository.name));
    }
    if (!selectedRepository) {
      yield (
        <div class="flex flex-col h-full">
          <div class="flex-1 p-6">
            <div class="max-w-4xl mx-auto">
              <div class="text-center py-12">
                <div class="text-6xl mb-4">🔄</div>
                <h2 class="text-2xl font-bold text-gray-900 mb-2">
                  No Repository Selected
                </h2>
                <p class="text-gray-600 mb-6">
                  Please select a repository from the Settings page to view
                  workflow run analytics.
                </p>
                <button
                  onclick={() =>
                    this.refresh(() => {
                      window.location.hash = "/";
                    })
                  }
                  class="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <h1 class="text-2xl font-bold text-gray-800 mb-2">
                Workflow Runs for {selectedRepository.owner}/
                {selectedRepository.name}
              </h1>
              <p class="text-gray-600">
                Showing {state.workflowRuns.length} workflow runs from the last
                30 days
              </p>
            </div>

            {state.error && (
              <div class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <div class="text-red-800">
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
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
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
        <div class="text-lg text-gray-600">Loading success rate chart...</div>
      </div>
    );
  }

  return (
    <div class="bg-white rounded-lg shadow-md p-6">
      <h3 class="text-xl font-semibold text-gray-800 mb-4">
        Success Rate Over Time
      </h3>
      <div class="h-96 flex items-center justify-center text-gray-500">
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
        <div class="text-lg text-gray-600">Loading frequency chart...</div>
      </div>
    );
  }

  return (
    <div class="bg-white rounded-lg shadow-md p-6">
      <h3 class="text-xl font-semibold text-gray-800 mb-4">Build Frequency</h3>
      <div class="h-96 flex items-center justify-center text-gray-500">
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
        <div class="text-lg text-gray-600">Loading branches chart...</div>
      </div>
    );
  }

  return (
    <div class="bg-white rounded-lg shadow-md p-6">
      <h3 class="text-xl font-semibold text-gray-800 mb-4">Builds by Branch</h3>
      <div class="h-96 flex items-center justify-center text-gray-500">
        <div class="text-center">
          <div class="text-4xl mb-2">🌿</div>
          <p>Branches chart coming soon...</p>
        </div>
      </div>
    </div>
  );
}
