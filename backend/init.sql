-- FlowDesk Database Initialization Script

-- Create database extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create initial admin user (password: admin123 - change in production!)
INSERT INTO users (email, username, hashed_password, full_name, role, is_active, created_at)
VALUES (
    'admin@flowdesk.com', 
    'admin', 
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeJ6ZlAhZ8jE1xZna',  -- admin123
    'System Administrator', 
    'admin', 
    true, 
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Create sample tags
INSERT INTO tags (name, color, created_at) VALUES 
    ('Bug', '#ef4444', NOW()),
    ('Feature', '#3b82f6', NOW()),
    ('Enhancement', '#10b981', NOW()),
    ('Question', '#f59e0b', NOW()),
    ('Documentation', '#8b5cf6', NOW()),
    ('Urgent', '#dc2626', NOW())
ON CONFLICT (name) DO NOTHING;

-- Create sample tickets for demonstration
INSERT INTO tickets (title, description, status, priority, creator_id, created_at) VALUES 
    (
        'Welcome to FlowDesk!', 
        'This is a sample ticket to get you started. You can create, assign, and manage tickets from the web interface.',
        'open',
        'medium',
        (SELECT id FROM users WHERE email = 'admin@flowdesk.com'),
        NOW()
    ),
    (
        'Setup Email Notifications', 
        'Configure SendGrid API key in environment variables to enable email notifications for ticket updates.',
        'open',
        'high',
        (SELECT id FROM users WHERE email = 'admin@flowdesk.com'),
        NOW()
    )
ON CONFLICT DO NOTHING;