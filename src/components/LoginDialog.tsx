/** @jsxImportSource @b9g/crank */

import type { Context } from "@b9g/crank";
import { AuthService } from "../services/auth";

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
}

interface DialogState {
  patState: {
    token: string;
    error: string | null;
  };
}

export function* LoginDialog(
  this: Context,
  { isOpen, onClose, onAuthSuccess }: LoginDialogProps
) {
  let state: DialogState = {
    patState: {
      token: "",
      error: null,
    },
  };

  const handleOAuthStart = () => {
    // Start OAuth flow - this will redirect to GitHub
    AuthService.initiateOAuthFlow();
  };

  const handlePatSubmit = async (event: Event) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const token = formData.get("token") as string;

    if (!token || !token.trim()) {
      state.patState.error = "Please enter a token";
      this.refresh();
      return;
    }

    try {
      state.patState.error = null;
      this.refresh();

      // Validate token
      const isValid = await AuthService.validateToken(token.trim());
      if (!isValid) {
        state.patState.error =
          "Invalid token. Please check your token and try again.";
        this.refresh();
        return;
      }

      // Store token
      AuthService.setToken(token.trim(), "pat");
      // Clear OAuth success flag since we now have a PAT
      sessionStorage.removeItem("oauth-success");
      onAuthSuccess();
      onClose();
    } catch (error) {
      state.patState.error =
        error instanceof Error ? error.message : "Failed to validate token";
      this.refresh();
    }
  };

  const handlePatInput = (event: Event) => {
    const input = event.target as HTMLInputElement;
    state.patState.token = input.value;
    state.patState.error = null;
    this.refresh();
  };

  const handleBackdropClick = (event: Event) => {
    if (event.target === event.currentTarget) {
      sessionStorage.removeItem("oauth-success");
      onClose();
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      sessionStorage.removeItem("oauth-success");
      onClose();
    }
  };

  for ({ isOpen, onClose, onAuthSuccess } of this) {
    if (!isOpen) {
      yield <div></div>;
      continue;
    }

    yield (
      <div
        class={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 ${
          isOpen ? "block" : "hidden"
        }`}
        onclick={handleBackdropClick}
        onkeydown={handleKeyDown}
      >
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-xl font-semibold text-gray-900">
                Login to GitHub
              </h2>
              <button
                onclick={onClose}
                class="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <p class="text-sm text-gray-600 mb-6">
              Choose how you'd like to authenticate with GitHub. This is
              optional - the app works without authentication, but you'll have
              higher rate limits with login.
            </p>

            {sessionStorage.getItem("oauth-success") && (
              <div class="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                <div class="text-green-800 text-sm">
                  <p class="font-medium mb-1">
                    ✓ OAuth Authorization Successful!
                  </p>
                  <p>
                    You've successfully authorized the app with GitHub. Now
                    create a Personal Access Token below to complete the
                    authentication.
                  </p>
                </div>
              </div>
            )}

            <div class="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
              <div class="text-blue-800 text-sm">
                <p class="font-medium mb-1">OAuth + PAT Authentication</p>
                <p>
                  This app uses a hybrid approach: OAuth for authorization +
                  Personal Access Token for API access. Click "Login with
                  GitHub" to authorize, then create a PAT below.
                </p>
              </div>
            </div>

            {
              <div class="space-y-4">
                <button
                  onclick={handleOAuthStart}
                  class="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <svg
                    class="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Login with GitHub (OAuth)
                </button>

                <div class="relative">
                  <div class="absolute inset-0 flex items-center">
                    <div class="w-full border-t border-gray-300" />
                  </div>
                  <div class="relative flex justify-center text-sm">
                    <span class="px-2 bg-white text-gray-500">or</span>
                  </div>
                </div>

                <form onsubmit={handlePatSubmit} class="space-y-4">
                  <div>
                    <label
                      for="pat-token"
                      class="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Personal Access Token
                    </label>
                    <input
                      id="pat-token"
                      type="password"
                      name="token"
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      value={state.patState.token}
                      oninput={handlePatInput}
                      class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p class="text-xs text-gray-500 mt-1">
                      <a
                        href="https://github.com/settings/tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-blue-600 hover:text-blue-800 underline"
                      >
                        Create a token here
                      </a>{" "}
                      (no special permissions needed for public repos)
                    </p>
                  </div>
                  <button
                    type="submit"
                    class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Use Token
                  </button>
                </form>
              </div>
            }

            {state.patState.error && (
              <div class="bg-red-50 border border-red-200 rounded-md p-4 mt-4">
                <div class="text-red-800 text-sm">
                  <strong>Error:</strong> {state.patState.error}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
