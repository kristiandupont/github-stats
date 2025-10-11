/** @jsxImportSource @b9g/crank */

import "./style.css";
import { renderer } from "@b9g/crank/dom";
import type { Context, Component } from "@b9g/crank";
import { RepositoryInput } from "./components/RepositoryInput";
import { WorkflowRunsTable } from "./components/WorkflowRunsTable";
import { BuildTimeChart } from "./components/BuildTimeChart";
import { AuthStatus } from "./components/AuthStatus";
import { LoginDialog } from "./components/LoginDialog";
import { fetchWorkflowRuns, type WorkflowRun } from "./services/github";
import { AuthService } from "./services/auth";

interface AppState {
  isLoading: boolean;
  error: string | null;
  workflowRuns: WorkflowRun[];
  repository: { owner: string; name: string } | null;
  hasToken: boolean;
  viewMode: "table" | "chart";
  isLoginDialogOpen: boolean;
}

// OAuth Callback component
function* AuthCallback(this: Context) {
  const handleCallback = () => {
    const success = AuthService.handleOAuthCallback();
    if (success) {
      // Redirect to home page after successful auth
      window.history.pushState({}, "", "/");
      this.refresh();
    } else {
      // Show error or redirect to home
      window.history.pushState({}, "", "/");
      this.refresh();
    }
  };

  // Handle callback on mount
  handleCallback();

  while (true) {
    yield (
      <div class="flex h-screen items-center justify-center">
        <div class="text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p class="text-gray-600">Processing authentication...</p>
        </div>
      </div>
    );
  }
}

// Routes configuration
const routes: Record<string, Component> = {
  "/": Home,
  "/auth/callback": AuthCallback,
};

function* RoutedApp(this: Context) {
  const onPopState = () => this.refresh();
  window.addEventListener("popstate", onPopState);

  try {
    while (true) {
      const basePath = import.meta.env.BASE_URL;
      const path = window.location.pathname.substring(basePath.length) || "/";
      // Ensure path starts with / for route matching
      const normalizedPath = path.startsWith("/") ? path : "/" + path;
      const Route = routes[normalizedPath];

      if (Route) {
        yield <Route />;
      } else {
        // 404 - redirect to home
        yield (
          <div class="flex h-screen items-center justify-center">
            <div class="text-center">
              <h1 class="text-2xl font-bold text-gray-800 mb-4">
                Page Not Found
              </h1>
              <p class="text-gray-600 mb-4">
                The page you're looking for doesn't exist.
              </p>
              <button
                onclick={() => {
                  window.history.pushState({}, "", "/");
                  this.refresh();
                }}
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Go Home
              </button>
            </div>
          </div>
        );
      }
    }
  } finally {
    window.removeEventListener("popstate", onPopState);
  }
}

function* Home(this: Context) {
  let state: AppState = {
    isLoading: false,
    error: null,
    workflowRuns: [],
    repository: null,
    hasToken: !!localStorage.getItem("github-token"),
    viewMode: "table",
    isLoginDialogOpen: false,
  };

  const handleFetch = async (owner: string, repo: string) => {
    state.isLoading = true;
    state.error = null;
    state.workflowRuns = [];
    state.repository = { owner, name: repo };
    this.refresh();

    try {
      const workflowRuns = await fetchWorkflowRuns(owner, repo, 500);
      console.log("Fetched workflow runs:", workflowRuns);

      state.workflowRuns = workflowRuns;
      state.isLoading = false;
    } catch (error) {
      state.error =
        error instanceof Error ? error.message : "An unknown error occurred";
      state.isLoading = false;
    }
    this.refresh();
  };

  const handleAuthSuccess = () => {
    state.hasToken = !!localStorage.getItem("github-token");
    this.refresh();
  };

  const handleLogout = () => {
    state.hasToken = false;
    this.refresh();
  };

  const handleLoginClick = () => {
    state.isLoginDialogOpen = true;
    this.refresh();
  };

  const handleLoginDialogClose = () => {
    state.isLoginDialogOpen = false;
    this.refresh();
  };

  const handleViewModeChange = (mode: "table" | "chart") => {
    state.viewMode = mode;
    this.refresh();
  };

  while (true) {
    yield (
      <div class="flex flex-col font-extralight">
        <div class="flex h-full w-full items-center justify-center">
          <div class="flex flex-col items-start justify-start py-2 h-full w-full max-w-screen-lg space-y-6">
            <h1 class="text-2xl bg-slate-50 rounded w-full py-3 px-6 text-slate-900 shadow select-none">
              GitHub Stats
            </h1>
            <div class="w-full">
              <AuthStatus
                onLoginClick={handleLoginClick}
                onLogout={handleLogout}
              />
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
                  <p class="text-gray-600 mb-4">
                    Showing {state.workflowRuns.length} recent workflow runs
                  </p>

                  {/* View Mode Toggle */}
                  <div class="flex space-x-2 mb-4">
                    <button
                      class={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        state.viewMode === "table"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                      onclick={() => handleViewModeChange("table")}
                    >
                      Table View
                    </button>
                    <button
                      class={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        state.viewMode === "chart"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                      onclick={() => handleViewModeChange("chart")}
                    >
                      Chart View
                    </button>
                  </div>
                </div>
              )}

              {state.viewMode === "table" ? (
                <WorkflowRunsTable
                  runs={state.workflowRuns}
                  isLoading={state.isLoading}
                />
              ) : (
                <BuildTimeChart
                  runs={state.workflowRuns}
                  isLoading={state.isLoading}
                />
              )}
            </div>
          </div>
        </div>

        <LoginDialog
          isOpen={state.isLoginDialogOpen}
          onClose={handleLoginDialogClose}
          onAuthSuccess={handleAuthSuccess}
        />
        {console.log(
          "Main render - isLoginDialogOpen:",
          state.isLoginDialogOpen
        )}
      </div>
    );
  }
}

(async () => {
  await renderer.render(
    <div>
      <RoutedApp />
    </div>,
    document.body
  );
})();
