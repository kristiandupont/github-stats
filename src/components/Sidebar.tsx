/** @jsxImportSource @b9g/crank */

import type { Context } from "@b9g/crank";
import { AuthService } from "../services/auth";

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onLoginClick: () => void;
  onLogout: () => void;
}

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { path: "/", label: "Settings", icon: "⚙️" },
  { path: "/workflow-runs", label: "Workflow Runs", icon: "🔄" },
  { path: "/pull-requests", label: "Pull Requests", icon: "📝" },
];

export function* Sidebar(
  this: Context,
  { currentPath, onNavigate, onLoginClick, onLogout }: SidebarProps
) {
  const handleLogout = () => {
    AuthService.logout();
    onLogout();
    this.refresh();
  };

  for ({ currentPath, onNavigate, onLoginClick, onLogout } of this) {
    const isAuthenticated = AuthService.isAuthenticated();
    const authMethod = AuthService.getAuthMethod();

    yield (
      <div class="w-64 bg-gray-50 border-r border-gray-200 h-screen flex flex-col">
        {/* Header */}
        <div class="p-6 border-b border-gray-200">
          <h1 class="text-xl font-bold text-gray-900">GitHub Stats</h1>
        </div>

        {/* Navigation */}
        <nav class="flex-1 p-4">
          <ul class="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <button
                  onclick={() => onNavigate(item.path)}
                  class={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    currentPath === item.path
                      ? "bg-blue-100 text-blue-700 border-r-2 border-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <span class="mr-3 text-lg">{item.icon}</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Auth Status */}
        <div class="p-4 border-t border-gray-200">
          {isAuthenticated ? (
            <div class="space-y-3">
              <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                <div class="flex items-center">
                  <svg
                    class="w-4 h-4 text-green-600 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div class="text-xs text-green-700">
                    <div class="font-medium">
                      ✓ Authenticated
                      {authMethod === "oauth" && " (OAuth)"}
                      {authMethod === "pat" && " (PAT)"}
                    </div>
                    <div class="text-green-600">5,000 requests/hour</div>
                  </div>
                </div>
              </div>
              <button
                onclick={handleLogout}
                class="w-full px-3 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Logout
              </button>
            </div>
          ) : (
            <div class="space-y-3">
              <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div class="flex items-center">
                  <svg
                    class="w-4 h-4 text-yellow-600 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div class="text-xs text-yellow-700">
                    <div class="font-medium">⚠️ Not authenticated</div>
                    <div class="text-yellow-600">60 requests/hour</div>
                  </div>
                </div>
              </div>
              <button
                onclick={onLoginClick}
                class="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Login
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
}
