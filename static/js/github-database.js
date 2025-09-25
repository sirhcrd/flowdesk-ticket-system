// FlowDesk GitHub JSON Database Module with OAuth
class GitHubDatabase {
    constructor() {
        // Default to user's data repository (separate from code repository)
        this.owner = null; // Will be set from authenticated user
        this.repo = null; // Will be configured by user
        this.branch = 'main';
        this.baseURL = null; // Will be constructed after configuration
        this.initialized = false;
        
        // Configuration
        this.config = {
            dataRepo: localStorage.getItem('flowdesk_data_repo') || null,
            useDefaultRepo: localStorage.getItem('flowdesk_use_default_repo') === 'true'
        };
        
        // OAuth authentication
        this.auth = window.githubAuth;
        
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

    // Configure data repository
    configureRepository(owner, repo) {
        this.owner = owner;
        this.repo = repo;
        this.baseURL = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/data`;
        
        // Save configuration
        localStorage.setItem('flowdesk_data_repo', repo);
        console.log(`🔧 Configured data repository: ${owner}/${repo}`);
    }

    // Get or prompt for data repository configuration
    async ensureRepositoryConfigured() {
        if (this.baseURL) return true;
        
        // Get authenticated user
        const user = this.auth?.getCurrentUser();
        if (!user) {
            throw new Error('GitHub authentication required');
        }
        
        this.owner = user.login;
        
        // Check if we have a saved data repo configuration
        if (this.config.dataRepo) {
            this.configureRepository(this.owner, this.config.dataRepo);
            return true;
        }
        
        // Default data repository name
        const defaultDataRepo = 'flowdesk-data';
        
        // Ask user if they want to use the default data repo
        const useDefault = confirm(
            `FlowDesk needs a GitHub repository to store your ticket data.\n\n` +
            `Would you like to use: ${this.owner}/${defaultDataRepo}\n\n` +
            `Click OK to use this repository (it will be created if it doesn't exist)\n` +
            `Click Cancel to specify a different repository name`
        );
        
        if (useDefault) {
            this.configureRepository(this.owner, defaultDataRepo);
            return true;
        } else {
            // Ask for custom repository name
            const customRepo = prompt(
                'Enter the name of your GitHub repository for storing FlowDesk data:\n\n' +
                '(The repository will be created if it doesn\'t exist)',
                'flowdesk-data'
            );
            
            if (customRepo && customRepo.trim()) {
                this.configureRepository(this.owner, customRepo.trim());
                return true;
            } else {
                throw new Error('Data repository configuration cancelled');
            }
        }
    }

    // Create data repository if it doesn't exist
    async ensureDataRepositoryExists() {
        if (!this.baseURL) {
            throw new Error('Repository not configured');
        }
        
        try {
            // Check if repository exists by trying to get its info
            const repoUrl = `https://api.github.com/repos/${this.owner}/${this.repo}`;
            const response = await this.auth.makeAuthenticatedRequest(repoUrl);
            
            if (response.ok) {
                console.log(`✅ Data repository ${this.owner}/${this.repo} exists`);
                return true;
            }
        } catch (error) {
            console.log(`📁 Repository ${this.owner}/${this.repo} doesn't exist, creating it...`);
        }
        
        try {
            // Create the repository
            const createRepoUrl = 'https://api.github.com/user/repos';
            const repoData = {
                name: this.repo,
                description: 'FlowDesk ticket management system data storage',
                private: false, // You can change this to true if you want private data
                auto_init: true,
                gitignore_template: null,
                license_template: null
            };
            
            const createResponse = await this.auth.makeAuthenticatedRequest(createRepoUrl, {
                method: 'POST',
                body: JSON.stringify(repoData)
            });
            
            if (createResponse.ok) {
                console.log(`✅ Created data repository: ${this.owner}/${this.repo}`);
                return true;
            } else {
                const errorData = await createResponse.json();
                throw new Error(`Failed to create repository: ${errorData.message}`);
            }
        } catch (error) {
            console.error(`❌ Error creating data repository:`, error);
            throw error;
        }
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
        
        // Ensure repository is configured and exists
        await this.ensureRepositoryConfigured();
        await this.ensureDataRepositoryExists();
        
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
            // Use authenticated request if available, fallback to public access
            let response;
            if (this.auth && this.auth.isAuthenticated()) {
                response = await this.auth.makeAuthenticatedRequest(url);
            } else {
                // Try public access first
                response = await fetch(url);
            }
            
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
        // Check if user is authenticated
        if (!this.auth || !this.auth.isAuthenticated()) {
            throw new Error('GitHub authentication required for saving data. Please login with GitHub.');
        }
        
        // Ensure repository is configured
        await this.ensureRepositoryConfigured();
        
        const url = `${this.baseURL}/${filename}`;
        
        // Add metadata
        data.lastUpdated = new Date().toISOString();
        data.updatedBy = this.auth.getCurrentUser()?.login || 'Unknown';
        
        const content = JSON.stringify(data, null, 2);
        const encodedContent = btoa(unescape(encodeURIComponent(content))); // Better UTF-8 support
        
        const body = {
            message: `Update ${filename} via FlowDesk by ${data.updatedBy}`,
            content: encodedContent,
            branch: this.branch
        };
        
        // Include SHA if file exists (for updates)
        if (this.fileSHAs[filename]) {
            body.sha = this.fileSHAs[filename];
        } else {
            // Try to fetch current SHA if we don't have it
            try {
                console.log(`🔍 Fetching current SHA for ${filename}...`);
                const currentResponse = await this.auth.makeAuthenticatedRequest(url);
                if (currentResponse.ok) {
                    const currentData = await currentResponse.json();
                    this.fileSHAs[filename] = currentData.sha;
                    body.sha = currentData.sha;
                    console.log(`✅ Found existing SHA for ${filename}`);
                } else {
                    console.log(`📝 File ${filename} doesn't exist yet, creating new file`);
                }
            } catch (shaError) {
                console.log(`📝 Unable to fetch SHA for ${filename}, assuming new file`);
            }
        }
        
        try {
            const response = await this.auth.makeAuthenticatedRequest(url, {
                method: 'PUT',
                body: JSON.stringify(body)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { message: errorText };
                }
                throw new Error(`GitHub API Error (${response.status}): ${errorData.message || 'Unknown error'}`);
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
        // Ensure cache is initialized
        if (!this.cache.tickets) {
            console.warn('⚠️ Tickets cache not initialized, creating empty structure');
            this.cache.tickets = this.getEmptyStructure('tickets.json');
        }
        
        const tickets = this.cache.tickets;
        
        // Ensure nextId exists
        if (typeof tickets.nextId !== 'number') {
            tickets.nextId = Math.max(...(tickets.tickets || []).map(t => t.id || 0), 0) + 1;
            console.log(`🔢 Initialized nextId to ${tickets.nextId}`);
        }
        
        const newTicket = {
            id: tickets.nextId++,
            ...ticketData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        tickets.tickets.push(newTicket);
        tickets.lastUpdated = new Date().toISOString();
        
        await this.saveFile('tickets.json', tickets);
        
        // Add creation activity (but don't save immediately to reduce API calls)
        if (!this.cache.activities) {
            this.cache.activities = this.getEmptyStructure('activities.json');
        }
        
        const activities = this.cache.activities;
        if (typeof activities.nextId !== 'number') {
            activities.nextId = Math.max(...(activities.activities || []).map(a => a.id || 0), 0) + 1;
        }
        
        const newActivity = {
            id: activities.nextId++,
            ticket_id: newTicket.id,
            user_id: ticketData.creator_id,
            action_type: 'created',
            description: `Ticket created`,
            timestamp: new Date().toISOString()
        };
        
        activities.activities.push(newActivity);
        activities.lastUpdated = new Date().toISOString();
        
        // Save activities immediately after ticket creation
        await this.saveFile('activities.json', activities);
        
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
        // Ensure cache is initialized
        if (!this.cache.users) {
            console.warn('⚠️ Users cache not initialized, creating empty structure');
            this.cache.users = this.getEmptyStructure('users.json');
        }
        
        const users = this.cache.users;
        
        // Ensure nextId exists
        if (typeof users.nextId !== 'number') {
            users.nextId = Math.max(...(users.users || []).map(u => u.id || 0), 0) + 1;
            console.log(`🔢 Initialized users nextId to ${users.nextId}`);
        }
        
        const newUser = {
            id: users.nextId++,
            ...userData,
            created_at: new Date().toISOString()
        };
        
        users.users.push(newUser);
        users.lastUpdated = new Date().toISOString();
        
        await this.saveFile('users.json', users);
        return newUser;
    }

    async addActivity(ticketId, userId, actionType, description) {
        // Ensure cache is initialized
        if (!this.cache.activities) {
            console.warn('⚠️ Activities cache not initialized, creating empty structure');
            this.cache.activities = this.getEmptyStructure('activities.json');
        }
        
        const activities = this.cache.activities;
        
        // Ensure nextId exists
        if (typeof activities.nextId !== 'number') {
            activities.nextId = Math.max(...(activities.activities || []).map(a => a.id || 0), 0) + 1;
            console.log(`🔢 Initialized activities nextId to ${activities.nextId}`);
        }
        
        const newActivity = {
            id: activities.nextId++,
            ticket_id: parseInt(ticketId),
            user_id: userId,
            action_type: actionType,
            description: description,
            timestamp: new Date().toISOString()
        };
        
        activities.activities.push(newActivity);
        activities.lastUpdated = new Date().toISOString();
        
        await this.saveFile('activities.json', activities);
        return newActivity;
    }

    // Column management
    async createColumn(columnData) {
        // Ensure cache is initialized
        if (!this.cache.columns) {
            console.warn('⚠️ Columns cache not initialized, creating empty structure');
            this.cache.columns = this.getEmptyStructure('columns.json');
        }
        
        const columns = this.cache.columns;
        
        // Ensure nextId exists
        if (typeof columns.nextId !== 'number') {
            columns.nextId = Math.max(...(columns.columns || []).map(c => c.id || 0), 0) + 1;
            console.log(`🔢 Initialized columns nextId to ${columns.nextId}`);
        }
        
        const maxPosition = Math.max(...columns.columns.map(c => c.position), -1);
        
        const newColumn = {
            id: columns.nextId++,
            ...columnData,
            position: maxPosition + 1,
            created_at: new Date().toISOString()
        };
        
        columns.columns.push(newColumn);
        columns.lastUpdated = new Date().toISOString();
        
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

    // Authentication methods
    isAuthenticated() {
        return this.auth && this.auth.isAuthenticated();
    }

    getAuthenticatedUser() {
        return this.auth ? this.auth.getCurrentUser() : null;
    }

    async authenticate() {
        if (this.auth) {
            await this.auth.authenticate();
        } else {
            throw new Error('GitHub OAuth not initialized');
        }
    }

    logout() {
        if (this.auth) {
            this.auth.logout();
        }
    }

    canWrite() {
        return this.isAuthenticated();
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