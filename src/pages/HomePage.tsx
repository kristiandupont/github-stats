/** @jsxImportSource @b9g/crank */

import type { Context } from "@b9g/crank";
import { RepositoryInput } from "../components/RepositoryInput";
import { LoginDialog } from "../components/LoginDialog";

interface HomePageProps {
  onRepositorySelect: (owner: string, repo: string) => void;
  onLoginDialogClose: () => void;
  isLoginDialogOpen: boolean;
  isLoading: boolean;
  error: string | null;
  selectedRepository: { owner: string; name: string } | null;
}

export function* HomePage(
  this: Context,
  {
    onRepositorySelect,
    onLoginDialogClose,
    isLoginDialogOpen,
    isLoading,
    error,
    selectedRepository,
  }: HomePageProps
) {
  for ({
    onRepositorySelect,
    isLoading,
    selectedRepository,
    error,
    isLoginDialogOpen,
    onLoginDialogClose,
  } of this) {
    yield (
      <div class="flex flex-col h-full">
        <div class="flex-1 p-6">
          <div class="max-w-2xl mx-auto">
            <div class="mb-8">
              <h1 class="text-3xl font-bold text-gray-900 mb-2">
                GitHub Repository Analytics
              </h1>
              <p class="text-gray-600">
                Analyze workflow runs, pull requests, and development metrics
                for any public GitHub repository.
              </p>
            </div>

            <div class="space-y-6">
              {/* Repository Selection */}
              <div class="bg-white rounded-lg shadow-md p-6">
                <h2 class="text-xl font-semibold text-gray-800 mb-4">
                  Repository Configuration
                </h2>
                <RepositoryInput
                  onSelect={onRepositorySelect}
                  isLoading={isLoading}
                />

                {selectedRepository && (
                  <div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <div class="flex items-center">
                      <svg
                        class="w-5 h-5 text-blue-600 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div class="text-sm text-blue-800">
                        <div class="font-medium">
                          Selected Repository: {selectedRepository.owner}/
                          {selectedRepository.name}
                        </div>
                        <div class="text-blue-600">
                          Data will be fetched for the last 30 days and cached
                          locally.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div class="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
                    <div class="text-red-800">
                      <strong>Error:</strong> {error}
                    </div>
                  </div>
                )}
              </div>

              {/* Getting Started */}
              <div class="bg-white rounded-lg shadow-md p-6">
                <h2 class="text-xl font-semibold text-gray-800 mb-4">
                  Getting Started
                </h2>
                <div class="space-y-4">
                  <div class="flex items-start">
                    <div class="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                      1
                    </div>
                    <div>
                      <h3 class="font-medium text-gray-900">
                        Select a Repository
                      </h3>
                      <p class="text-sm text-gray-600">
                        Enter the owner and name of a public GitHub repository
                        above.
                      </p>
                    </div>
                  </div>

                  <div class="flex items-start">
                    <div class="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                      2
                    </div>
                    <div>
                      <h3 class="font-medium text-gray-900">
                        Explore Analytics
                      </h3>
                      <p class="text-sm text-gray-600">
                        Navigate to the "Workflow Runs" or "Pull Requests" pages
                        to view detailed analytics and charts.
                      </p>
                    </div>
                  </div>

                  <div class="flex items-start">
                    <div class="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                      3
                    </div>
                    <div>
                      <h3 class="font-medium text-gray-900">Optional: Login</h3>
                      <p class="text-sm text-gray-600">
                        Login with GitHub to increase your rate limit from 60 to
                        5,000 requests per hour.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div class="bg-white rounded-lg shadow-md p-6">
                <h2 class="text-xl font-semibold text-gray-800 mb-4">
                  Features
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="flex items-start">
                    <span class="text-2xl mr-3">🔄</span>
                    <div>
                      <h3 class="font-medium text-gray-900">
                        Workflow Analytics
                      </h3>
                      <p class="text-sm text-gray-600">
                        Build times, success rates, frequency, and branch
                        analysis
                      </p>
                    </div>
                  </div>

                  <div class="flex items-start">
                    <span class="text-2xl mr-3">📝</span>
                    <div>
                      <h3 class="font-medium text-gray-900">
                        Pull Request Metrics
                      </h3>
                      <p class="text-sm text-gray-600">
                        PR duration, throughput, and open PR trends
                      </p>
                    </div>
                  </div>

                  <div class="flex items-start">
                    <span class="text-2xl mr-3">💾</span>
                    <div>
                      <h3 class="font-medium text-gray-900">Local Caching</h3>
                      <p class="text-sm text-gray-600">
                        Data is cached locally for faster subsequent loads
                      </p>
                    </div>
                  </div>

                  <div class="flex items-start">
                    <span class="text-2xl mr-3">📊</span>
                    <div>
                      <h3 class="font-medium text-gray-900">
                        Interactive Charts
                      </h3>
                      <p class="text-sm text-gray-600">
                        Beautiful D3.js visualizations with tooltips and
                        interactions
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <LoginDialog
          isOpen={isLoginDialogOpen}
          onClose={onLoginDialogClose}
          onAuthSuccess={() => this.refresh()}
        />
      </div>
    );
  }
}
