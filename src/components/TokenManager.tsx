/** @jsxImportSource @b9g/crank */

interface TokenManagerProps {
  onTokenChange: (token: string | null) => void;
}

export function TokenManager({ onTokenChange }: TokenManagerProps) {
  const handleTokenSubmit = (event: Event) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const token = formData.get("token") as string;

    if (token && token.trim()) {
      localStorage.setItem("github-token", token.trim());
      onTokenChange(token.trim());
    }
  };

  const handleClearToken = () => {
    localStorage.removeItem("github-token");
    onTokenChange(null);
  };

  const currentToken = localStorage.getItem("github-token");

  return (
    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <h3 class="text-lg font-semibold text-yellow-800 mb-2">
        GitHub Authentication (Optional)
      </h3>
      <p class="text-sm text-yellow-700 mb-4">
        Add a Personal Access Token to increase your rate limit from 60 to 5,000
        requests per hour.
        <br />
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

      {currentToken ? (
        <div class="flex items-center justify-between">
          <div class="text-sm text-green-700">
            ✓ Token configured (5,000 requests/hour)
          </div>
          <button
            type="button"
            onclick={handleClearToken}
            class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Clear Token
          </button>
        </div>
      ) : (
        <form onsubmit={handleTokenSubmit} class="space-y-3">
          <div>
            <input
              type="password"
              name="token"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add Token
          </button>
        </form>
      )}
    </div>
  );
}
