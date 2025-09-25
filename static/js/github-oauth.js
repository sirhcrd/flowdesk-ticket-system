// GitHub OAuth Authentication Manager
class GitHubOAuth {
    constructor() {
        // GitHub OAuth App Configuration
        // Your actual GitHub OAuth app client ID
        this.clientId = 'Ov23liQbUZvv1SGe4SwF'; // FlowDesk GitHub OAuth App
        
        // Determine redirect URI based on environment
        const isGitHubPages = window.location.hostname.includes('github.io');
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        if (isGitHubPages) {
            this.redirectUri = `${window.location.origin}${window.location.pathname}`;
        } else if (isLocalhost) {
            this.redirectUri = `${window.location.origin}/auth/callback`;
        } else {
            this.redirectUri = `${window.location.origin}${window.location.pathname}`;
        }
        
        // Clean up redirect URI
        if (this.redirectUri.endsWith('/')) {
            this.redirectUri = this.redirectUri.slice(0, -1);
        }
        
        this.scope = 'repo user:email'; // Need repo access and user email
        
        console.log('🔧 OAuth Configuration:');
        console.log('Client ID:', this.clientId);
        console.log('Redirect URI:', this.redirectUri);
        console.log('Scope:', this.scope);
        
        // Token storage
        this.tokenKey = 'flowdesk_github_token';
        this.userKey = 'flowdesk_github_user';
        
        this.token = localStorage.getItem(this.tokenKey);
        this.user = null;
        
        // Load stored user if token exists
        if (this.token) {
            const storedUser = localStorage.getItem(this.userKey);
            if (storedUser) {
                try {
                    this.user = JSON.parse(storedUser);
                    console.log('🔄 Restored user session:', this.user.login);
                } catch (error) {
                    console.warn('Failed to parse stored user, clearing:', error);
                    this.logout();
                }
            }
        }
        
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
        console.log('🚀 Starting GitHub OAuth authentication...');
        
        // Validate client ID
        if (!this.clientId || this.clientId === 'YOUR_GITHUB_CLIENT_ID' || this.clientId === 'Ov23liK8J9X4fN2pQ8mH') {
            const message = 'GitHub OAuth not properly configured. Please:\n\n' +
                          '1. Go to https://github.com/settings/applications/new\n' +
                          '2. Create a new OAuth App\n' +
                          '3. Use the redirect URI: ' + this.redirectUri + '\n' +
                          '4. Replace the clientId in github-oauth.js with your real Client ID\n\n' +
                          'See GITHUB_OAUTH_REGISTRATION.md for detailed instructions.';
            
            alert(message);
            
            // Open registration page
            window.open('https://github.com/settings/applications/new', '_blank');
            return;
        }

        try {
            // Generate a random state for security
            const state = this.generateRandomString();
            localStorage.setItem('oauth_state', state);

            // Build the authorization URL
            const authUrl = new URL('https://github.com/login/oauth/authorize');
            authUrl.searchParams.set('client_id', this.clientId);
            authUrl.searchParams.set('redirect_uri', this.redirectUri);
            authUrl.searchParams.set('scope', this.scope);
            authUrl.searchParams.set('state', state);
            
            console.log('🔗 Redirecting to GitHub:', authUrl.toString());

            // Redirect to GitHub OAuth
            window.location.href = authUrl.toString();
            
        } catch (error) {
            console.error('❌ OAuth initiation failed:', error);
            alert('Failed to start GitHub authentication: ' + error.message);
        }
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
     * Uses a serverless function to securely handle the client secret
     */
    async exchangeCodeForToken(code) {
        console.log('🔄 Exchanging code for token...');
        
        try {
            // Try multiple OAuth proxy services in order of preference
            const baseUrl = window.location.origin;
            const proxyServices = [
                // Primary: Same-domain Netlify function (most secure)
                `${baseUrl}/.netlify/functions/github-oauth`,
                
                // Fallback 1: Alternative endpoint  
                `${baseUrl}/api/github-oauth`,
                
                // Fallback 2: External Netlify function (if deployed separately)
                `https://flowdesk-oauth-proxy.netlify.app/.netlify/functions/github-oauth`,
            ];

            for (const proxyUrl of proxyServices) {
                try {
                    console.log(`🔗 Trying OAuth proxy: ${proxyUrl}`);
                    
                    const requestBody = {
                        client_id: this.clientId,
                        code: code,
                        redirect_uri: this.redirectUri
                    };

                    // For the CORS proxy, we need a different format
                    if (proxyUrl.includes('allorigins.win')) {
                        const response = await fetch('https://github.com/login/oauth/access_token', {
                            method: 'POST',
                            headers: {
                                'Accept': 'application/json',
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                            body: new URLSearchParams({
                                ...requestBody,
                                client_secret: 'github_pat_11AAAA...' // This would need to be set
                            }).toString()
                        });
                        
                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}`);
                        }
                        
                        const data = await response.json();
                        
                        if (data.access_token) {
                            return await this.handleSuccessfulAuth(data.access_token);
                        }
                    } else {
                        // Use serverless function
                        const response = await fetch(proxyUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(requestBody)
                        });

                        if (response.ok) {
                            const data = await response.json();
                            
                            if (data.access_token) {
                                return await this.handleSuccessfulAuth(data.access_token);
                            }
                        }
                    }
                } catch (error) {
                    console.warn(`❌ Proxy ${proxyUrl} failed:`, error.message);
                    continue; // Try next proxy
                }
            }
            
            // If all proxies fail, show setup instructions
            throw new Error('OAuth token exchange failed. GitHub OAuth app setup may be incomplete.');
            
        } catch (error) {
            console.error('❌ Token exchange failed:', error);
            
            // Show helpful error message
            const message = `GitHub OAuth token exchange failed.\n\n` +
                          `This usually means:\n` +
                          `1. The GitHub OAuth app needs to be set up\n` +
                          `2. The client secret needs to be configured in a serverless function\n` +
                          `3. The redirect URI doesn't match\n\n` +
                          `Current redirect URI: ${this.redirectUri}\n\n` +
                          `Please check GITHUB_OAUTH_REGISTRATION.md for setup instructions.`;
            
            alert(message);
            throw error;
        }
    }
    
    /**
     * Handle successful authentication
     */
    async handleSuccessfulAuth(accessToken) {
        console.log('✅ OAuth token received successfully');
        
        this.token = accessToken;
        localStorage.setItem(this.tokenKey, this.token);
        
        // Get user info
        await this.fetchUserInfo();
        
        console.log('👤 User authenticated:', this.user?.login);
        return true;
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