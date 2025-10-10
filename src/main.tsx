/** @jsxImportSource @b9g/crank */

import "./style.css";
import { renderer } from "@b9g/crank/dom";
import { RepositoryInput } from "./components/RepositoryInput";
import { WorkflowRunsTable } from "./components/WorkflowRunsTable";
import { fetchWorkflowRuns, type WorkflowRun } from "./services/github";

interface AppState {
  isLoading: boolean;
  error: string | null;
  workflowRuns: WorkflowRun[];
  repository: { owner: string; name: string } | null;
}

const Home = () => {
  let state: AppState = {
    isLoading: false,
    error: null,
    workflowRuns: [],
    repository: null,
  };

  const handleFetch = async (owner: string, repo: string) => {
    state.isLoading = true;
    state.error = null;
    state.workflowRuns = [];
    state.repository = { owner, name: repo };

    try {
      const data = await fetchWorkflowRuns(owner, repo, 20);

      // Flatten all workflow runs from all workflows
      const allRuns: WorkflowRun[] = [];
      data.repository.workflows.nodes.forEach((workflow) => {
        allRuns.push(...workflow.runs.nodes);
      });

      // Sort by creation date (newest first)
      allRuns.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      state.workflowRuns = allRuns;
      state.isLoading = false;
    } catch (error) {
      state.error =
        error instanceof Error ? error.message : "An unknown error occurred";
      state.isLoading = false;
    }
  };

  return (
    <div class="flex h-screen flex-col bg-cyan-700">
      <div class="absolute left-0 top-0 flex h-full w-full items-center justify-center overflow-y-auto">
        <div class="flex flex-col items-center justify-start py-12 h-full w-full max-w-screen-lg space-y-6">
          <h1 class="text-6xl bg-orange-400 rounded-xl w-full text-center py-6 text-white shadow-2xl select-none">
            GitHub Stats
          </h1>
          <div class="w-full h-full bg-white rounded-xl shadow-2xl p-6 overflow-y-auto">
            <RepositoryInput
              onFetch={handleFetch}
              isLoading={state.isLoading}
            />

            {state.error && (
              <div class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <div class="text-red-800">
                  <strong>Error:</strong> {state.error}
                </div>
              </div>
            )}

            {state.repository && (
              <div class="mb-6">
                <h2 class="text-2xl font-bold text-gray-800 mb-2">
                  Workflow Runs for {state.repository.owner}/
                  {state.repository.name}
                </h2>
                <p class="text-gray-600">
                  Showing {state.workflowRuns.length} recent workflow runs
                </p>
              </div>
            )}

            <WorkflowRunsTable
              runs={state.workflowRuns}
              isLoading={state.isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

(async () => {
  await renderer.render(
    <div>
      <Home />
    </div>,
    document.body
  );
})();
