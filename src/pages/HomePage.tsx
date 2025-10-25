/** @jsxImportSource @b9g/crank */

import type { Context } from "@b9g/crank";
import { RepositoryInput } from "../components/RepositoryInput";
import { LoginDialog } from "../components/LoginDialog";
import Cog from "../components/icons/Cog";

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
              <h1 class="text-3xl font-bold text-slate-200 mb-2">
                GitHub Repository Analytics
              </h1>
              <p class="text-slate-300">
                Analyze workflow runs, pull requests, and development metrics
                for any public GitHub repository.
              </p>
            </div>

            <div class="space-y-6">
              {/* Repository Selection */}
              <div class="bg-white rounded-lg shadow-md p-6">
                {selectedRepository && (
                  <div class="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-md">
                    <div class="flex items-center">
                      <Cog className="size-8 mr-4 " />
                      <div class="text-sm text-slate-700">
                        <div class="font-medium">
                          Selected Repository: {selectedRepository.owner}/
                          {selectedRepository.name}
                        </div>
                        <div class="text-indigo-600">
                          Data will be fetched for the last 30 days and cached
                          locally.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div class="mt-4 bg-rose-50 border border-rose-200 rounded-md p-4">
                    <div class="text-rose-800">
                      <strong>Error:</strong> {error}
                    </div>
                  </div>
                )}

                <RepositoryInput
                  onSelect={onRepositorySelect}
                  isLoading={isLoading}
                />
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
