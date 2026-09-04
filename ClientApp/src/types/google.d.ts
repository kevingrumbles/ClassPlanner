/**
 * Minimal ambient typings for the Google Identity Services popup token client
 * (loaded via the <script> tag in index.html). Only the members ClassPlanner
 * actually uses are declared.
 */
export {};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: GoogleTokenClientConfig): GoogleTokenClient;
        };
      };
    };
  }

  interface GoogleTokenClientConfig {
    client_id: string;
    scope: string;
    callback: (response: GoogleTokenResponse) => void;
    error_callback?: (error: GoogleTokenClientError) => void;
  }

  interface GoogleTokenResponse {
    access_token?: string;
    error?: string;
    error_description?: string;
  }

  interface GoogleTokenClientError {
    type?: string;
    message?: string;
  }

  interface GoogleTokenClient {
    requestAccessToken(overrideConfig?: { prompt?: string }): void;
  }
}
