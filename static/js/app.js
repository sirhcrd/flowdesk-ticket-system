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
        kanbanColumns: [],
        
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
        
        // Column management
        newColumn: {
            name: '',
            color: '#6B7280'
        },
        
        columnColors: [
            '#6B7280', // Gray
            '#3B82F6', // Blue
            '#10B981', // Green
            '#F59E0B', // Yellow
            '#EF4444', // Red
            '#8B5CF6', // Purple
            '#F97316', // Orange
            '#06B6D4', // Cyan
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
            
            // Load tickets and kanban columns
            this.tickets = window.flowDeskDB.getAllTickets();
            this.kanbanColumns = window.flowDeskDB.getKanbanColumns();
            
            console.log(`📋 Loaded ${this.tickets.length} tickets, ${this.users.length} users, and ${this.kanbanColumns.length} kanban columns`);
        },
        
        // Fallback data loading (in case database fails)
        loadFallbackData() {
            console.log('⚠️ Using fallback localStorage data...');
            this.users = [{id: 1, name: 'Current User', email: '', avatar_color: '#3B82F6'}];
            this.currentUser = this.users[0];
            this.tickets = [];
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
        
        async updateTicketStatus(ticketId, newStatus) {
            console.log('🔄 STATUS UPDATE CALLED - Ticket ID:', ticketId, 'New Status:', newStatus);
            
            try {
                // Get current ticket from database
                const currentTicket = window.flowDeskDB.getTicketById(ticketId);
                if (!currentTicket) {
                    console.log('❌ Ticket not found for ID:', ticketId);
                    return;
                }
                
                console.log('📊 Current status:', currentTicket.status, 'vs New status:', newStatus);
                
                if (currentTicket.status !== newStatus) {
                    const oldStatus = currentTicket.status;
                    
                    // Update in database
                    const success = window.flowDeskDB.exec(
                        'UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                        [newStatus, ticketId]
                    );
                    
                    if (success) {
                        // Add activity log
                        window.flowDeskDB.exec(`
                            INSERT INTO activities (ticket_id, user_id, action_type, description)
                            VALUES (?, ?, 'status_changed', ?)
                        `, [ticketId, this.currentUser?.id, `Status changed from ${oldStatus.replace('_', ' ')} to ${newStatus.replace('_', ' ')}`]);
                        
                        // Reload tickets to reflect changes
                        this.tickets = window.flowDeskDB.getAllTickets();
                        
                        // Update selectedTicket if it's the same ticket
                        if (this.selectedTicket && this.selectedTicket.id === ticketId) {
                            this.selectedTicket = window.flowDeskDB.getTicketById(ticketId);
                        }
                        
                        console.log('✅ Status updated successfully!');
                    } else {
                        console.log('❌ Failed to update status in database');
                    }
                } else {
                    console.log('⚠️ No change needed - same status');
                }
            } catch (error) {
                console.error('❌ Error updating status:', error);
            }
        },
        
        async deleteTicket(ticketId) {
            if (confirm('Are you sure you want to delete this ticket?')) {
                try {
                    const success = window.flowDeskDB.exec('DELETE FROM tickets WHERE id = ?', [ticketId]);
                    if (success) {
                        this.tickets = window.flowDeskDB.getAllTickets();
                        console.log('✅ Ticket deleted successfully!');
                    }
                } catch (error) {
                    console.error('❌ Error deleting ticket:', error);
                }
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
        

        
        // Title editing
        async saveTitle() {
            if (this.editTitle && this.editTitle !== this.selectedTicket.title) {
                const oldTitle = this.selectedTicket.title;
                
                try {
                    // Update in database
                    const success = window.flowDeskDB.exec(
                        'UPDATE tickets SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                        [this.editTitle, this.selectedTicket.id]
                    );
                    
                    if (success) {
                        // Add activity log
                        window.flowDeskDB.exec(`
                            INSERT INTO activities (ticket_id, user_id, action_type, description)
                            VALUES (?, ?, 'title_changed', ?)
                        `, [this.selectedTicket.id, this.currentUser?.id, `Title changed from "${oldTitle}" to "${this.editTitle}"`]);
                        
                        // Update local data
                        this.selectedTicket.title = this.editTitle;
                        this.tickets = window.flowDeskDB.getAllTickets();
                        
                        console.log('✅ Title updated successfully!');
                    }
                } catch (error) {
                    console.error('❌ Error updating title:', error);
                }
            }
            this.editingTitle = false;
        },
        
        // Description editing
        async saveDescription() {
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
                
                try {
                    // Update in database
                    const success = window.flowDeskDB.exec(
                        'UPDATE tickets SET description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                        [this.editDescription, this.selectedTicket.id]
                    );
                    
                    if (success && activityDesc) {
                        // Add activity log
                        window.flowDeskDB.exec(`
                            INSERT INTO activities (ticket_id, user_id, action_type, description)
                            VALUES (?, ?, 'description_changed', ?)
                        `, [this.selectedTicket.id, this.currentUser?.id, activityDesc]);
                        
                        // Update local data
                        this.selectedTicket.description = this.editDescription;
                        this.tickets = window.flowDeskDB.getAllTickets();
                        
                        console.log('✅ Description updated successfully!');
                    }
                } catch (error) {
                    console.error('❌ Error updating description:', error);
                }
            } else {
                console.log('No description change detected');
            }
            this.editingDescription = false;
        },
        
        // Priority editing
        async updateTicketPriority(ticketId, newPriority) {
            console.log('🔄 PRIORITY UPDATE CALLED - Ticket ID:', ticketId, 'New Priority:', newPriority);
            
            try {
                // Get current ticket from database
                const currentTicket = window.flowDeskDB.getTicketById(ticketId);
                if (!currentTicket) {
                    console.log('❌ Ticket not found for ID:', ticketId);
                    return;
                }
                
                console.log('📊 Current priority:', currentTicket.priority, 'vs New priority:', newPriority);
                
                if (currentTicket.priority !== newPriority) {
                    const oldPriority = currentTicket.priority;
                    
                    // Update in database
                    const success = window.flowDeskDB.exec(
                        'UPDATE tickets SET priority = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                        [newPriority, ticketId]
                    );
                    
                    if (success) {
                        // Add activity log
                        window.flowDeskDB.exec(`
                            INSERT INTO activities (ticket_id, user_id, action_type, description)
                            VALUES (?, ?, 'priority_changed', ?)
                        `, [ticketId, this.currentUser?.id, `Priority changed from ${oldPriority} to ${newPriority}`]);
                        
                        // Reload tickets to reflect changes
                        this.tickets = window.flowDeskDB.getAllTickets();
                        
                        // Update selectedTicket if it's the same ticket
                        if (this.selectedTicket && this.selectedTicket.id === ticketId) {
                            this.selectedTicket = window.flowDeskDB.getTicketById(ticketId);
                        }
                        
                        console.log('✅ Priority updated successfully!');
                    } else {
                        console.log('❌ Failed to update priority in database');
                    }
                } else {
                    console.log('⚠️ No change needed - same priority');
                }
            } catch (error) {
                console.error('❌ Error updating priority:', error);
            }
        },
        
        // Assignee editing
        async saveAssignee() {
            const newAssigneeName = this.editAssignee.trim();
            const currentAssigneeName = this.selectedTicket.assignee_name || '';
            
            if (newAssigneeName !== currentAssigneeName) {
                try {
                    // Find assignee user ID
                    const assigneeUser = this.users.find(u => u.name === newAssigneeName);
                    const assigneeId = assigneeUser ? assigneeUser.id : null;
                    
                    // Update in database
                    const success = window.flowDeskDB.exec(
                        'UPDATE tickets SET assignee_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                        [assigneeId, this.selectedTicket.id]
                    );
                    
                    if (success) {
                        const oldAssignee = currentAssigneeName || 'Unassigned';
                        const newAssigneeDisplay = newAssigneeName || 'Unassigned';
                        
                        // Add activity log
                        window.flowDeskDB.exec(`
                            INSERT INTO activities (ticket_id, user_id, action_type, description)
                            VALUES (?, ?, 'assignee_changed', ?)
                        `, [this.selectedTicket.id, this.currentUser?.id, `Assignee changed from ${oldAssignee} to ${newAssigneeDisplay}`]);
                        
                        // Reload ticket data
                        this.selectedTicket = window.flowDeskDB.getTicketById(this.selectedTicket.id);
                        this.tickets = window.flowDeskDB.getAllTickets();
                        
                        console.log('✅ Assignee updated successfully!');
                    }
                } catch (error) {
                    console.error('❌ Error updating assignee:', error);
                }
            }
            this.editingAssignee = false;
        },
        
        // Save all changes to ticket
        async saveTicket() {
            if (!this.selectedTicket) return;
            
            console.log('💾 Saving all ticket changes...');
            
            try {
                // Save any pending edits
                if (this.editingTitle) {
                    await this.saveTitle();
                }
                if (this.editingDescription) {
                    await this.saveDescription();
                }
                if (this.editingAssignee) {
                    await this.saveAssignee();
                }
                
                // Reload the ticket to get fresh data including activities
                this.selectedTicket = window.flowDeskDB.getTicketById(this.selectedTicket.id);
                this.tickets = window.flowDeskDB.getAllTickets();
                
                // Visual feedback
                const button = document.querySelector('.bg-green-600');
                if (button) {
                    const originalText = button.textContent;
                    button.textContent = '✅ Saved!';
                    button.classList.remove('bg-green-600', 'hover:bg-green-700');
                    button.classList.add('bg-green-500');
                    
                    setTimeout(() => {
                        button.textContent = originalText;
                        button.classList.remove('bg-green-500');
                        button.classList.add('bg-green-600', 'hover:bg-green-700');
                    }, 1500);
                }
                
                console.log('✅ All changes saved successfully!');
            } catch (error) {
                console.error('❌ Error saving ticket:', error);
                alert('Error saving changes: ' + error.message);
            }
        },
        
        // Kanban Board Functions
        getColumnTickets(columnId) {
            return this.tickets.filter(ticket => ticket.kanban_column_id === columnId)
                             .sort((a, b) => (a.kanban_position || 0) - (b.kanban_position || 0));
        },
        
        getColumnTicketCount(columnId) {
            return this.getColumnTickets(columnId).length;
        },
        
        async addColumn() {
            if (!this.newColumn.name.trim()) return;
            
            console.log('➕ Adding new column:', this.newColumn.name);
            
            try {
                // Get max position
                const maxPosition = Math.max(...this.kanbanColumns.map(c => c.position), -1);
                
                const success = window.flowDeskDB.exec(
                    'INSERT INTO kanban_columns (name, position, color) VALUES (?, ?, ?)',
                    [this.newColumn.name.trim(), maxPosition + 1, this.newColumn.color]
                );
                
                if (success) {
                    this.kanbanColumns = window.flowDeskDB.getKanbanColumns();
                    this.newColumn = { name: '', color: '#6B7280' };
                    this.showAddColumn = false;
                    console.log('✅ Column added successfully!');
                } else {
                    alert('Failed to add column. Please try again.');
                }
            } catch (error) {
                console.error('❌ Error adding column:', error);
                alert('Error adding column: ' + error.message);
            }
        },
        
        async updateColumnName(columnId, newName) {
            if (!newName.trim()) return;
            
            try {
                const success = window.flowDeskDB.exec(
                    'UPDATE kanban_columns SET name = ? WHERE id = ?',
                    [newName.trim(), columnId]
                );
                
                if (success) {
                    this.kanbanColumns = window.flowDeskDB.getKanbanColumns();
                    console.log('✅ Column name updated!');
                }
            } catch (error) {
                console.error('❌ Error updating column name:', error);
            }
        },
        
        async deleteColumn(columnId) {
            const column = this.kanbanColumns.find(c => c.id === columnId);
            const ticketCount = this.getColumnTicketCount(columnId);
            
            if (ticketCount > 0) {
                if (!confirm(`This column contains ${ticketCount} ticket(s). Are you sure you want to delete it? The tickets will be moved to the first column.`)) {
                    return;
                }
            } else if (!confirm(`Are you sure you want to delete the "${column?.name}" column?`)) {
                return;
            }
            
            try {
                // Move tickets to first column
                if (ticketCount > 0) {
                    const firstColumn = this.kanbanColumns.find(c => c.position === 0);
                    if (firstColumn) {
                        window.flowDeskDB.exec(
                            'UPDATE tickets SET kanban_column_id = ? WHERE kanban_column_id = ?',
                            [firstColumn.id, columnId]
                        );
                    }
                }
                
                // Delete column
                const success = window.flowDeskDB.exec('DELETE FROM kanban_columns WHERE id = ?', [columnId]);
                
                if (success) {
                    this.kanbanColumns = window.flowDeskDB.getKanbanColumns();
                    this.tickets = window.flowDeskDB.getAllTickets();
                    console.log('✅ Column deleted successfully!');
                }
            } catch (error) {
                console.error('❌ Error deleting column:', error);
                alert('Error deleting column: ' + error.message);
            }
        },
        
        async moveColumnUp(index) {
            if (index === 0) return;
            
            const column = this.kanbanColumns[index];
            const prevColumn = this.kanbanColumns[index - 1];
            
            try {
                // Swap positions
                window.flowDeskDB.exec('UPDATE kanban_columns SET position = ? WHERE id = ?', [prevColumn.position, column.id]);
                window.flowDeskDB.exec('UPDATE kanban_columns SET position = ? WHERE id = ?', [column.position, prevColumn.id]);
                
                this.kanbanColumns = window.flowDeskDB.getKanbanColumns();
            } catch (error) {
                console.error('❌ Error moving column:', error);
            }
        },
        
        async moveColumnDown(index) {
            if (index === this.kanbanColumns.length - 1) return;
            
            const column = this.kanbanColumns[index];
            const nextColumn = this.kanbanColumns[index + 1];
            
            try {
                // Swap positions
                window.flowDeskDB.exec('UPDATE kanban_columns SET position = ? WHERE id = ?', [nextColumn.position, column.id]);
                window.flowDeskDB.exec('UPDATE kanban_columns SET position = ? WHERE id = ?', [column.position, nextColumn.id]);
                
                this.kanbanColumns = window.flowDeskDB.getKanbanColumns();
            } catch (error) {
                console.error('❌ Error moving column:', error);
            }
        },
        
        // Initialize SortableJS for drag & drop
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
                    
                    console.log(`🔄 Moving ticket ${ticketId} to column ${newColumnId} at position ${newPosition}`);
                    
                    self.moveTicketToColumn(ticketId, newColumnId, newPosition);
                }
            });
        },
        
        async moveTicketToColumn(ticketId, newColumnId, newPosition) {
            try {
                // Update ticket's column and position
                const success = window.flowDeskDB.exec(`
                    UPDATE tickets 
                    SET kanban_column_id = ?, kanban_position = ?, updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                `, [newColumnId, newPosition, ticketId]);
                
                if (success) {
                    // Add activity log
                    const column = this.kanbanColumns.find(c => c.id === newColumnId);
                    if (column && this.currentUser) {
                        window.flowDeskDB.exec(`
                            INSERT INTO activities (ticket_id, user_id, action_type, description)
                            VALUES (?, ?, 'moved', ?)
                        `, [ticketId, this.currentUser.id, `Ticket moved to ${column.name}`]);
                    }
                    
                    // Reload tickets
                    this.tickets = window.flowDeskDB.getAllTickets();
                    
                    console.log('✅ Ticket moved successfully!');
                } else {
                    console.error('❌ Failed to move ticket');
                    // Reload to reset positions
                    this.tickets = window.flowDeskDB.getAllTickets();
                }
            } catch (error) {
                console.error('❌ Error moving ticket:', error);
                // Reload to reset positions
                this.tickets = window.flowDeskDB.getAllTickets();
            }
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
            console.log('📊 Exporting tickets to CSV...');
            const headers = ['ID', 'Title', 'Description', 'Status', 'Priority', 'Assignee', 'Creator', 'Kanban Column', 'Created', 'Updated', 'Tags'];
            
            const csvContent = [
                headers.join(','),
                ...this.tickets.map(ticket => [
                    ticket.id,
                    `"${ticket.title || ''}"`,
                    `"${(ticket.description || '').replace(/"/g, '""')}"`, // Escape quotes
                    ticket.status || '',
                    ticket.priority || '',
                    `"${ticket.assignee_name || 'Unassigned'}"`,
                    `"${ticket.creator_name || 'Unknown'}"`,
                    `"${ticket.kanban_column_name || 'No Column'}"`,
                    ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : '',
                    ticket.updated_at ? new Date(ticket.updated_at).toLocaleDateString() : '',
                    `"${ticket.tags || ''}"`
                ].join(','))
            ].join('\n');
            
            this.downloadFile(csvContent, `flowdesk-tickets-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
            console.log('✅ CSV export completed!');
        },
        
        exportToExcel() {
            console.log('📊 Exporting tickets to Excel...');
            // Create HTML table for Excel
            const table = `
                <table border="1">
                    <tr style="background-color: #f0f0f0; font-weight: bold;">
                        <th>ID</th><th>Title</th><th>Description</th><th>Status</th><th>Priority</th>
                        <th>Assignee</th><th>Creator</th><th>Kanban Column</th><th>Created</th><th>Updated</th><th>Tags</th>
                    </tr>
                    ${this.tickets.map(ticket => `
                        <tr>
                            <td>${ticket.id}</td>
                            <td>${ticket.title || ''}</td>
                            <td>${(ticket.description || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
                            <td>${ticket.status || ''}</td>
                            <td>${ticket.priority || ''}</td>
                            <td>${ticket.assignee_name || 'Unassigned'}</td>
                            <td>${ticket.creator_name || 'Unknown'}</td>
                            <td>${ticket.kanban_column_name || 'No Column'}</td>
                            <td>${ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : ''}</td>
                            <td>${ticket.updated_at ? new Date(ticket.updated_at).toLocaleDateString() : ''}</td>
                            <td>${ticket.tags || ''}</td>
                        </tr>
                    `).join('')}
                </table>
            `;
            
            this.downloadFile(table, `flowdesk-tickets-${new Date().toISOString().split('T')[0]}.xls`, 'application/vnd.ms-excel');
            console.log('✅ Excel export completed!');
        },
        
        exportToJSON() {
            console.log('📊 Exporting tickets to JSON...');
            
            const exportData = {
                exportDate: new Date().toISOString(),
                version: '2.0',
                system: 'FlowDesk Pro with SQLite',
                totalTickets: this.tickets.length,
                users: this.users.map(user => ({
                    id: user.id,
                    name: user.name,
                    email: user.email || '',
                    avatar_color: user.avatar_color
                })),
                kanbanColumns: this.kanbanColumns.map(col => ({
                    id: col.id,
                    name: col.name,
                    color: col.color,
                    position: col.position
                })),
                tickets: this.tickets.map(ticket => ({
                    id: ticket.id,
                    title: ticket.title,
                    description: ticket.description,
                    status: ticket.status,
                    priority: ticket.priority,
                    assignee: {
                        id: ticket.assignee_id,
                        name: ticket.assignee_name
                    },
                    creator: {
                        id: ticket.creator_id,
                        name: ticket.creator_name
                    },
                    kanbanColumn: {
                        id: ticket.kanban_column_id,
                        name: ticket.kanban_column_name,
                        position: ticket.kanban_position
                    },
                    dates: {
                        created: ticket.created_at,
                        updated: ticket.updated_at
                    },
                    tags: ticket.tags ? ticket.tags.split(',').map(t => t.trim()) : [],
                    activities: ticket.activities || []
                }))
            };
            
            const jsonContent = JSON.stringify(exportData, null, 2);
            this.downloadFile(jsonContent, `flowdesk-export-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
            console.log('✅ JSON export completed!');
        },
        
        // Export SQLite database file
        exportDatabase() {
            console.log('📊 Exporting SQLite database...');
            try {
                window.flowDeskDB.exportDatabase();
                console.log('✅ Database export completed!');
            } catch (error) {
                console.error('❌ Database export failed:', error);
                alert('Failed to export database: ' + error.message);
            }
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