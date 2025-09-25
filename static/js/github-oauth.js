// GitHub OAuth Authentication Manager
class GitHubOAuth {
    constructor() {
        // GitHub OAuth App Configuration
        // TODO: Set up your GitHub OAuth app at: https://github.com/settings/applications/new
        this.clientId = 'Ov23liK8J9X4fN2pQ8mH'; // FlowDesk GitHub App Client ID
        this.redirectUri = window.location.origin + window.location.pathname;
        this.scope = 'repo'; // Need repo access for read/write to repositories
        
        console.log('OAuth Redirect URI:', this.redirectUri);
        
        // Token storage
        this.tokenKey = 'flowdesk_github_token';
        this.userKey = 'flowdesk_github_user';
        
        this.token = localStorage.getItem(this.tokenKey);
        this.user = null;
        
        // Check if we're returning from OAuth callback
        this.handleOAuthCallback();
    }

    // ============================================================
    // OAUTH FLOW METHODS
    // ============================================================

    /**
     * Start the GitHub OAuth authentication flow
     */
    async authenticate() {
        // Generate a random state for security
        const state = this.generateRandomString();
        localStorage.setItem('oauth_state', state);

        // Build the authorization URL
        const authUrl = new URL('https://github.com/login/oauth/authorize');
        authUrl.searchParams.set('client_id', this.clientId);
        authUrl.searchParams.set('redirect_uri', this.redirectUri);
        authUrl.searchParams.set('scope', this.scope);
        authUrl.searchParams.set('state', state);

        // Redirect to GitHub OAuth
        window.location.href = authUrl.toString();
    }

    /**
     * Handle OAuth callback after user authorizes
     */
    async handleOAuthCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const storedState = localStorage.getItem('oauth_state');

        if (code && state && state === storedState) {
            try {
                // Exchange code for access token
                await this.exchangeCodeForToken(code);
                
                // Clean up URL and localStorage
                localStorage.removeItem('oauth_state');
                window.history.replaceState({}, document.title, window.location.pathname);
                
                console.log('✅ GitHub OAuth authentication successful!');
                return true;
            } catch (error) {
                console.error('❌ OAuth callback error:', error);
                this.showError('Authentication failed: ' + error.message);
                return false;
            }
        }
        
        return false;
    }

    /**
     * Exchange authorization code for access token
     */
    async exchangeCodeForToken(code) {
        // For demo purposes, we'll use a simple proxy or GitHub App approach
        // In production, this should go through your backend to keep client_secret secure
        
        try {
            // Use GitHub's OAuth proxy service for client-only apps
            const proxyUrl = 'https://cors-anywhere.herokuapp.com/https://github.com/login/oauth/access_token';
            
            const response = await fetch(proxyUrl, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    client_id: this.clientId,
                    client_secret: 'ghs_PLACEHOLDER_SECRET', // Demo secret - replace with real one
                    code: code,
                    redirect_uri: this.redirectUri
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.access_token) {
                this.token = data.access_token;
                localStorage.setItem(this.tokenKey, this.token);
                
                // Get user info
                await this.fetchUserInfo();
                return true;
            } else {
                throw new Error(data.error_description || 'Failed to get access token');
            }
        } catch (error) {
            // Fallback: show instructions for manual setup
            console.error('OAuth token exchange failed:', error);
            throw new Error('GitHub OAuth setup required. Please see GITHUB_OAUTH_SETUP.md for instructions.');
        }
    }

    /**
     * Fetch authenticated user information
     */
    async fetchUserInfo() {
        if (!this.token) return null;

        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.ok) {
                this.user = await response.json();
                localStorage.setItem(this.userKey, JSON.stringify(this.user));
                return this.user;
            } else {
                throw new Error('Failed to fetch user info');
            }
        } catch (error) {
            console.error('❌ Failed to fetch user info:', error);
            return null;
        }
    }

    // ============================================================
    // AUTHENTICATION STATE METHODS
    // ============================================================

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.token;
    }

    /**
     * Get current authenticated user
     */
    getCurrentUser() {
        if (!this.user && this.token) {
            const stored = localStorage.getItem(this.userKey);
            if (stored) {
                this.user = JSON.parse(stored);
            }
        }
        return this.user;
    }

    /**
     * Logout user
     */
    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        localStorage.removeItem('oauth_state');
        
        console.log('👋 User logged out');
    }

    // ============================================================
    // AUTHENTICATED API METHODS
    // ============================================================

    /**
     * Make authenticated GitHub API request
     */
    async makeAuthenticatedRequest(url, options = {}) {
        if (!this.token) {
            throw new Error('Not authenticated. Please login with GitHub first.');
        }

        const config = {
            ...options,
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const response = await fetch(url, config);
        
        if (response.status === 401) {
            // Token expired or invalid
            this.logout();
            throw new Error('Authentication expired. Please login again.');
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `GitHub API error: ${response.status}`);
        }

        return response;
    }

    /**
     * Get file content from GitHub repository
     */
    async getRepositoryFile(owner, repo, path, branch = 'main') {
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
        const response = await this.makeAuthenticatedRequest(url);
        return response.json();
    }

    /**
     * Create or update file in GitHub repository
     */
    async updateRepositoryFile(owner, repo, path, content, message, branch = 'main') {
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
        
        // First, try to get existing file to get SHA
        let sha = null;
        try {
            const existing = await this.getRepositoryFile(owner, repo, path, branch);
            sha = existing.sha;
        } catch (error) {
            // File doesn't exist, that's okay for new files
        }

        const body = {
            message: message,
            content: btoa(unescape(encodeURIComponent(content))), // Base64 encode with UTF-8 support
            branch: branch
        };

        if (sha) {
            body.sha = sha;
        }

        const response = await this.makeAuthenticatedRequest(url, {
            method: 'PUT',
            body: JSON.stringify(body)
        });

        return response.json();
    }

    // ============================================================
    // UTILITY METHODS
    // ============================================================

    /**
     * Generate random string for OAuth state
     */
    generateRandomString() {
        const array = new Uint32Array(28);
        window.crypto.getRandomValues(array);
        return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
    }

    /**
     * Show error message to user
     */
    showError(message) {
        // You can customize this to match your UI
        alert('Authentication Error: ' + message);
    }

    /**
     * Get authentication status for UI
     */
    getAuthStatus() {
        const user = this.getCurrentUser();
        return {
            isAuthenticated: this.isAuthenticated(),
            user: user,
            canSync: this.isAuthenticated(),
            loginUrl: this.isAuthenticated() ? null : '#'
        };
    }
}

// Global OAuth instance
window.githubAuth = new GitHubOAuth();