// FlowDesk SQLite Database Module
class FlowDeskDatabase {
    constructor() {
        this.db = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        
        console.log('🗄️ Initializing FlowDesk SQLite database...');
        
        // Load SQL.js
        const initSqlJs = window.initSqlJs;
        const SQL = await initSqlJs({
            locateFile: file => `https://cdn.jsdelivr.net/npm/sql.js@1.8.0/dist/${file}`
        });

        // Try to load existing database from localStorage
        const savedDb = localStorage.getItem('flowdesk_sqlite_db');
        if (savedDb) {
            console.log('📁 Loading existing database from storage...');
            const buffer = new Uint8Array(JSON.parse(savedDb));
            this.db = new SQL.Database(buffer);
        } else {
            console.log('🆕 Creating new database...');
            this.db = new SQL.Database();
            await this.createTables();
            await this.insertSampleData();
        }

        this.initialized = true;
        console.log('✅ Database initialized successfully!');
    }

    async createTables() {
        console.log('🏗️ Creating database tables...');
        
        // Users table
        this.db.exec(`
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                email TEXT,
                avatar_color TEXT DEFAULT '#3B82F6',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Kanban columns table
        this.db.exec(`
            CREATE TABLE kanban_columns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                position INTEGER NOT NULL,
                color TEXT DEFAULT '#6B7280',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Tickets table
        this.db.exec(`
            CREATE TABLE tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'backlog',
                priority TEXT DEFAULT 'medium',
                kanban_column_id INTEGER,
                kanban_position INTEGER DEFAULT 0,
                assignee_id INTEGER,
                creator_id INTEGER,
                due_date DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (assignee_id) REFERENCES users(id),
                FOREIGN KEY (creator_id) REFERENCES users(id),
                FOREIGN KEY (kanban_column_id) REFERENCES kanban_columns(id)
            );
        `);

        // Ticket tags table (many-to-many)
        this.db.exec(`
            CREATE TABLE ticket_tags (
                ticket_id INTEGER,
                tag TEXT,
                PRIMARY KEY (ticket_id, tag),
                FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
            );
        `);

        // Comments table
        this.db.exec(`
            CREATE TABLE comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
        `);

        // Attachments table
        this.db.exec(`
            CREATE TABLE attachments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id INTEGER NOT NULL,
                filename TEXT NOT NULL,
                file_data TEXT NOT NULL, -- Base64 encoded file
                file_type TEXT,
                file_size INTEGER,
                uploaded_by INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
                FOREIGN KEY (uploaded_by) REFERENCES users(id)
            );
        `);

        // Activity log table
        this.db.exec(`
            CREATE TABLE activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id INTEGER NOT NULL,
                user_id INTEGER,
                action_type TEXT NOT NULL, -- 'created', 'updated', 'commented', etc.
                description TEXT NOT NULL,
                old_value TEXT,
                new_value TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
        `);

        // Create indexes for better performance
        this.db.exec(`
            CREATE INDEX idx_tickets_status ON tickets(status);
            CREATE INDEX idx_tickets_priority ON tickets(priority);
            CREATE INDEX idx_tickets_assignee ON tickets(assignee_id);
            CREATE INDEX idx_tickets_creator ON tickets(creator_id);
            CREATE INDEX idx_tickets_kanban ON tickets(kanban_column_id, kanban_position);
            CREATE INDEX idx_activities_ticket ON activities(ticket_id);
            CREATE INDEX idx_comments_ticket ON comments(ticket_id);
        `);

        console.log('✅ Database tables created successfully!');
    }

    async insertSampleData() {
        console.log('📝 Inserting sample data...');

        // Insert default user
        this.db.exec(`
            INSERT INTO users (name, email, avatar_color) 
            VALUES 
                ('System', 'system@flowdesk.com', '#6B7280'),
                ('Current User', 'user@flowdesk.com', '#3B82F6');
        `);

        // Insert default kanban columns
        this.db.exec(`
            INSERT INTO kanban_columns (name, position, color) 
            VALUES 
                ('Backlog', 0, '#6B7280'),
                ('In Progress', 1, '#F59E0B'),
                ('Review', 2, '#8B5CF6'),
                ('Done', 3, '#10B981');
        `);

        // Insert sample tickets
        const yesterday = new Date(Date.now() - 86400000).toISOString();
        const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

        this.db.exec(`
            INSERT INTO tickets (title, description, status, priority, kanban_column_id, assignee_id, creator_id, created_at, updated_at) 
            VALUES 
                ('Welcome to FlowDesk Pro!', 'This is your new professional ticket management system with SQLite database, drag-and-drop kanban board, and AI-powered search.', 'backlog', 'medium', 1, 2, 1, '${yesterday}', '${oneHourAgo}'),
                ('Test the new features', 'Try out the kanban board, comments, attachments, and advanced search functionality.', 'backlog', 'high', 1, 2, 2, '${yesterday}', '${yesterday}');
        `);

        // Insert sample tags
        this.db.exec(`
            INSERT INTO ticket_tags (ticket_id, tag) 
            VALUES 
                (1, 'welcome'),
                (1, 'demo'),
                (2, 'testing'),
                (2, 'features');
        `);

        // Insert sample activities
        this.db.exec(`
            INSERT INTO activities (ticket_id, user_id, action_type, description, created_at) 
            VALUES 
                (1, 1, 'created', 'Ticket created by System', '${yesterday}'),
                (2, 2, 'created', 'Ticket created by Current User', '${yesterday}');
        `);

        this.saveToStorage();
        console.log('✅ Sample data inserted successfully!');
    }

    // Save database to localStorage
    saveToStorage() {
        try {
            const data = this.db.export();
            localStorage.setItem('flowdesk_sqlite_db', JSON.stringify(Array.from(data)));
            console.log('💾 Database saved to local storage');
        } catch (error) {
            console.error('❌ Failed to save database:', error);
        }
    }

    // Execute SELECT queries
    query(sql, params = []) {
        try {
            const stmt = this.db.prepare(sql);
            const result = stmt.getAsObject(params);
            stmt.free();
            return result;
        } catch (error) {
            console.error('❌ Query failed:', sql, error);
            return null;
        }
    }

    // Execute SELECT queries that return multiple rows
    queryAll(sql, params = []) {
        try {
            const stmt = this.db.prepare(sql);
            const results = [];
            while (stmt.step()) {
                results.push(stmt.getAsObject());
            }
            stmt.free();
            return results;
        } catch (error) {
            console.error('❌ Query failed:', sql, error);
            return [];
        }
    }

    // Execute INSERT/UPDATE/DELETE queries
    exec(sql, params = []) {
        try {
            const stmt = this.db.prepare(sql);
            stmt.run(params);
            stmt.free();
            this.saveToStorage(); // Auto-save after changes
            return true;
        } catch (error) {
            console.error('❌ Execution failed:', sql, error);
            return false;
        }
    }

    // Get all tickets with related data
    getAllTickets() {
        return this.queryAll(`
            SELECT 
                t.*,
                u_assignee.name as assignee_name,
                u_creator.name as creator_name,
                kc.name as kanban_column_name,
                kc.color as kanban_column_color,
                GROUP_CONCAT(tt.tag) as tags
            FROM tickets t
            LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id
            LEFT JOIN users u_creator ON t.creator_id = u_creator.id
            LEFT JOIN kanban_columns kc ON t.kanban_column_id = kc.id
            LEFT JOIN ticket_tags tt ON t.id = tt.ticket_id
            GROUP BY t.id
            ORDER BY t.created_at DESC
        `);
    }

    // Get ticket by ID with all related data
    getTicketById(ticketId) {
        const ticket = this.query(`
            SELECT 
                t.*,
                u_assignee.name as assignee_name,
                u_creator.name as creator_name,
                kc.name as kanban_column_name
            FROM tickets t
            LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id
            LEFT JOIN users u_creator ON t.creator_id = u_creator.id
            LEFT JOIN kanban_columns kc ON t.kanban_column_id = kc.id
            WHERE t.id = ?
        `, [ticketId]);

        if (!ticket) return null;

        // Get tags
        const tags = this.queryAll(`SELECT tag FROM ticket_tags WHERE ticket_id = ?`, [ticketId]);
        ticket.tags = tags.map(t => t.tag);

        // Get activities
        ticket.activities = this.queryAll(`
            SELECT a.*, u.name as user_name
            FROM activities a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE a.ticket_id = ?
            ORDER BY a.created_at DESC
        `, [ticketId]);

        // Get comments
        ticket.comments = this.queryAll(`
            SELECT c.*, u.name as user_name
            FROM comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.ticket_id = ?
            ORDER BY c.created_at ASC
        `, [ticketId]);

        // Get attachments
        ticket.attachments = this.queryAll(`
            SELECT a.*, u.name as uploaded_by_name
            FROM attachments a
            LEFT JOIN users u ON a.uploaded_by = u.id
            WHERE a.ticket_id = ?
            ORDER BY a.created_at DESC
        `, [ticketId]);

        return ticket;
    }

    // Get all users
    getAllUsers() {
        return this.queryAll(`SELECT * FROM users ORDER BY name`);
    }

    // Get all kanban columns
    getKanbanColumns() {
        return this.queryAll(`SELECT * FROM kanban_columns ORDER BY position`);
    }

    // Export database as file
    exportDatabase() {
        const data = this.db.export();
        const blob = new Blob([data], { type: 'application/x-sqlite3' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flowdesk-${new Date().toISOString().split('T')[0]}.db`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
}

// Global database instance
window.flowDeskDB = new FlowDeskDatabase();