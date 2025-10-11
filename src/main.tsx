/** @jsxImportSource @b9g/crank */

import "./style.css";
import { renderer } from "@b9g/crank/dom";
import type { Context, Component } from "@b9g/crank";
import { Sidebar } from "./components/Sidebar";
import { HomePage } from "./pages/HomePage";
import { WorkflowRunsPage } from "./pages/WorkflowRunsPage";
import { PullRequestsPage } from "./pages/PullRequestsPage";
import { LoginDialog } from "./components/LoginDialog";
import { AuthService } from "./services/auth";
import { storageService } from "./services/storage";

interface AppState {
  selectedRepository: { owner: string; name: string } | null;
  hasToken: boolean;
  isLoginDialogOpen: boolean;
  error: string | null;
  isLoading: boolean;
}

// OAuth Callback component
function* AuthCallback(this: Context) {
  const handleCallback = () => {
    const success = AuthService.handleOAuthCallback();
    if (success) {
      // Redirect to home page after successful auth
      window.location.hash = "/";
      this.refresh();
    } else {
      // Show error or redirect to home
      window.location.hash = "/";
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
  "/workflow-runs": WorkflowRuns,
  "/pull-requests": PullRequests,
  "/auth/callback": AuthCallback,
};

function* RoutedApp(this: Context) {
  // Initialize IndexedDB
  const initStorage = async () => {
    try {
      await storageService.init();
    } catch (error) {
      console.warn("Failed to initialize IndexedDB:", error);
    }
  };
  initStorage();

  // App-level state
  let isLoginDialogOpen = false;

  // Set up hash change listener
  const handleHashChange = () => {
    this.refresh();
  };
  window.addEventListener("hashchange", handleHashChange);

  const handleNavigate = (path: string) => {
    window.location.hash = path;
  };

  const handleLoginClick = () => {
    isLoginDialogOpen = true;
    this.refresh();
  };

  const handleLogout = () => {
    AuthService.logout();
    this.refresh();
  };

  const handleLoginDialogClose = () => {
    isLoginDialogOpen = false;
    this.refresh();
  };

  const handleAuthSuccess = () => {
    isLoginDialogOpen = false;
    this.refresh();
  };

  // Get current path
  const getCurrentPath = () => {
    const hash = window.location.hash.substring(1) || "/";
    const normalizedPath = hash.startsWith("/") ? hash : "/" + hash;
    return normalizedPath;
  };

  try {
    while (true) {
      // Use hash-based routing for GitHub Pages compatibility
      const normalizedPath = getCurrentPath();
      const Route = routes[normalizedPath];

      if (Route) {
        yield (
          <div class="flex h-screen bg-gray-100">
            <Sidebar
              currentPath={normalizedPath}
              onNavigate={handleNavigate}
              onLoginClick={handleLoginClick}
              onLogout={handleLogout}
            />
            <div class="flex-1 overflow-auto">
              <Route />
            </div>
            <LoginDialog
              isOpen={isLoginDialogOpen}
              onClose={handleLoginDialogClose}
              onAuthSuccess={handleAuthSuccess}
            />
          </div>
        );
      } else {
        // 404 - redirect to home
        yield (
          <div class="flex h-screen bg-gray-100">
            <Sidebar
              currentPath="/"
              onNavigate={handleNavigate}
              onLoginClick={handleLoginClick}
              onLogout={handleLogout}
            />
            <div class="flex-1 overflow-auto flex items-center justify-center">
              <div class="text-center">
                <h1 class="text-2xl font-bold text-gray-800 mb-4">
                  Page Not Found
                </h1>
                <p class="text-gray-600 mb-4">
                  The page you're looking for doesn't exist.
                </p>
                <button
                  onclick={() => {
                    window.location.hash = "/";
                  }}
                  class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Go Home
                </button>
              </div>
            </div>
            <LoginDialog
              isOpen={isLoginDialogOpen}
              onClose={handleLoginDialogClose}
              onAuthSuccess={handleAuthSuccess}
            />
          </div>
        );
      }
    }
  } finally {
    window.removeEventListener("hashchange", handleHashChange);
  }
}

function* Home(this: Context) {
  let state: AppState = {
    selectedRepository: null,
    hasToken: !!localStorage.getItem("github-token"),
    isLoginDialogOpen: false,
    error: null,
    isLoading: false,
  };

  const handleRepositorySelect = (owner: string, repo: string) => {
    state.selectedRepository = { owner, name: repo };
    // Store in localStorage for persistence
    localStorage.setItem(
      "selected-repository",
      JSON.stringify({ owner, name: repo })
    );
    this.refresh();
  };

  const handleLoginDialogClose = () => {
    state.isLoginDialogOpen = false;
    this.refresh();
  };

  // Load saved repository on mount
  const savedRepo = localStorage.getItem("selected-repository");
  if (savedRepo && !state.selectedRepository) {
    try {
      state.selectedRepository = JSON.parse(savedRepo);
    } catch (e) {
      console.warn("Failed to parse saved repository:", e);
    }
  }

  while (true) {
    yield (
      <HomePage
        onRepositorySelect={handleRepositorySelect}
        onLoginDialogClose={handleLoginDialogClose}
        isLoginDialogOpen={state.isLoginDialogOpen}
        isLoading={state.isLoading}
        error={null}
        selectedRepository={state.selectedRepository}
      />
    );
  }
}

function* WorkflowRuns(this: Context) {
  let state: AppState = {
    selectedRepository: null,
    hasToken: !!localStorage.getItem("github-token"),
    isLoginDialogOpen: false,
    error: null,
    isLoading: false,
  };

  // Load saved repository on mount
  const savedRepo = localStorage.getItem("selected-repository");
  if (savedRepo && !state.selectedRepository) {
    try {
      state.selectedRepository = JSON.parse(savedRepo);
    } catch (e) {
      console.warn("Failed to parse saved repository:", e);
    }
  }

  while (true) {
    yield (
      <WorkflowRunsPage
        selectedRepository={state.selectedRepository}
        onError={() => {}}
      />
    );
  }
}

function* PullRequests(this: Context) {
  let state: AppState = {
    selectedRepository: null,
    hasToken: !!localStorage.getItem("github-token"),
    isLoginDialogOpen: false,
    error: null,
    isLoading: false,
  };

  // Load saved repository on mount
  const savedRepo = localStorage.getItem("selected-repository");
  if (savedRepo && !state.selectedRepository) {
    try {
      state.selectedRepository = JSON.parse(savedRepo);
    } catch (e) {
      console.warn("Failed to parse saved repository:", e);
    }
  }

  while (true) {
    yield (
      <PullRequestsPage
        selectedRepository={state.selectedRepository}
        onError={() => {}}
      />
    );
  }
}

(async () => {
  await renderer.render(<RoutedApp />, document.body);
})();
