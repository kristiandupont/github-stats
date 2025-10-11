/** @jsxImportSource @b9g/crank */

interface RepositoryInputProps {
  onSelect: (owner: string, repo: string) => void;
  isLoading: boolean;
}

export function RepositoryInput({ onSelect, isLoading }: RepositoryInputProps) {
  const handleSubmit = (event: Event) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const owner = formData.get("owner") as string;
    const repo = formData.get("repo") as string;

    if (owner && repo) {
      onSelect(owner.trim(), repo.trim());
    }
  };

  return (
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 class="text-xl font-semibold text-gray-800 mb-4">
        Repository Configuration
      </h2>
      <form onsubmit={handleSubmit} class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              for="owner"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Repository Owner
            </label>
            <input
              type="text"
              id="owner"
              name="owner"
              placeholder="e.g., microsoft"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label
              for="repo"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Repository Name
            </label>
            <input
              type="text"
              id="repo"
              name="repo"
              placeholder="e.g., vscode"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div class="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            class={`px-6 py-2 rounded-md font-medium ${
              isLoading
                ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            }`}
          >
            {isLoading ? "Selecting..." : "Select Repository"}
          </button>
        </div>
      </form>
      <div class="mt-4 text-sm text-gray-600">
        <p>
          Select a public GitHub repository to analyze its workflow runs and
          pull requests.
        </p>
        <p class="mt-1">
          Example:{" "}
          <code class="bg-gray-100 px-1 rounded">microsoft/vscode</code>
        </p>
      </div>
    </div>
  );
}
