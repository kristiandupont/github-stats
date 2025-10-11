/** @jsxImportSource @b9g/crank */

import type { Context } from "@b9g/crank";
import { AuthService } from "../services/auth";

interface AuthStatusProps {
  onLoginClick: () => void;
  onLogout: () => void;
}

export function* AuthStatus(
  this: Context,
  { onLoginClick, onLogout }: AuthStatusProps
) {
  const handleLogout = () => {
    AuthService.logout();
    onLogout();
    this.refresh();
  };

  while (true) {
    // Read auth state fresh on each render
    const isAuthenticated = AuthService.isAuthenticated();
    const authMethod = AuthService.getAuthMethod();
    if (isAuthenticated) {
      yield (
        <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <svg
                class="w-5 h-5 text-green-600 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div class="text-sm text-green-700">
                <div class="font-medium">
                  ✓ Authenticated with GitHub
                  {authMethod === "oauth" && " (OAuth)"}
                  {authMethod === "pat" && " (Personal Access Token)"}
                </div>
                <div class="text-xs text-green-600">
                  Rate limit: 5,000 requests/hour
                </div>
              </div>
            </div>
            <button
              onclick={handleLogout}
              class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Logout
            </button>
          </div>
        </div>
      );
    } else {
      yield (
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <svg
                class="w-5 h-5 text-yellow-600 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div class="text-sm text-yellow-700">
                <div class="font-medium">⚠️ Not authenticated</div>
                <div class="text-xs text-yellow-600">
                  Rate limit: 60 requests/hour (login for 5,000/hour)
                </div>
              </div>
            </div>
            <button
              onclick={onLoginClick}
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              Login
            </button>
          </div>
        </div>
      );
    }
  }
}
