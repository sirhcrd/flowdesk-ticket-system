// FlowDesk Frontend-Only Application with Local Storage
document.addEventListener('alpine:init', () => {
    Alpine.data('app', () => ({
        // State
        darkMode: localStorage.getItem('darkMode') === 'true' || false,
        currentView: 'dashboard',
        
        // Data (stored locally)
        tickets: JSON.parse(localStorage.getItem('flowdesk_tickets') || '[]'),
        users: JSON.parse(localStorage.getItem('flowdesk_users') || '[{"id":1,"name":"Admin","email":"admin@flowdesk.com"}]'),
        nextId: parseInt(localStorage.getItem('flowdesk_next_id') || '1'),
        
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
        selectedTicket: null,
        showTicketDetail: false,
        
        // Editing state
        editingTitle: false,
        editingDescription: false,
        editingAssignee: false,
        editTitle: '',
        editDescription: '',
        editAssignee: '',
        
        // Initialize
        init() {
            // Load sample data if first time
            if (this.tickets.length === 0) {
                this.loadSampleData();
            }
            
            // Apply theme
            if (this.darkMode) {
                document.documentElement.classList.add('dark');
            }
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
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    tags: ['welcome', 'demo'],
                    activities: [
                        {
                            id: 1,
                            description: 'Ticket created by System',
                            timestamp: new Date().toISOString()
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
        createTicket() {
            const ticket = {
                id: this.nextId++,
                title: this.newTicket.title,
                description: this.newTicket.description,
                status: 'open',
                priority: this.newTicket.priority,
                assignee: this.newTicket.assignee,
                creator: 'Current User',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                tags: this.newTicket.tags ? this.newTicket.tags.split(',').map(t => t.trim()) : [],
                activities: [
                    {
                        id: 1,
                        description: 'Ticket created by Current User',
                        timestamp: new Date().toISOString()
                    }
                ]
            };
            
            this.tickets.unshift(ticket);
            this.saveToStorage();
            this.resetNewTicketForm();
            this.showCreateTicket = false;
        },
        
        updateTicketStatus(ticketId, newStatus) {
            console.log('Updating status for ticket:', ticketId, 'to:', newStatus);
            const ticket = this.tickets.find(t => t.id === ticketId);
            if (ticket && ticket.status !== newStatus) {
                const oldStatus = ticket.status;
                ticket.status = newStatus;
                console.log('Status changed from:', oldStatus, 'to:', newStatus);
                this.addActivity(ticketId, `Status changed from ${oldStatus.replace('_', ' ')} to ${newStatus.replace('_', ' ')}`);
            } else {
                console.log('No status change needed or ticket not found');
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
                assignee: 'Admin',
                tags: ''
            };
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
            console.log('Updating priority for ticket:', ticketId, 'to:', newPriority);
            const ticket = this.tickets.find(t => t.id === ticketId);
            if (ticket && ticket.priority !== newPriority) {
                const oldPriority = ticket.priority;
                ticket.priority = newPriority;
                console.log('Priority changed from:', oldPriority, 'to:', newPriority);
                this.addActivity(ticketId, `Priority changed from ${oldPriority} to ${newPriority}`);
            } else {
                console.log('No priority change needed or ticket not found');
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