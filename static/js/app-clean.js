// FlowDesk Collaborative - GitHub JSON Database
document.addEventListener('alpine:init', () => {
    Alpine.data('app', () => ({
        // State
        darkMode: localStorage.getItem('darkMode') === 'true' || false,
        currentView: 'dashboard',
        dbReady: false,
        loading: false,
        
                // Authentication state\n        authenticationState: false,\n        \n        // Data\n        tickets: [],
        users: [],
        currentUser: null,
        kanbanColumns: [],
        
        // UI State
        showCreateTicket: false,
        showAddUser: false,
        showAddColumn: false,
        showColumnManager: false,
        selectedTicket: null,
        showTicketDetail: false,
        
        // Editing state
        editingTitle: false,
        editingDescription: false,
        editingAssignee: false,
        editTitle: '',
        editDescription: '',
        editAssignee: '',
        
        // Forms
        newTicket: {
            title: '',
            description: '',
            priority: 'medium',
            assignee_id: null,
            tags: ''
        },
        
        newUser: {
            name: '',
            email: '',
            avatar_color: '#3B82F6'
        },
        
        newColumn: {
            name: '',
            color: '#6B7280'
        },
        
        // Colors
        avatarColors: [
            '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
            '#F97316', '#06B6D4', '#84CC16', '#EC4899', '#6B7280'
        ],
        
        columnColors: [
            '#6B7280', '#3B82F6', '#10B981', '#F59E0B',
            '#EF4444', '#8B5CF6', '#F97316', '#06B6D4'
        ],

        // Initialize
        async init() {
            console.log('🚀 FlowDesk Collaborative starting...');
            
            // Apply theme immediately
            this.toggleTheme();
            
            // Listen for authentication state changes
            window.addEventListener('auth-state-changed', async () => {
                console.log('🔄 Auth state changed - refreshing data');
                if (window.githubAuth.isAuthenticated()) {
                    this.githubUser = window.githubAuth.getUser();
                    await this.loadDataFromGitHub();
                }
                // Force reactivity update
                this.authenticationState = !this.authenticationState;
                this.authenticationState = !this.authenticationState;
            });
            
            // Initialize GitHub authentication and database
            await this.initGitHubServices();
            
            // Load data if authenticated
            if (window.githubAuth.isAuthenticated()) {
                this.githubUser = window.githubAuth.getUser();
                await this.loadDataFromGitHub();
            }
            
            // Handle OAuth callback
            await this.handleOAuthCallback();
            
            console.log('✅ FlowDesk initialization complete');
        },

        async loadDataFromGitHub() {
            console.log('📊 Loading data from GitHub...');
            
            // Load all data
            this.users = window.githubDB.getAllUsers();
            this.tickets = window.githubDB.getAllTickets();
            this.kanbanColumns = window.githubDB.getKanbanColumns();
            
            // Set current user
            const savedUserId = localStorage.getItem('flowdesk_current_user_id');
            if (savedUserId && this.users.find(u => u.id == savedUserId)) {
                this.currentUser = this.users.find(u => u.id == savedUserId);
            } else {
                this.currentUser = this.users[0] || null;
                if (this.currentUser) {
                    localStorage.setItem('flowdesk_current_user_id', this.currentUser.id);
                }
            }
            
            console.log(`📋 Loaded ${this.tickets.length} tickets, ${this.users.length} users, ${this.kanbanColumns.length} columns`);
        },

        async syncData() {
            if (!this.dbReady) return;
            
            this.loading = true;
            try {
                await window.githubDB.sync();
                await this.loadDataFromGitHub();
                console.log('🔄 Data synced with GitHub');
            } catch (error) {
                console.error('❌ Sync failed:', error);
                if (error.message.includes('authentication')) {
                    this.showAuthPrompt();
                }
            } finally {
                this.loading = false;
            }
        },

        // Authentication methods
        async loginWithGitHub() {
            try {
                await window.githubAuth.authenticate();
                
                // After successful authentication, add GitHub user to database and set as current
                const githubUser = this.githubUser;
                if (githubUser) {
                    const dbUser = await this.ensureGitHubUserInDatabase(githubUser);
                    
                    // Set the GitHub user as the current user automatically
                    this.currentUser = dbUser;
                    localStorage.setItem('flowdesk_current_user_id', dbUser.id);
                    
                    // Reload data from GitHub
                    await this.loadDataFromGitHub();
                }
                
                console.log('✅ Authentication and setup complete. Current user:', this.currentUser?.name);
            } catch (error) {
                console.error('❌ Authentication failed:', error);
                alert('GitHub authentication failed: ' + error.message);
            }
        },

        async ensureGitHubUserInDatabase(githubUser) {
            // Check if GitHub user already exists in our database
            const existingUser = this.users.find(u => 
                u.github_login === githubUser.login || 
                u.email === githubUser.email
            );
            
            if (!existingUser) {
                try {
                    const newUser = await window.githubDB.createUser({
                        name: githubUser.name || githubUser.login,
                        email: githubUser.email || '',
                        avatar_color: '#3B82F6', // Default color
                        github_login: githubUser.login,
                        github_avatar_url: githubUser.avatar_url,
                        github_id: githubUser.id
                    });
                    
                    console.log('✅ GitHub user added to database:', newUser.name);
                    return newUser;
                } catch (error) {
                    console.warn('Could not add GitHub user to database:', error);
                    // Return a temporary user object if database creation fails
                    return {
                        id: Date.now(), // Temporary ID
                        name: githubUser.name || githubUser.login,
                        email: githubUser.email || '',
                        avatar_color: '#3B82F6',
                        github_login: githubUser.login,
                        github_avatar_url: githubUser.avatar_url,
                        github_id: githubUser.id
                    };
                }
            } else {
                console.log('👤 Using existing user:', existingUser.name);
                return existingUser;
            }
        },

        async logoutFromGitHub() {
            try {
                // Clear all application state
                this.isAuthenticated = false;
                this.githubUser = null;
                this.currentUser = null;
                this.tickets = [];
                this.users = [];
                this.kanbanColumns = [];
                this.activities = [];
                
                // Close any open modals
                this.showTicketDetail = false;
                this.showNewTicket = false;
                this.showAddUser = false;
                
                // Logout from GitHub OAuth
                window.githubAuth.logout();
                
                console.log('👋 Logged out successfully');
            } catch (error) {
                console.error('❌ Error during logout:', error);
            }
        },

        get isAuthenticated() {
            // Use both the auth state and reactive property to trigger updates
            const authState = window.githubAuth ? window.githubAuth.isAuthenticated() : false;
            this.authenticationState = authState; // This makes it reactive
            return authState;
        },

        get githubUser() {
            return window.githubAuth ? window.githubAuth.getCurrentUser() : null;
        },

        get canWrite() {
            return this.isAuthenticated && window.githubDB ? window.githubDB.canWrite() : false;
        },

        showAuthPrompt() {
            const needsAuth = confirm(
                'GitHub authentication is required to save data to the collaborative workspace. ' +
                'Would you like to login with GitHub now?'
            );
            
            if (needsAuth) {
                this.loginWithGitHub();
            }
        },

        // User Management
        selectUser(user) {
            console.log('👤 Switching to user:', user.name);
            this.currentUser = user;
            localStorage.setItem('flowdesk_current_user_id', user.id);
        },
        
        async addNewUser() {
            if (!this.newUser.name.trim()) return;
            
            // Check authentication for write operations
            if (!this.canWrite) {
                this.showAuthPrompt();
                return;
            }
            
            // Check if user already exists
            const existingUser = this.users.find(u => u.name.toLowerCase() === this.newUser.name.toLowerCase());
            if (existingUser) {
                alert('A user with this name already exists!');
                return;
            }
            
            try {
                this.loading = true;
                const user = await window.githubDB.createUser(this.newUser);
                await this.loadDataFromGitHub();
                this.selectUser(user);
                
                // Reset form
                this.newUser = { name: '', email: '', avatar_color: '#3B82F6' };
                this.showAddUser = false;
                
                console.log('✅ User added successfully!');
            } catch (error) {
                console.error('❌ Error adding user:', error);
                if (error.message.includes('authentication')) {
                    this.showAuthPrompt();
                } else {
                    alert('Failed to add user: ' + error.message);
                }
            } finally {
                this.loading = false;
            }
        },

        // Ticket Management
        async createTicket() {
            if (!this.newTicket.title.trim()) {
                alert('Please enter a ticket title!');
                return;
            }
            
            // Check authentication for write operations
            if (!this.canWrite) {
                this.showAuthPrompt();
                return;
            }
            
            // Ensure we have a current user (GitHub user or default)
            let creatorUser = this.currentUser;
            if (!creatorUser && this.isAuthenticated) {
                // If authenticated but no currentUser, create one from GitHub user
                const githubUser = this.githubUser;
                if (githubUser) {
                    creatorUser = await this.ensureGitHubUserInDatabase(githubUser);
                    this.currentUser = creatorUser;
                }
            }
            
            if (!creatorUser) {
                alert('Unable to determine user for ticket creation. Please try authenticating again.');
                return;
            }
            
            try {
                this.loading = true;
                
                const ticketData = {
                    title: this.newTicket.title.trim(),
                    description: this.newTicket.description.trim(),
                    status: 'open',
                    priority: this.newTicket.priority,
                    assignee_id: this.newTicket.assignee_id || creatorUser.id,
                    creator_id: creatorUser.id,
                    kanban_column_id: this.kanbanColumns[0]?.id || 1,
                    kanban_position: 0,
                    tags: this.newTicket.tags ? this.newTicket.tags.split(',').map(t => t.trim()) : []
                };
                
                await window.githubDB.createTicket(ticketData);
                await this.loadDataFromGitHub();
                
                this.resetNewTicketForm();
                this.showCreateTicket = false;
                
                console.log('✅ Ticket created successfully by:', creatorUser.name);
            } catch (error) {
                console.error('❌ Error creating ticket:', error);
                if (error.message.includes('authentication')) {
                    this.showAuthPrompt();
                } else {
                    alert('Failed to create ticket: ' + error.message);
                }
            } finally {
                this.loading = false;
            }
        },

        resetNewTicketForm() {
            this.newTicket = {
                title: '',
                description: '',
                priority: 'medium',
                assignee_id: this.currentUser?.id || null,
                tags: ''
            };
        },

        async updateTicketStatus(ticketId, newStatus) {
            try {
                await window.githubDB.updateTicket(ticketId, {
                    status: newStatus,
                    updated_by: this.currentUser?.id
                });
                await this.loadDataFromGitHub();
                
                // Update selectedTicket if viewing
                if (this.selectedTicket && this.selectedTicket.id === ticketId) {
                    this.selectedTicket = window.githubDB.getTicketById(ticketId);
                }
            } catch (error) {
                console.error('❌ Error updating status:', error);
                alert('Failed to update status: ' + error.message);
            }
        },

        async updateTicketPriority(ticketId, newPriority) {
            try {
                await window.githubDB.updateTicket(ticketId, {
                    priority: newPriority,
                    updated_by: this.currentUser?.id
                });
                await this.loadDataFromGitHub();
                
                if (this.selectedTicket && this.selectedTicket.id === ticketId) {
                    this.selectedTicket = window.githubDB.getTicketById(ticketId);
                }
            } catch (error) {
                console.error('❌ Error updating priority:', error);
                alert('Failed to update priority: ' + error.message);
            }
        },

        async deleteTicket(ticketId) {
            if (confirm('Are you sure you want to delete this ticket?')) {
                try {
                    await window.githubDB.deleteTicket(ticketId);
                    await this.loadDataFromGitHub();
                    console.log('✅ Ticket deleted successfully!');
                } catch (error) {
                    console.error('❌ Error deleting ticket:', error);
                    alert('Failed to delete ticket: ' + error.message);
                }
            }
        },

        viewTicket(ticket) {
            this.selectedTicket = window.githubDB.getTicketById(ticket.id);
            this.showTicketDetail = true;
            this.editingTitle = false;
            this.editingDescription = false;
            this.editingAssignee = false;
        },

        async saveTitle() {
            if (!this.editTitle || !this.selectedTicket) return;
            
            try {
                await window.githubDB.updateTicket(this.selectedTicket.id, {
                    title: this.editTitle,
                    updated_by: this.currentUser?.id
                });
                
                // Add activity
                if (this.currentUser) {
                    await window.githubDB.addActivity(this.selectedTicket.id, this.currentUser.id, 'updated', `Title changed to "${this.editTitle}"`);
                }
                
                await this.loadDataFromGitHub();
                this.selectedTicket = window.githubDB.getTicketById(this.selectedTicket.id);
                this.editingTitle = false;
                console.log('✅ Title updated successfully!');
            } catch (error) {
                console.error('❌ Error updating title:', error);
                alert('Failed to update title: ' + error.message);
            }
        },

        async saveDescription() {
            if (!this.selectedTicket) return;
            
            try {
                await window.githubDB.updateTicket(this.selectedTicket.id, {
                    description: this.editDescription || '',
                    updated_by: this.currentUser?.id
                });
                
                // Add activity
                if (this.currentUser) {
                    await window.githubDB.addActivity(this.selectedTicket.id, this.currentUser.id, 'updated', 'Description updated');
                }
                
                await this.loadDataFromGitHub();
                this.selectedTicket = window.githubDB.getTicketById(this.selectedTicket.id);
                this.editingDescription = false;
                console.log('✅ Description updated successfully!');
            } catch (error) {
                console.error('❌ Error updating description:', error);
                alert('Failed to update description: ' + error.message);
            }
        },

        // Kanban Functions
        getColumnTickets(columnId) {
            return this.tickets.filter(ticket => ticket.kanban_column_id === columnId)
                             .sort((a, b) => (a.kanban_position || 0) - (b.kanban_position || 0));
        },
        
        getColumnTicketCount(columnId) {
            return this.getColumnTickets(columnId).length;
        },

        async addColumn() {
            if (!this.newColumn.name.trim()) return;
            
            try {
                await window.githubDB.createColumn(this.newColumn);
                await this.loadDataFromGitHub();
                this.newColumn = { name: '', color: '#6B7280' };
                this.showAddColumn = false;
                console.log('✅ Column added successfully!');
            } catch (error) {
                console.error('❌ Error adding column:', error);
                alert('Failed to add column: ' + error.message);
            }
        },

        async moveTicketToColumn(ticketId, newColumnId, newPosition) {
            try {
                console.log(`📦 Moving ticket ${ticketId} to column ${newColumnId}`);
                
                await window.githubDB.updateTicket(ticketId, {
                    kanban_column_id: newColumnId,
                    kanban_position: newPosition,
                    updated_by: this.currentUser?.id
                });
                
                // Add move activity
                const column = this.kanbanColumns.find(c => c.id === newColumnId);
                if (column && this.currentUser) {
                    await window.githubDB.addActivity(ticketId, this.currentUser.id, 'moved', `Ticket moved to ${column.name}`);
                }
                
                // Update local ticket data without full reload to keep Sortable working
                const ticket = this.tickets.find(t => t.id === ticketId);
                if (ticket) {
                    ticket.kanban_column_id = newColumnId;
                    ticket.kanban_position = newPosition;
                    ticket.kanban_column_name = column?.name || 'Unknown';
                    ticket.kanban_column_color = column?.color || '#6B7280';
                }
                
                console.log('✅ Ticket moved successfully!');
            } catch (error) {
                console.error('❌ Error moving ticket:', error);
                alert('Failed to move ticket: ' + error.message);
                // Only reload on error
                await this.loadDataFromGitHub();
            }
        },

        initSortable(element, columnId) {
            const self = this;
            
            new Sortable(element, {
                group: 'kanban',
                animation: 150,
                ghostClass: 'opacity-50',
                chosenClass: 'bg-blue-100 dark:bg-blue-900',
                dragClass: 'rotate-3 shadow-xl',
                
                onEnd: function(evt) {
                    const ticketId = parseInt(evt.item.dataset.ticketId);
                    const newColumnId = parseInt(evt.to.dataset.columnId);
                    const newPosition = evt.newIndex;
                    
                    self.moveTicketToColumn(ticketId, newColumnId, newPosition);
                }
            });
        },

        // Statistics
        get stats() {
            return window.githubDB?.getStats() || {
                total: 0, open: 0, in_progress: 0, resolved: 0, closed: 0
            };
        },

        get recentTickets() {
            return this.tickets.slice(0, 5);
        },

        // Export Functions
        exportToCSV() {
            const headers = ['ID', 'Title', 'Description', 'Status', 'Priority', 'Assignee', 'Creator', 'Kanban Column', 'Created', 'Updated', 'Tags'];
            
            if (!this.tickets || this.tickets.length === 0) {
                alert('No tickets to export!');
                return;
            }
            
            const csvContent = [
                headers.join(','),
                ...this.tickets.map(ticket => [
                    ticket.id,
                    `"${ticket.title || ''}"`,
                    `"${(ticket.description || '').replace(/"/g, '""')}"`,
                    ticket.status || '',
                    ticket.priority || '',
                    `"${ticket.assignee_name || 'Unassigned'}"`,
                    `"${ticket.creator_name || 'Unknown'}"`,
                    `"${ticket.kanban_column_name || 'No Column'}"`,
                    ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : '',
                    ticket.updated_at ? new Date(ticket.updated_at).toLocaleDateString() : '',
                    `"${Array.isArray(ticket.tags) ? ticket.tags.join(', ') : (ticket.tags || '')}"`
                ].join(','))
            ].join('\\n');
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T');
            const filename = `flowdesk-tickets-${timestamp[0]}_${timestamp[1].split('.')[0]}.csv`;
            this.downloadFile(csvContent, filename, 'text/csv');
        },

        exportToJSON() {
            if (!this.tickets || this.tickets.length === 0) {
                alert('No tickets to export!');
                return;
            }
            
            const exportData = {
                exportDate: new Date().toISOString(),
                version: '3.0',
                system: 'FlowDesk Collaborative (GitHub)',
                totalTickets: this.tickets.length,
                users: this.users,
                kanbanColumns: this.kanbanColumns,
                tickets: this.tickets
            };
            
            const jsonContent = JSON.stringify(exportData, null, 2);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T');
            const filename = `flowdesk-export-${timestamp[0]}_${timestamp[1].split('.')[0]}.json`;
            this.downloadFile(jsonContent, filename, 'application/json');
        },

        exportToXLSX() {
            // For XLSX export, we'll create a more advanced CSV that Excel can import nicely
            const headers = ['ID', 'Title', 'Description', 'Status', 'Priority', 'Assignee', 'Creator', 'Kanban Column', 'Created Date', 'Updated Date', 'Tags'];
            
            if (!this.tickets || this.tickets.length === 0) {
                alert('No tickets to export!');
                return;
            }
            
            // Create tab-separated values for better Excel compatibility
            const tsvContent = [
                headers.join('\t'),
                ...this.tickets.map(ticket => [
                    ticket.id,
                    (ticket.title || '').replace(/\t/g, ' '),
                    (ticket.description || '').replace(/\t/g, ' ').replace(/\n/g, ' '),
                    ticket.status || '',
                    ticket.priority || '',
                    ticket.assignee_name || 'Unassigned',
                    ticket.creator_name || 'Unknown',
                    ticket.kanban_column_name || 'No Column',
                    ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : '',
                    ticket.updated_at ? new Date(ticket.updated_at).toLocaleDateString() : '',
                    Array.isArray(ticket.tags) ? ticket.tags.join(', ') : (ticket.tags || '')
                ].join('\t'))
            ].join('\n');
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T');
            const filename = `flowdesk-tickets-${timestamp[0]}_${timestamp[1].split('.')[0]}.xlsx`;
            this.downloadFile(tsvContent, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        },

        exportToDatabase() {
            // Export in a database-friendly format (SQL-like)
            if (!this.tickets || this.tickets.length === 0) {
                alert('No tickets to export!');
                return;
            }
            
            const sqlContent = [
                '-- FlowDesk Tickets Database Export',
                `-- Generated: ${new Date().toISOString()}`,
                `-- Total Tickets: ${this.tickets.length}`,
                '',
                '-- Users Table',
                'CREATE TABLE users (',
                '  id INTEGER PRIMARY KEY,',
                '  name VARCHAR(255),',
                '  email VARCHAR(255),',
                '  github_login VARCHAR(255)',
                ');',
                '',
                ...this.users.map(user => 
                    `INSERT INTO users (id, name, email, github_login) VALUES (${user.id}, '${(user.name || '').replace(/'/g, "''")}', '${(user.email || '').replace(/'/g, "''")}', '${(user.github_login || '').replace(/'/g, "''")}');`
                ),
                '',
                '-- Tickets Table',
                'CREATE TABLE tickets (',
                '  id INTEGER PRIMARY KEY,',
                '  title VARCHAR(255),',
                '  description TEXT,',
                '  status VARCHAR(50),',
                '  priority VARCHAR(50),',
                '  assignee_id INTEGER,',
                '  created_by INTEGER,',
                '  created_at DATETIME,',
                '  updated_at DATETIME',
                ');',
                '',
                ...this.tickets.map(ticket => {
                    const title = (ticket.title || '').replace(/'/g, "''");
                    const description = (ticket.description || '').replace(/'/g, "''");
                    return `INSERT INTO tickets (id, title, description, status, priority, assignee_id, created_by, created_at, updated_at) VALUES (${ticket.id}, '${title}', '${description}', '${ticket.status}', '${ticket.priority}', ${ticket.assignee_id || 'NULL'}, ${ticket.created_by || 'NULL'}, '${ticket.created_at}', '${ticket.updated_at}');`;
                })
            ].join('\n');
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T');
            const filename = `flowdesk-database-${timestamp[0]}_${timestamp[1].split('.')[0]}.sql`;
            this.downloadFile(sqlContent, filename, 'application/sql');
        },

        downloadFile(content, filename, mimeType) {
            try {
                const blob = new Blob([content], { type: mimeType });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            } catch (error) {
                console.error('❌ Download failed:', error);
                alert('Download failed: ' + error.message);
            }
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
            if (!dateString) return '';
            
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = now - date;
            
            if (diffTime < 0) return date.toLocaleString();
            
            const diffMinutes = Math.floor(diffTime / (1000 * 60));
            const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffMinutes < 1) return 'Just now';
            if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays} days ago`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? '' : 's'} ago`;
            
            return date.toLocaleDateString();
        }
    }));
});