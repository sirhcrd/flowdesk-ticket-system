// FlowDesk Frontend Application
document.addEventListener('alpine:init', () => {
    Alpine.data('app', () => ({
        // State
        isAuthenticated: false,
        isLoading: false,
        user: null,
        darkMode: localStorage.getItem('darkMode') === 'true' || false,
        currentView: 'dashboard',
        error: '',
        
        // Data
        tickets: [],
        recentTickets: [],
        users: [],
        stats: {
            total: 0,
            open: 0,
            in_progress: 0,
            resolved: 0,
            closed: 0
        },
        
        // Forms
        loginForm: {
            email: '',
            password: ''
        },
        newTicket: {
            title: '',
            description: '',
            priority: 'medium',
            assignee_id: ''
        },
        
        // UI State
        showCreateTicket: false,
        
        // WebSocket
        websocket: null,
        
        // Initialize
        init() {
            this.checkAuth();
            this.initWebSocket();
            
            // Check for saved theme preference
            if (this.darkMode) {
                document.documentElement.classList.add('dark');
            }
        },
        
        // Authentication
        async checkAuth() {
            const token = localStorage.getItem('access_token');
            if (!token) {
                this.isAuthenticated = false;
                return;
            }
            
            try {
                const response = await fetch('/api/auth/me', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    this.user = await response.json();
                    this.isAuthenticated = true;
                    await this.loadDashboardData();
                } else {
                    localStorage.removeItem('access_token');
                    this.isAuthenticated = false;
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                this.isAuthenticated = false;
            }
        },
        
        async login() {
            this.isLoading = true;
            this.error = '';
            
            try {
                const formData = new FormData();
                formData.append('username', this.loginForm.email);
                formData.append('password', this.loginForm.password);
                
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem('access_token', data.access_token);
                    await this.checkAuth();
                } else {
                    const errorData = await response.json();
                    this.error = errorData.detail || 'Login failed';
                }
            } catch (error) {
                console.error('Login error:', error);
                this.error = 'Network error. Please try again.';
            } finally {
                this.isLoading = false;
            }
        },
        
        logout() {
            localStorage.removeItem('access_token');
            this.isAuthenticated = false;
            this.user = null;
            this.currentView = 'dashboard';
            
            // Close WebSocket connection
            if (this.websocket) {
                this.websocket.close();
                this.websocket = null;
            }
        },
        
        // WebSocket
        initWebSocket() {
            if (!this.isAuthenticated) return;
            
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws/${this.user?.id || 'anonymous'}`;
            
            this.websocket = new WebSocket(wsUrl);
            
            this.websocket.onopen = () => {
                console.log('WebSocket connected');
            };
            
            this.websocket.onmessage = (event) => {
                const message = JSON.parse(event.data);
                this.handleWebSocketMessage(message);
            };
            
            this.websocket.onclose = () => {
                console.log('WebSocket disconnected');
                // Attempt to reconnect after 5 seconds
                if (this.isAuthenticated) {
                    setTimeout(() => this.initWebSocket(), 5000);
                }
            };
            
            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        },
        
        handleWebSocketMessage(message) {
            switch (message.type) {
                case 'ticket_created':
                case 'ticket_updated':
                    this.loadDashboardData();
                    break;
                case 'comment_added':
                    // Refresh current ticket if viewing
                    break;
                default:
                    console.log('Unknown message type:', message.type);
            }
        },
        
        // Data Loading
        async loadDashboardData() {
            if (!this.isAuthenticated) return;
            
            try {
                // Load tickets
                const ticketsResponse = await this.apiCall('/api/tickets/');
                if (ticketsResponse.ok) {
                    this.tickets = await ticketsResponse.json();
                    this.recentTickets = this.tickets.slice(0, 5);
                    this.calculateStats();
                }
                
                // Load users
                const usersResponse = await this.apiCall('/api/users/');
                if (usersResponse.ok) {
                    this.users = await usersResponse.json();
                }
            } catch (error) {
                console.error('Failed to load dashboard data:', error);
            }
        },
        
        calculateStats() {
            this.stats = {
                total: this.tickets.length,
                open: this.tickets.filter(t => t.status === 'open').length,
                in_progress: this.tickets.filter(t => t.status === 'in_progress').length,
                resolved: this.tickets.filter(t => t.status === 'resolved').length,
                closed: this.tickets.filter(t => t.status === 'closed').length
            };
        },
        
        // API Helper
        async apiCall(url, options = {}) {
            const token = localStorage.getItem('access_token');
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                ...options
            };
            
            return fetch(url, defaultOptions);
        },
        
        // Ticket Management
        async createTicket() {
            this.isLoading = true;
            
            try {
                const response = await this.apiCall('/api/tickets/', {
                    method: 'POST',
                    body: JSON.stringify(this.newTicket)
                });
                
                if (response.ok) {
                    const ticket = await response.json();
                    this.tickets.unshift(ticket);
                    this.showCreateTicket = false;
                    this.resetNewTicketForm();
                    await this.loadDashboardData();
                } else {
                    const errorData = await response.json();
                    this.error = errorData.detail || 'Failed to create ticket';
                }
            } catch (error) {
                console.error('Create ticket error:', error);
                this.error = 'Network error. Please try again.';
            } finally {
                this.isLoading = false;
            }
        },
        
        resetNewTicketForm() {
            this.newTicket = {
                title: '',
                description: '',
                priority: 'medium',
                assignee_id: ''
            };
        },
        
        viewTicket(ticketId) {
            // Navigate to ticket detail view
            console.log('View ticket:', ticketId);
            // This would be implemented with a router or detailed view
        },
        
        // UI Helpers
        toggleTheme() {
            this.darkMode = !this.darkMode;
            localStorage.setItem('darkMode', this.darkMode);
            
            if (this.darkMode) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        },
        
        getStatusColor(status) {
            const colors = {
                open: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
                in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
                resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
                closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
            };
            return colors[status] || colors.open;
        },
        
        getPriorityColor(priority) {
            const colors = {
                low: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
                medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
                high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
                urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
            };
            return colors[priority] || colors.medium;
        },
        
        formatDate(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                return 'Yesterday';
            } else if (diffDays < 7) {
                return `${diffDays} days ago`;
            } else {
                return date.toLocaleDateString();
            }
        }
    }));
});