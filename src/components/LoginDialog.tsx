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
  const state: DialogState = {
    patState: {
      token: "",
      error: null,
    },
  };

  const handleOAuthStart = () => {
    // Start OAuth flow - this will redirect to GitHub
    AuthService.initiateOAuthFlow();
  };

  const handlePatSubmit = (event: Event) =>
    this.refresh(async () => {
      event.preventDefault();
      const form = event.target as HTMLFormElement;
      const formData = new FormData(form);
      const token = formData.get("token") as string;
      if (!token || !token.trim()) {
        state.patState.error = "Please enter a token";
        return;
      }
      try {
        state.patState.error = null;
        this.refresh();
        const isValid = await AuthService.validateToken(token.trim());
        if (!isValid) {
          state.patState.error =
            "Invalid token. Please check your token and try again.";
          return;
        }
        AuthService.setToken(token.trim(), "pat");
        sessionStorage.removeItem("oauth-success");
        onAuthSuccess();
        onClose();
      } catch (error) {
        state.patState.error =
          error instanceof Error ? error.message : "Failed to validate token";
      }
    });

  const handlePatInput = (event: Event) =>
    this.refresh(() => {
      const input = event.target as HTMLInputElement;
      state.patState.token = input.value;
      state.patState.error = null;
    });

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
              <div class="bg-emerald-50 border border-emerald-200 rounded-md p-4 mb-4">
                <div class="text-emerald-800 text-sm">
                  <p class="font-medium mb-1">
                    ✓ OAuth Authorization Successful!
                  </p>
                  <p>
                    You've successfully authorized the app with GitHub. You can
                    now close this dialog and use the app with higher rate
                    limits.
                  </p>
                </div>
              </div>
            )}

            <div class="bg-indigo-50 border border-indigo-200 rounded-md p-4 mb-4">
              <div class="text-indigo-800 text-sm">
                <p class="font-medium mb-1">
                  Choose Your Authentication Method
                </p>
                <p>
                  You can authenticate using either OAuth or a Personal Access
                  Token.
                </p>
              </div>
            </div>

            {
              <div class="space-y-4">
                <button
                  onclick={handleOAuthStart}
                  class="w-full flex items-center justify-center px-4 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                      class="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p class="text-xs text-gray-500 mt-1">
                      <a
                        href="https://github.com/settings/tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-indigo-600 hover:text-indigo-800 underline"
                      >
                        Create a token here
                      </a>{" "}
                      (no special permissions needed for public repos)
                    </p>
                  </div>
                  <button
                    type="submit"
                    class="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    Use Token
                  </button>
                </form>
              </div>
            }

            {state.patState.error && (
              <div class="bg-rose-50 border border-rose-200 rounded-md p-4 mt-4">
                <div class="text-rose-800 text-sm">
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
