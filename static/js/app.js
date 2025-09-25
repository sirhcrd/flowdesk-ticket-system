// FlowDesk Professional Application with SQLite Database
document.addEventListener('alpine:init', () => {
    Alpine.data('app', () => ({
        // State
        darkMode: localStorage.getItem('darkMode') === 'true' || false,
        currentView: 'dashboard',
        dbReady: false,
        
        // Data (from SQLite database)
        tickets: [],
        users: [],
        currentUser: null,
        
        // Forms
        newTicket: {
            title: '',
            description: '',
            priority: 'medium',
            assignee: 'Admin',
            tags: ''
        },
        
        // UI State
        showCreateTicket: false,
        showAddUser: false,
        selectedTicket: null,
        showTicketDetail: false,
        
        // Editing state
        editingTitle: false,
        editingDescription: false,
        editingAssignee: false,
        editTitle: '',
        editDescription: '',
        editAssignee: '',
        
        // User management
        newUser: {
            name: '',
            email: '',
            avatar_color: '#3B82F6'
        },
        
        // Avatar color options
        avatarColors: [
            '#3B82F6', // Blue
            '#10B981', // Green  
            '#F59E0B', // Yellow
            '#EF4444', // Red
            '#8B5CF6', // Purple
            '#F97316', // Orange
            '#06B6D4', // Cyan
            '#84CC16', // Lime
            '#EC4899', // Pink
            '#6B7280'  // Gray
        ],
        
        // Initialize
        async init() {
            console.log('🚀 Initializing FlowDesk Pro...');
            
            // Apply theme
            if (this.darkMode) {
                document.documentElement.classList.add('dark');
            }
            
            // Initialize database
            try {
                await window.flowDeskDB.init();
                await this.loadDataFromDatabase();
                this.dbReady = true;
                console.log('✅ FlowDesk Pro initialized successfully!');
            } catch (error) {
                console.error('❌ Failed to initialize database:', error);
                // Fallback to localStorage mode
                this.loadFallbackData();
            }
        },
        
        // Load data from SQLite database
        async loadDataFromDatabase() {
            console.log('📊 Loading data from database...');
            
            // Load users and set current user
            this.users = window.flowDeskDB.getAllUsers();
            const savedUserId = localStorage.getItem('flowdesk_current_user_id');
            if (savedUserId && this.users.find(u => u.id == savedUserId)) {
                this.currentUser = this.users.find(u => u.id == savedUserId);
            } else {
                // Default to first user
                this.currentUser = this.users[0] || null;
                if (this.currentUser) {
                    localStorage.setItem('flowdesk_current_user_id', this.currentUser.id);
                }
            }
            
            // Load tickets
            this.tickets = window.flowDeskDB.getAllTickets();
            
            console.log(`📋 Loaded ${this.tickets.length} tickets and ${this.users.length} users`);
        },
        
        // Fallback data loading (in case database fails)
        loadFallbackData() {
            console.log('⚠️ Using fallback localStorage data...');
            this.users = [{id: 1, name: 'Current User', email: '', avatar_color: '#3B82F6'}];
            this.currentUser = this.users[0];
            this.tickets = [];
        },
        
        // Local Storage Management
        saveToStorage() {
            localStorage.setItem('flowdesk_tickets', JSON.stringify(this.tickets));
            localStorage.setItem('flowdesk_users', JSON.stringify(this.users));
            localStorage.setItem('flowdesk_next_id', this.nextId.toString());
        },
        
        loadSampleData() {
            this.tickets = [
                {
                    id: 1,
                    title: 'Welcome to FlowDesk!',
                    description: 'This is a sample ticket. You can create, edit, and manage tickets locally in your browser. All data is saved locally.',
                    status: 'open',
                    priority: 'medium',
                    assignee: 'Admin',
                    creator: 'System',
                    created_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
                    updated_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                    tags: ['welcome', 'demo'],
                    activities: [
                        {
                            id: 1,
                            description: 'Ticket created by System',
                            timestamp: new Date(Date.now() - 86400000).toISOString() // Yesterday
                        }
                    ]
                },
                {
                    id: 2,
                    title: 'Export Feature Available',
                    description: 'You can export your tickets to Excel or CSV format using the export buttons in the toolbar.',
                    status: 'resolved',
                    priority: 'low',
                    assignee: 'Admin',
                    creator: 'System',
                    created_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
                    updated_at: new Date().toISOString(),
                    tags: ['feature', 'export'],
                    activities: [
                        {
                            id: 1,
                            description: 'Ticket created by System',
                            timestamp: new Date(Date.now() - 86400000).toISOString()
                        },
                        {
                            id: 2,
                            description: 'Status changed from open to resolved',
                            timestamp: new Date().toISOString()
                        }
                    ]
                }
            ];
            this.nextId = 3;
            this.saveToStorage();
        },
        
        // Ticket Management
        async createTicket() {
            if (!this.currentUser) {
                alert('Please select a user first!');
                return;
            }
            
            console.log('🎫 Creating new ticket:', this.newTicket.title);
            
            try {
                // Find assignee user ID
                const assigneeUser = this.users.find(u => u.name === this.newTicket.assignee);
                const assigneeId = assigneeUser ? assigneeUser.id : null;
                
                // Insert ticket
                const result = window.flowDeskDB.exec(`
                    INSERT INTO tickets (title, description, priority, assignee_id, creator_id, kanban_column_id) 
                    VALUES (?, ?, ?, ?, ?, 1)
                `, [
                    this.newTicket.title,
                    this.newTicket.description,
                    this.newTicket.priority,
                    assigneeId,
                    this.currentUser.id
                ]);
                
                if (result) {
                    // Get the new ticket ID
                    const ticketId = window.flowDeskDB.query('SELECT last_insert_rowid() as id').id;
                    
                    // Add tags if any
                    if (this.newTicket.tags) {
                        const tags = this.newTicket.tags.split(',').map(t => t.trim()).filter(t => t);
                        for (const tag of tags) {
                            window.flowDeskDB.exec(
                                'INSERT INTO ticket_tags (ticket_id, tag) VALUES (?, ?)',
                                [ticketId, tag]
                            );
                        }
                    }
                    
                    // Add creation activity
                    window.flowDeskDB.exec(`
                        INSERT INTO activities (ticket_id, user_id, action_type, description)
                        VALUES (?, ?, 'created', ?)
                    `, [ticketId, this.currentUser.id, `Ticket created by ${this.currentUser.name}`]);
                    
                    // Reload tickets
                    this.tickets = window.flowDeskDB.getAllTickets();
                    
                    this.resetNewTicketForm();
                    this.showCreateTicket = false;
                    
                    console.log('✅ Ticket created successfully!');
                } else {
                    alert('Failed to create ticket. Please try again.');
                }
            } catch (error) {
                console.error('❌ Error creating ticket:', error);
                alert('Error creating ticket: ' + error.message);
            }
        },
        
        updateTicketStatus(ticketId, newStatus) {
            console.log('🔄 STATUS UPDATE CALLED - Ticket ID:', ticketId, 'New Status:', newStatus);
            const ticket = this.tickets.find(t => t.id === ticketId);
            console.log('🎫 Found ticket:', ticket);
            if (ticket) {
                console.log('📊 Current status:', ticket.status, 'vs New status:', newStatus);
                if (ticket.status !== newStatus) {
                    const oldStatus = ticket.status;
                    ticket.status = newStatus;
                    console.log('✅ Status changed from:', oldStatus, 'to:', newStatus);
                    this.addActivity(ticketId, `Status changed from ${oldStatus.replace('_', ' ')} to ${newStatus.replace('_', ' ')}`);
                } else {
                    console.log('⚠️ No change needed - same status');
                }
            } else {
                console.log('❌ Ticket not found for ID:', ticketId);
            }
        },
        
        deleteTicket(ticketId) {
            if (confirm('Are you sure you want to delete this ticket?')) {
                this.tickets = this.tickets.filter(t => t.id !== ticketId);
                this.saveToStorage();
            }
        },
        
        viewTicket(ticket) {
            this.selectedTicket = ticket;
            this.showTicketDetail = true;
            // Reset editing states
            this.editingTitle = false;
            this.editingDescription = false;
            this.editingAssignee = false;
        },
        
        resetNewTicketForm() {
            this.newTicket = {
                title: '',
                description: '',
                priority: 'medium',
                assignee: this.currentUser?.name || '',
                tags: ''
            };
        },
        
        // User Management
        selectUser(user) {
            console.log('👤 Switching to user:', user.name);
            this.currentUser = user;
            localStorage.setItem('flowdesk_current_user_id', user.id);
        },
        
        async addNewUser() {
            if (!this.newUser.name.trim()) return;
            
            console.log('➕ Adding new user:', this.newUser.name);
            
            // Check if user already exists
            const existingUser = this.users.find(u => u.name.toLowerCase() === this.newUser.name.toLowerCase());
            if (existingUser) {
                alert('A user with this name already exists!');
                return;
            }
            
            try {
                // Insert into database
                const success = window.flowDeskDB.exec(
                    'INSERT INTO users (name, email, avatar_color) VALUES (?, ?, ?)',
                    [this.newUser.name.trim(), this.newUser.email.trim(), this.newUser.avatar_color]
                );
                
                if (success) {
                    // Reload users from database
                    this.users = window.flowDeskDB.getAllUsers();
                    
                    // Find and select the new user
                    const newUser = this.users.find(u => u.name === this.newUser.name.trim());
                    if (newUser) {
                        this.selectUser(newUser);
                    }
                    
                    // Reset form
                    this.newUser = {
                        name: '',
                        email: '',
                        avatar_color: '#3B82F6'
                    };
                    
                    this.showAddUser = false;
                    console.log('✅ User added successfully!');
                } else {
                    alert('Failed to add user. Please try again.');
                }
            } catch (error) {
                console.error('❌ Error adding user:', error);
                alert('Error adding user: ' + error.message);
            }
        },
        
        // Activity logging
        addActivity(ticketId, description) {
            console.log('Adding activity:', description, 'to ticket:', ticketId);
            const ticket = this.tickets.find(t => t.id === ticketId);
            if (ticket) {
                if (!ticket.activities) {
                    ticket.activities = [];
                }
                
                const activityId = (ticket.activities.length > 0) 
                    ? Math.max(...ticket.activities.map(a => a.id)) + 1 
                    : 1;
                
                const newActivity = {
                    id: activityId,
                    description: description,
                    timestamp: new Date().toISOString()
                };
                
                ticket.activities.push(newActivity);
                
                // Sort activities by timestamp (newest first)
                ticket.activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                
                ticket.updated_at = new Date().toISOString();
                
                // Update selectedTicket if it's the same ticket
                if (this.selectedTicket && this.selectedTicket.id === ticketId) {
                    this.selectedTicket = ticket; // Force reactivity update
                }
                
                this.saveToStorage();
                console.log('Activity added successfully. Latest activity:', newActivity);
            } else {
                console.error('Ticket not found for ID:', ticketId);
            }
        },
        
        // Title editing
        saveTitle() {
            if (this.editTitle && this.editTitle !== this.selectedTicket.title) {
                const oldTitle = this.selectedTicket.title;
                this.selectedTicket.title = this.editTitle;
                this.addActivity(this.selectedTicket.id, `Title changed from "${oldTitle}" to "${this.editTitle}"`);
            }
            this.editingTitle = false;
        },
        
        // Description editing
        saveDescription() {
            console.log('Saving description. Old:', this.selectedTicket.description, 'New:', this.editDescription);
            if (this.editDescription !== this.selectedTicket.description) {
                const hasOldDescription = this.selectedTicket.description && this.selectedTicket.description.trim();
                const hasNewDescription = this.editDescription && this.editDescription.trim();
                
                let activityDesc = '';
                if (!hasOldDescription && hasNewDescription) {
                    activityDesc = 'Description added';
                } else if (hasOldDescription && !hasNewDescription) {
                    activityDesc = 'Description removed';
                } else if (hasOldDescription && hasNewDescription) {
                    activityDesc = 'Description updated';
                }
                
                this.selectedTicket.description = this.editDescription;
                if (activityDesc) {
                    console.log('Adding activity:', activityDesc);
                    this.addActivity(this.selectedTicket.id, activityDesc);
                }
            } else {
                console.log('No description change detected');
            }
            this.editingDescription = false;
        },
        
        // Priority editing
        updateTicketPriority(ticketId, newPriority) {
            console.log('🔄 PRIORITY UPDATE CALLED - Ticket ID:', ticketId, 'New Priority:', newPriority);
            const ticket = this.tickets.find(t => t.id === ticketId);
            console.log('🎫 Found ticket:', ticket);
            if (ticket) {
                console.log('📊 Current priority:', ticket.priority, 'vs New priority:', newPriority);
                if (ticket.priority !== newPriority) {
                    const oldPriority = ticket.priority;
                    ticket.priority = newPriority;
                    console.log('✅ Priority changed from:', oldPriority, 'to:', newPriority);
                    this.addActivity(ticketId, `Priority changed from ${oldPriority} to ${newPriority}`);
                } else {
                    console.log('⚠️ No change needed - same priority');
                }
            } else {
                console.log('❌ Ticket not found for ID:', ticketId);
            }
        },
        
        // Assignee editing
        saveAssignee() {
            const newAssignee = this.editAssignee.trim();
            const currentAssignee = this.selectedTicket.assignee || '';
            
            if (newAssignee !== currentAssignee) {
                const oldAssignee = currentAssignee || 'Unassigned';
                const newAssigneeDisplay = newAssignee || 'Unassigned';
                
                this.selectedTicket.assignee = newAssignee;
                this.addActivity(this.selectedTicket.id, `Assignee changed from ${oldAssignee} to ${newAssigneeDisplay}`);
            }
            this.editingAssignee = false;
        },
        
        // Statistics
        get stats() {
            return {
                total: this.tickets.length,
                open: this.tickets.filter(t => t.status === 'open').length,
                in_progress: this.tickets.filter(t => t.status === 'in_progress').length,
                resolved: this.tickets.filter(t => t.status === 'resolved').length,
                closed: this.tickets.filter(t => t.status === 'closed').length
            };
        },
        
        get recentTickets() {
            return this.tickets.slice(0, 5);
        },
        
        // Export Functions
        exportToCSV() {
            const headers = ['ID', 'Title', 'Description', 'Status', 'Priority', 'Assignee', 'Creator', 'Created', 'Updated', 'Tags'];
            const csvContent = [
                headers.join(','),
                ...this.tickets.map(ticket => [
                    ticket.id,
                    `"${ticket.title}"`,
                    `"${ticket.description}"`,
                    ticket.status,
                    ticket.priority,
                    ticket.assignee,
                    ticket.creator,
                    new Date(ticket.created_at).toLocaleDateString(),
                    new Date(ticket.updated_at).toLocaleDateString(),
                    `"${ticket.tags ? ticket.tags.join(', ') : ''}"`
                ].join(','))
            ].join('\\n');
            
            this.downloadFile(csvContent, 'flowdesk-tickets.csv', 'text/csv');
        },
        
        exportToExcel() {
            // Create HTML table for Excel
            const table = `
                <table>
                    <tr>
                        <th>ID</th><th>Title</th><th>Description</th><th>Status</th><th>Priority</th>
                        <th>Assignee</th><th>Creator</th><th>Created</th><th>Updated</th><th>Tags</th>
                    </tr>
                    ${this.tickets.map(ticket => `
                        <tr>
                            <td>${ticket.id}</td>
                            <td>${ticket.title}</td>
                            <td>${ticket.description}</td>
                            <td>${ticket.status}</td>
                            <td>${ticket.priority}</td>
                            <td>${ticket.assignee}</td>
                            <td>${ticket.creator}</td>
                            <td>${new Date(ticket.created_at).toLocaleDateString()}</td>
                            <td>${new Date(ticket.updated_at).toLocaleDateString()}</td>
                            <td>${ticket.tags ? ticket.tags.join(', ') : ''}</td>
                        </tr>
                    `).join('')}
                </table>
            `;
            
            this.downloadFile(table, 'flowdesk-tickets.xls', 'application/vnd.ms-excel');
        },
        
        downloadFile(content, filename, mimeType) {
            const blob = new Blob([content], { type: mimeType });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
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
            const diffTime = now - date; // Remove Math.abs to handle future dates
            
            // Handle future dates
            if (diffTime < 0) {
                return date.toLocaleString();
            }
            
            const diffMinutes = Math.floor(diffTime / (1000 * 60));
            const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffMinutes < 1) {
                return 'Just now';
            } else if (diffMinutes < 60) {
                return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
            } else if (diffHours < 24) {
                return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
            } else if (diffDays === 1) {
                return 'Yesterday';
            } else if (diffDays < 7) {
                return `${diffDays} days ago`;
            } else if (diffDays < 30) {
                return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? '' : 's'} ago`;
            } else {
                return date.toLocaleDateString();
            }
        }
    }));
});