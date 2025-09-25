// FlowDesk Hybrid Database - localStorage + Optional GitHub Sync
class HybridDatabase {
    constructor() {
        this.storagePrefix = 'flowdesk_';
        this.githubRepo = 'sirhcrd/flowdesk-ticket-system';
        this.githubBranch = 'main';
        this.dataPath = 'data';
        
        // Initialize default data if not exists
        this.initializeDefaultData();
    }

    // ============================================================
    // LOCALSTORAGE METHODS (PRIMARY STORAGE)
    // ============================================================

    initializeDefaultData() {
        // Initialize users if not exists
        if (!this.getStorageItem('users')) {
            const defaultUsers = [
                {
                    id: 1,
                    name: 'Admin User',
                    email: 'admin@flowdesk.com',
                    avatar_color: '#3B82F6',
                    created_at: new Date().toISOString()
                },
                {
                    id: 2,
                    name: 'John Doe',
                    email: 'john@flowdesk.com',
                    avatar_color: '#10B981',
                    created_at: new Date().toISOString()
                },
                {
                    id: 3,
                    name: 'Jane Smith',
                    email: 'jane@flowdesk.com',
                    avatar_color: '#F59E0B',
                    created_at: new Date().toISOString()
                }
            ];
            this.setStorageItem('users', defaultUsers);
        }

        // Initialize kanban columns if not exists
        if (!this.getStorageItem('columns')) {
            const defaultColumns = [
                { id: 1, name: 'Backlog', color: '#6B7280', position: 0 },
                { id: 2, name: 'To Do', color: '#3B82F6', position: 1 },
                { id: 3, name: 'In Progress', color: '#F59E0B', position: 2 },
                { id: 4, name: 'Review', color: '#8B5CF6', position: 3 },
                { id: 5, name: 'Done', color: '#10B981', position: 4 }
            ];
            this.setStorageItem('columns', defaultColumns);
        }

        // Initialize tickets if not exists
        if (!this.getStorageItem('tickets')) {
            const defaultTickets = [
                {
                    id: 1,
                    title: 'Welcome to FlowDesk!',
                    description: 'This is your first ticket. You can edit, move, and manage tickets using the interface. Try dragging this ticket to different columns!',
                    status: 'open',
                    priority: 'medium',
                    assignee_id: 1,
                    creator_id: 1,
                    kanban_column_id: 1,
                    kanban_position: 0,
                    tags: ['welcome', 'getting-started'],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                {
                    id: 2,
                    title: 'Set up your team',
                    description: 'Add team members by clicking the user dropdown and selecting "Add New User". Each team member can have their own avatar color.',
                    status: 'open',
                    priority: 'high',
                    assignee_id: 2,
                    creator_id: 1,
                    kanban_column_id: 2,
                    kanban_position: 0,
                    tags: ['setup', 'team'],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                {
                    id: 3,
                    title: 'Customize your workflow',
                    description: 'Use the "Manage Columns" button to add, remove, or reorder kanban columns to match your team\'s workflow.',
                    status: 'in_progress',
                    priority: 'medium',
                    assignee_id: 3,
                    creator_id: 1,
                    kanban_column_id: 3,
                    kanban_position: 0,
                    tags: ['customization', 'workflow'],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            ];
            this.setStorageItem('tickets', defaultTickets);
        }

        // Initialize activities if not exists
        if (!this.getStorageItem('activities')) {
            this.setStorageItem('activities', []);
        }

        // Initialize counters if not exists
        if (!this.getStorageItem('counters')) {
            this.setStorageItem('counters', {
                users: 3,
                tickets: 3,
                columns: 5,
                activities: 0
            });
        }
    }

    getStorageItem(key) {
        try {
            const item = localStorage.getItem(this.storagePrefix + key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error(`Error reading ${key} from localStorage:`, error);
            return null;
        }
    }

    setStorageItem(key, value) {
        try {
            localStorage.setItem(this.storagePrefix + key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error writing ${key} to localStorage:`, error);
            return false;
        }
    }

    getNextId(type) {
        const counters = this.getStorageItem('counters') || {};
        counters[type] = (counters[type] || 0) + 1;
        this.setStorageItem('counters', counters);
        return counters[type];
    }

    // ============================================================
    // USER METHODS
    // ============================================================

    getAllUsers() {
        return this.getStorageItem('users') || [];
    }

    getUserById(id) {
        const users = this.getAllUsers();
        return users.find(user => user.id == id);
    }

    async createUser(userData) {
        const users = this.getAllUsers();
        const newUser = {
            id: this.getNextId('users'),
            name: userData.name,
            email: userData.email || '',
            avatar_color: userData.avatar_color || '#3B82F6',
            created_at: new Date().toISOString()
        };
        
        users.push(newUser);
        this.setStorageItem('users', users);
        return newUser;
    }

    // ============================================================
    // TICKET METHODS
    // ============================================================

    getAllTickets() {
        const tickets = this.getStorageItem('tickets') || [];
        const users = this.getAllUsers();
        const columns = this.getKanbanColumns();
        
        // Enrich tickets with user and column names
        return tickets.map(ticket => ({
            ...ticket,
            assignee_name: users.find(u => u.id == ticket.assignee_id)?.name || 'Unassigned',
            creator_name: users.find(u => u.id == ticket.creator_id)?.name || 'Unknown',
            kanban_column_name: columns.find(c => c.id == ticket.kanban_column_id)?.name || 'No Column'
        }));
    }

    getTicketById(id) {
        const tickets = this.getAllTickets();
        return tickets.find(ticket => ticket.id == id);
    }

    async createTicket(ticketData) {
        const tickets = this.getStorageItem('tickets') || [];
        const newTicket = {
            id: this.getNextId('tickets'),
            title: ticketData.title,
            description: ticketData.description || '',
            status: ticketData.status || 'open',
            priority: ticketData.priority || 'medium',
            assignee_id: ticketData.assignee_id,
            creator_id: ticketData.creator_id,
            kanban_column_id: ticketData.kanban_column_id || 1,
            kanban_position: ticketData.kanban_position || 0,
            tags: Array.isArray(ticketData.tags) ? ticketData.tags : [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        tickets.push(newTicket);
        this.setStorageItem('tickets', tickets);
        
        // Add activity
        await this.addActivity(newTicket.id, ticketData.creator_id, 'created', 'Ticket created');
        
        return newTicket;
    }

    async updateTicket(ticketId, updates) {
        const tickets = this.getStorageItem('tickets') || [];
        const ticketIndex = tickets.findIndex(t => t.id == ticketId);
        
        if (ticketIndex === -1) {
            throw new Error('Ticket not found');
        }
        
        tickets[ticketIndex] = {
            ...tickets[ticketIndex],
            ...updates,
            updated_at: new Date().toISOString()
        };
        
        this.setStorageItem('tickets', tickets);
        
        // Add activity if there's an updated_by field
        if (updates.updated_by) {
            const changes = Object.keys(updates).filter(key => key !== 'updated_by');
            if (changes.length > 0) {
                await this.addActivity(ticketId, updates.updated_by, 'updated', `Updated: ${changes.join(', ')}`);
            }
        }
        
        return tickets[ticketIndex];
    }

    async deleteTicket(ticketId) {
        let tickets = this.getStorageItem('tickets') || [];
        tickets = tickets.filter(t => t.id != ticketId);
        this.setStorageItem('tickets', tickets);
        
        // Remove activities for this ticket
        let activities = this.getStorageItem('activities') || [];
        activities = activities.filter(a => a.ticket_id != ticketId);
        this.setStorageItem('activities', activities);
        
        return true;
    }

    // ============================================================
    // KANBAN METHODS
    // ============================================================

    getKanbanColumns() {
        return this.getStorageItem('columns') || [];
    }

    async createColumn(columnData) {
        const columns = this.getKanbanColumns();
        const newColumn = {
            id: this.getNextId('columns'),
            name: columnData.name,
            color: columnData.color || '#6B7280',
            position: columns.length
        };
        
        columns.push(newColumn);
        this.setStorageItem('columns', columns);
        return newColumn;
    }

    // ============================================================
    // ACTIVITY METHODS
    // ============================================================

    async addActivity(ticketId, userId, action, description) {
        const activities = this.getStorageItem('activities') || [];
        const newActivity = {
            id: this.getNextId('activities'),
            ticket_id: ticketId,
            user_id: userId,
            action: action,
            description: description,
            timestamp: new Date().toISOString()
        };
        
        activities.push(newActivity);
        this.setStorageItem('activities', activities);
        return newActivity;
    }

    // ============================================================
    // STATISTICS
    // ============================================================

    getStats() {
        const tickets = this.getAllTickets();
        return {
            total: tickets.length,
            open: tickets.filter(t => t.status === 'open').length,
            in_progress: tickets.filter(t => t.status === 'in_progress').length,
            resolved: tickets.filter(t => t.status === 'resolved').length,
            closed: tickets.filter(t => t.status === 'closed').length
        };
    }

    // ============================================================
    // IMPORT/EXPORT FOR COLLABORATION
    // ============================================================

    exportAllData() {
        return {
            version: '3.1',
            system: 'FlowDesk Hybrid (localStorage + Optional GitHub)',
            exportDate: new Date().toISOString(),
            data: {
                users: this.getStorageItem('users'),
                tickets: this.getStorageItem('tickets'),
                columns: this.getStorageItem('columns'),
                activities: this.getStorageItem('activities'),
                counters: this.getStorageItem('counters')
            }
        };
    }

    async importAllData(importData, mergeMode = false) {
        try {
            if (!importData.data) {
                throw new Error('Invalid import data format');
            }

            if (!mergeMode) {
                // Full replace mode
                this.setStorageItem('users', importData.data.users || []);
                this.setStorageItem('tickets', importData.data.tickets || []);
                this.setStorageItem('columns', importData.data.columns || []);
                this.setStorageItem('activities', importData.data.activities || []);
                this.setStorageItem('counters', importData.data.counters || {});
            } else {
                // Merge mode - more complex logic needed
                await this.mergeImportData(importData.data);
            }

            return true;
        } catch (error) {
            console.error('Import failed:', error);
            throw error;
        }
    }

    async mergeImportData(data) {
        // This is a simplified merge - in production you'd want more sophisticated conflict resolution
        const currentCounters = this.getStorageItem('counters') || {};
        
        // Merge users (avoid duplicates by name)
        const currentUsers = this.getAllUsers();
        const importUsers = data.users || [];
        
        for (const importUser of importUsers) {
            const exists = currentUsers.find(u => u.name.toLowerCase() === importUser.name.toLowerCase());
            if (!exists) {
                const newUser = { ...importUser, id: this.getNextId('users') };
                currentUsers.push(newUser);
            }
        }
        this.setStorageItem('users', currentUsers);

        // Similar logic for tickets, columns, activities...
        // For now, we'll just append new tickets with new IDs
        const currentTickets = this.getStorageItem('tickets') || [];
        const importTickets = data.tickets || [];
        
        for (const importTicket of importTickets) {
            const newTicket = { 
                ...importTicket, 
                id: this.getNextId('tickets'),
                imported_at: new Date().toISOString()
            };
            currentTickets.push(newTicket);
        }
        this.setStorageItem('tickets', currentTickets);
    }

    // ============================================================
    // GITHUB SYNC (OPTIONAL)
    // ============================================================

    async syncWithGitHub(mode = 'pull') {
        try {
            if (mode === 'pull') {
                return await this.pullFromGitHub();
            } else if (mode === 'push') {
                return await this.pushToGitHub();
            }
        } catch (error) {
            console.warn('GitHub sync failed (this is optional):', error);
            throw error;
        }
    }

    async pullFromGitHub() {
        // Try to pull data from GitHub without authentication (read-only)
        const files = ['users.json', 'tickets.json', 'columns.json', 'activities.json'];
        const pulledData = {};

        for (const file of files) {
            try {
                const url = `https://raw.githubusercontent.com/${this.githubRepo}/${this.githubBranch}/${this.dataPath}/${file}`;
                const response = await fetch(url);
                
                if (response.ok) {
                    pulledData[file.replace('.json', '')] = await response.json();
                }
            } catch (error) {
                console.warn(`Failed to pull ${file}:`, error);
            }
        }

        if (Object.keys(pulledData).length > 0) {
            // Merge the pulled data
            await this.mergeImportData(pulledData);
            return pulledData;
        }

        return null;
    }

    async pushToGitHub() {
        // This would require authentication, so we'll just throw a helpful error
        throw new Error('GitHub push requires authentication. Use export/import instead for collaboration.');
    }

    // ============================================================
    // INITIALIZATION
    // ============================================================

    async init() {
        console.log('🚀 Initializing FlowDesk Hybrid Database...');
        
        // Try to sync with GitHub if possible (optional)
        try {
            await this.pullFromGitHub();
            console.log('📥 Synced with GitHub successfully');
        } catch (error) {
            console.log('📱 Working offline - localStorage only');
        }

        console.log('✅ FlowDesk Hybrid Database ready!');
        return true;
    }
}

// Global instance
window.hybridDB = new HybridDatabase();