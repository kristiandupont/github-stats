/** @jsxImportSource @b9g/crank */

import type { Component, Context } from "@b9g/crank";
import { AuthService } from "../services/auth";
import PullRequest from "./icons/PullRequest";
import PlayCircle from "./icons/PlayCircle";
import Cog from "./icons/Cog";

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onLoginClick: () => void;
  onLogout: () => void;
}

interface NavItem {
  path: string;
  label: string;
  icon: Component;
}

const navItems: NavItem[] = [
  { path: "/", label: "Settings", icon: Cog },
  { path: "/workflow-runs", label: "Workflow Runs", icon: PlayCircle },
  { path: "/pull-requests", label: "Pull Requests", icon: PullRequest },
];

export function* Sidebar(
  this: Context,
  { currentPath, onNavigate, onLoginClick, onLogout }: SidebarProps
) {
  const handleLogout = () =>
    this.refresh(() => {
      AuthService.logout();
      onLogout();
    });

  for ({ currentPath, onNavigate, onLoginClick } of this) {
    const isAuthenticated = AuthService.isAuthenticated();
    const authMethod = AuthService.getAuthMethod();

    yield (
      <div class="w-64 bg-slate-900/30 backdrop-blur-sm border-r border-white/10 h-screen flex flex-col">
        {/* Header */}
        <div class="p-6 border-b border-white/10">
          <h1 class="text-xl font-bold text-white">GitHub Stats</h1>
        </div>

        {/* Navigation */}
        <nav class="flex-1 p-4">
          <ul class="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <button
                  onclick={() => onNavigate(item.path)}
                  class={`w-full gap-3 flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    currentPath === item.path
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Auth Status */}
        <div class="p-4 border-t border-white/10">
          {isAuthenticated ? (
            <div class="space-y-3">
              <div class="bg-emerald-500/20 border border-emerald-400/30 rounded-lg p-3">
                <div class="flex items-center">
                  <svg
                    class="w-4 h-4 text-emerald-300 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div class="text-xs text-emerald-100">
                    <div class="font-medium">
                      Authenticated
                      {authMethod === "oauth" && " (OAuth)"}
                      {authMethod === "pat" && " (PAT)"}
                    </div>
                    <div class="text-emerald-300/80">5,000 requests/hour</div>
                  </div>
                </div>
              </div>
              <button
                onclick={handleLogout}
                class="w-full px-3 py-2 text-sm bg-rose-500/20 text-rose-200 border border-rose-400/30 rounded-md hover:bg-rose-500/30 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              >
                Logout
              </button>
            </div>
          ) : (
            <div class="space-y-3">
              <div class="bg-amber-500/20 border border-amber-400/30 rounded-lg p-3">
                <div class="flex items-center">
                  <svg
                    class="w-4 h-4 text-amber-300 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div class="text-xs text-amber-100">
                    <div class="font-medium">Not authenticated</div>
                    <div class="text-amber-300/80">60 requests/hour</div>
                  </div>
                </div>
              </div>
              <button
                onclick={onLoginClick}
                class="w-full px-3 py-2 text-sm bg-indigo-500/30 text-indigo-100 border border-indigo-400/30 rounded-md hover:bg-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
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
