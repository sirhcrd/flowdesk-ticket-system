// FlowDesk GitHub JSON Database Module
class GitHubDatabase {
    constructor() {
        this.owner = 'sirhcrd'; // GitHub username
        this.repo = 'flowdesk-ticket-system'; // Repository name
        this.branch = 'main';
        this.baseURL = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/data`;
        this.initialized = false;
        
        // Cache for data files
        this.cache = {
            tickets: null,
            users: null,
            columns: null,
            activities: null
        };
        
        // File SHAs for updates (required by GitHub API)
        this.fileSHAs = {};
    }

    async init() {
        if (this.initialized) return;
        
        console.log('🌐 Initializing FlowDesk GitHub Database...');
        
        try {
            // Load all data files
            await this.loadAllData();
            this.initialized = true;
            console.log('✅ GitHub Database initialized successfully!');
        } catch (error) {
            console.error('❌ Failed to initialize GitHub database:', error);
            throw error;
        }
    }

    async loadAllData() {
        console.log('📁 Loading all data from GitHub...');
        
        const files = ['tickets.json', 'users.json', 'columns.json', 'activities.json'];
        
        for (const file of files) {
            try {
                const data = await this.loadFile(file);
                const key = file.replace('.json', '');
                this.cache[key] = data;
                console.log(`✅ Loaded ${file}: ${Object.keys(data).length} keys`);
            } catch (error) {
                console.warn(`⚠️ Could not load ${file}:`, error.message);
                // Initialize with empty structure if file doesn't exist
                this.cache[file.replace('.json', '')] = this.getEmptyStructure(file);
            }
        }
    }

    async loadFile(filename) {
        const url = `${this.baseURL}/${filename}`;
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`File ${filename} not found`);
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const fileData = await response.json();
            
            // Store SHA for updates
            this.fileSHAs[filename] = fileData.sha;
            
            // Decode base64 content
            const content = atob(fileData.content);
            return JSON.parse(content);
            
        } catch (error) {
            console.error(`❌ Error loading ${filename}:`, error);
            throw error;
        }
    }

    async saveFile(filename, data) {
        const url = `${this.baseURL}/${filename}`;
        
        // Add metadata
        data.lastUpdated = new Date().toISOString();
        
        const content = JSON.stringify(data, null, 2);
        const encodedContent = btoa(content);
        
        const body = {
            message: `Update ${filename} via FlowDesk`,
            content: encodedContent,
            branch: this.branch
        };
        
        // Include SHA if file exists (for updates)
        if (this.fileSHAs[filename]) {
            body.sha = this.fileSHAs[filename];
        }
        
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`GitHub API Error: ${errorData.message}`);
            }
            
            const result = await response.json();
            
            // Update SHA for next save
            this.fileSHAs[filename] = result.content.sha;
            
            // Update cache
            const key = filename.replace('.json', '');
            this.cache[key] = data;
            
            console.log(`✅ Saved ${filename} to GitHub`);
            return true;
            
        } catch (error) {
            console.error(`❌ Error saving ${filename}:`, error);
            throw error;
        }
    }

    getEmptyStructure(filename) {
        switch (filename) {
            case 'tickets.json':
                return { tickets: [], nextId: 1, lastUpdated: new Date().toISOString(), version: '3.0' };
            case 'users.json':
                return { users: [], nextId: 1, lastUpdated: new Date().toISOString() };
            case 'columns.json':
                return { columns: [], nextId: 1, lastUpdated: new Date().toISOString() };
            case 'activities.json':
                return { activities: [], nextId: 1, lastUpdated: new Date().toISOString() };
            default:
                return {};
        }
    }

    // Data access methods
    getAllTickets() {
        if (!this.cache.tickets) return [];
        
        // Join with users and columns data
        return this.cache.tickets.tickets.map(ticket => {
            const assignee = this.cache.users?.users.find(u => u.id === ticket.assignee_id);
            const creator = this.cache.users?.users.find(u => u.id === ticket.creator_id);
            const column = this.cache.columns?.columns.find(c => c.id === ticket.kanban_column_id);
            
            return {
                ...ticket,
                assignee_name: assignee?.name || 'Unassigned',
                creator_name: creator?.name || 'Unknown',
                kanban_column_name: column?.name || 'No Column',
                kanban_column_color: column?.color || '#6B7280'
            };
        });
    }

    getTicketById(id) {
        const tickets = this.getAllTickets();
        const ticket = tickets.find(t => t.id === parseInt(id));
        
        if (ticket) {
            // Add activities
            ticket.activities = this.cache.activities?.activities
                .filter(a => a.ticket_id === ticket.id)
                .map(activity => {
                    const user = this.cache.users?.users.find(u => u.id === activity.user_id);
                    return {
                        ...activity,
                        user_name: user?.name || 'Unknown'
                    };
                })
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) || [];
        }
        
        return ticket;
    }

    getAllUsers() {
        return this.cache.users?.users || [];
    }

    getKanbanColumns() {
        return this.cache.columns?.columns.sort((a, b) => a.position - b.position) || [];
    }

    // CRUD operations
    async createTicket(ticketData) {
        const tickets = this.cache.tickets;
        const newTicket = {
            id: tickets.nextId++,
            ...ticketData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        tickets.tickets.push(newTicket);
        await this.saveFile('tickets.json', tickets);
        
        // Add creation activity
        await this.addActivity(newTicket.id, ticketData.creator_id, 'created', `Ticket created`);
        
        return newTicket;
    }

    async updateTicket(id, updates) {
        const tickets = this.cache.tickets;
        const ticketIndex = tickets.tickets.findIndex(t => t.id === parseInt(id));
        
        if (ticketIndex === -1) {
            throw new Error('Ticket not found');
        }
        
        const oldTicket = { ...tickets.tickets[ticketIndex] };
        tickets.tickets[ticketIndex] = {
            ...tickets.tickets[ticketIndex],
            ...updates,
            updated_at: new Date().toISOString()
        };
        
        await this.saveFile('tickets.json', tickets);
        
        // Log what changed
        const changes = [];
        Object.keys(updates).forEach(key => {
            if (oldTicket[key] !== updates[key]) {
                changes.push(`${key} changed from "${oldTicket[key]}" to "${updates[key]}"`);
            }
        });
        
        if (changes.length > 0) {
            await this.addActivity(id, updates.updated_by || null, 'updated', changes.join(', '));
        }
        
        return tickets.tickets[ticketIndex];
    }

    async deleteTicket(id) {
        const tickets = this.cache.tickets;
        tickets.tickets = tickets.tickets.filter(t => t.id !== parseInt(id));
        await this.saveFile('tickets.json', tickets);
        
        // Remove related activities
        const activities = this.cache.activities;
        activities.activities = activities.activities.filter(a => a.ticket_id !== parseInt(id));
        await this.saveFile('activities.json', activities);
        
        return true;
    }

    async createUser(userData) {
        const users = this.cache.users;
        const newUser = {
            id: users.nextId++,
            ...userData,
            created_at: new Date().toISOString()
        };
        
        users.users.push(newUser);
        await this.saveFile('users.json', users);
        return newUser;
    }

    async addActivity(ticketId, userId, actionType, description) {
        const activities = this.cache.activities;
        const newActivity = {
            id: activities.nextId++,
            ticket_id: parseInt(ticketId),
            user_id: userId,
            action_type: actionType,
            description: description,
            timestamp: new Date().toISOString()
        };
        
        activities.activities.push(newActivity);
        await this.saveFile('activities.json', activities);
        return newActivity;
    }

    // Column management
    async createColumn(columnData) {
        const columns = this.cache.columns;
        const maxPosition = Math.max(...columns.columns.map(c => c.position), -1);
        
        const newColumn = {
            id: columns.nextId++,
            ...columnData,
            position: maxPosition + 1,
            created_at: new Date().toISOString()
        };
        
        columns.columns.push(newColumn);
        await this.saveFile('columns.json', columns);
        return newColumn;
    }

    async updateColumn(id, updates) {
        const columns = this.cache.columns;
        const columnIndex = columns.columns.findIndex(c => c.id === parseInt(id));
        
        if (columnIndex === -1) {
            throw new Error('Column not found');
        }
        
        columns.columns[columnIndex] = {
            ...columns.columns[columnIndex],
            ...updates
        };
        
        await this.saveFile('columns.json', columns);
        return columns.columns[columnIndex];
    }

    async deleteColumn(id) {
        const columns = this.cache.columns;
        columns.columns = columns.columns.filter(c => c.id !== parseInt(id));
        await this.saveFile('columns.json', columns);
        return true;
    }

    // Utility methods
    async sync() {
        console.log('🔄 Syncing with GitHub...');
        await this.loadAllData();
        console.log('✅ Sync completed');
    }

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
}

// Global database instance
window.githubDB = new GitHubDatabase();