// FlowDesk Collaborative - GitHub JSON Database
document.addEventListener('alpine:init', () => {
    Alpine.data('app', () => ({
        // State
        darkMode: localStorage.getItem('darkMode') === 'true' || false,
        currentView: 'dashboard',
        dbReady: false,
        loading: false,
        
        // Data
        tickets: [],
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
            console.log('🚀 Initializing FlowDesk Collaborative...');
            
            // Apply theme
            if (this.darkMode) {
                document.documentElement.classList.add('dark');
            }
            
            try {
                this.loading = true;
                await window.githubDB.init();
                await this.loadDataFromGitHub();
                this.dbReady = true;
                console.log('✅ FlowDesk Collaborative ready!');
            } catch (error) {
                console.error('❌ Failed to initialize:', error);
                alert('Failed to connect to GitHub database. Please check your internet connection.');
            } finally {
                this.loading = false;
            }
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
            } finally {
                this.loading = false;
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
                alert('Failed to add user: ' + error.message);
            } finally {
                this.loading = false;
            }
        },

        // Ticket Management
        async createTicket() {
            if (!this.currentUser) {
                alert('Please select a user first!');
                return;
            }
            
            if (!this.newTicket.title.trim()) return;
            
            try {
                this.loading = true;
                
                const ticketData = {
                    title: this.newTicket.title.trim(),
                    description: this.newTicket.description.trim(),
                    status: 'open',
                    priority: this.newTicket.priority,
                    assignee_id: this.newTicket.assignee_id || this.currentUser.id,
                    creator_id: this.currentUser.id,
                    kanban_column_id: this.kanbanColumns[0]?.id || 1,
                    kanban_position: 0,
                    tags: this.newTicket.tags ? this.newTicket.tags.split(',').map(t => t.trim()) : []
                };
                
                await window.githubDB.createTicket(ticketData);
                await this.loadDataFromGitHub();
                
                this.resetNewTicketForm();
                this.showCreateTicket = false;
                
                console.log('✅ Ticket created successfully!');
            } catch (error) {
                console.error('❌ Error creating ticket:', error);
                alert('Failed to create ticket: ' + error.message);
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
                
                await this.loadDataFromGitHub();
                console.log('✅ Ticket moved successfully!');
            } catch (error) {
                console.error('❌ Error moving ticket:', error);
                // Reload to reset positions
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
            
            this.downloadFile(csvContent, `flowdesk-tickets-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
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
            this.downloadFile(jsonContent, `flowdesk-export-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
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