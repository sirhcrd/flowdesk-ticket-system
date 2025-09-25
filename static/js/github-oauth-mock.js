// GitHub OAuth Mock for Development/Demo
class MockGitHubOAuth {
    constructor() {
        this.clientId = 'demo_client_id';
        this.tokenKey = 'flowdesk_github_token_mock';
        this.userKey = 'flowdesk_github_user_mock';
        
        this.token = localStorage.getItem(this.tokenKey);
        this.user = null;
        
        // Load stored user
        if (this.token) {
            const stored = localStorage.getItem(this.userKey);
            if (stored) {
                this.user = JSON.parse(stored);
            }
        }
    }

    // Simulate OAuth authentication
    async authenticate() {
        // Create a mock GitHub user for demo purposes
        const mockUser = {
            id: 12345,
            login: 'demo-user',
            name: 'Demo GitHub User',
            email: 'demo@github.com',
            avatar_url: 'https://avatars.githubusercontent.com/u/12345?v=4',
            html_url: 'https://github.com/demo-user'
        };

        // Simulate successful authentication
        this.token = 'mock_github_token_' + Date.now();
        this.user = mockUser;
        
        localStorage.setItem(this.tokenKey, this.token);
        localStorage.setItem(this.userKey, JSON.stringify(mockUser));
        
        console.log('✅ Mock GitHub authentication successful');
        
        // Trigger a page refresh to update UI
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }

    isAuthenticated() {
        return !!this.token;
    }

    getCurrentUser() {
        return this.user;
    }

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        console.log('👋 Mock GitHub logout successful');
        
        // Trigger a page refresh to update UI
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }

    // Mock authenticated requests - just pass through to regular fetch
    async makeAuthenticatedRequest(url, options = {}) {
        if (!this.token) {
            throw new Error('Not authenticated. Please login with GitHub first.');
        }

        // For mock purposes, we'll still make regular requests
        // In real implementation, this would add Authorization header
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
        return response;
    }

    getAuthStatus() {
        return {
            isAuthenticated: this.isAuthenticated(),
            user: this.getCurrentUser(),
            canSync: this.isAuthenticated(),
            loginUrl: this.isAuthenticated() ? null : '#'
        };
    }
}

// Use mock OAuth for demo, real OAuth for production
window.githubAuth = new MockGitHubOAuth();

console.log('🎭 Using Mock GitHub OAuth for demonstration');
console.log('💡 To use real GitHub OAuth, see GITHUB_OAUTH_SETUP.md');