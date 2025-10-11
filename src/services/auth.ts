// GitHub OAuth implementation

// GitHub OAuth App configuration
//
// To set up OAuth for this app:
// 1. Go to https://github.com/settings/developers
// 2. Click "New OAuth App"
// 3. Fill in:
//    - Application name: "GitHub Stats" (or whatever you prefer)
//    - Homepage URL: https://kristiandupont.github.io/github-stats (or your domain)
//    - Authorization callback URL: https://kristiandupont.github.io/github-stats/auth/callback (or your domain + /auth/callback)
// 4. Copy the Client ID and replace the value below
// 5. The Client Secret is not needed for public client-side apps
//
const GITHUB_CLIENT_ID = "Ov23liFzrgGjmNicTSPf"; // Replace with your OAuth App Client ID

export class AuthService {
  private static readonly TOKEN_KEY = "github-token";
  private static readonly AUTH_METHOD_KEY = "github-auth-method";

  // Initiate GitHub OAuth Flow (redirect-based)
  static initiateOAuthFlow(): void {
    const redirectUri = encodeURIComponent(
      window.location.origin + "/auth/callback"
    );
    const scope = "public_repo";
    const state = Math.random().toString(36).substring(7);

    // Store state for verification
    sessionStorage.setItem("oauth-state", state);

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;

    window.location.href = authUrl;
  }

  // Handle OAuth callback (shows instructions for PAT creation)
  static handleOAuthCallback(): boolean {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");
    const storedState = sessionStorage.getItem("oauth-state");

    if (!code || !state || state !== storedState) {
      return false;
    }

    // Clear the state and URL params
    sessionStorage.removeItem("oauth-state");
    window.history.replaceState({}, document.title, window.location.pathname);

    // Store the OAuth success in sessionStorage to show instructions
    sessionStorage.setItem("oauth-success", "true");

    return true;
  }

  // Set token in localStorage with auth method tracking
  static setToken(token: string, method: "oauth" | "pat"): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.AUTH_METHOD_KEY, method);
  }

  // Get current token
  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // Get current auth method
  static getAuthMethod(): "oauth" | "pat" | null {
    return localStorage.getItem(this.AUTH_METHOD_KEY) as "oauth" | "pat" | null;
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Logout - clear all auth data
  static logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.AUTH_METHOD_KEY);
  }

  // Validate token by making a test API call
  static async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
