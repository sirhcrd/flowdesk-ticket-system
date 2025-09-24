<!-- FlowDesk - Modern Ticket System Instructions -->

# FlowDesk Ticket System

A production-ready ticket management system with real-time updates, email notifications, and modern UI.

## Architecture
- **Backend**: FastAPI with WebSockets, JWT authentication, PostgreSQL
- **Frontend**: HTML5 + Tailwind CSS + Alpine.js
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Deployment**: Docker Compose + GitHub Actions + Railway/Render
- **Features**: Real-time updates, email notifications, role-based access

## Development Guidelines
- Use modern Python async/await patterns
- Implement comprehensive error handling
- Follow REST API best practices
- Ensure mobile-responsive UI
- Write comprehensive tests
- Use type hints throughout codebase

## Getting Started
1. **Start databases**: Run the "start-databases" task or `docker-compose up -d db redis`
2. **Install backend dependencies**: `cd backend && pip install -r requirements.txt`
3. **Run development server**: Use F5 or the "FastAPI Development Server" launch configuration
4. **Access application**: http://localhost:8000 (admin@flowdesk.com / admin123)
5. **API Documentation**: http://localhost:8000/api/docs

## Project Status
✅ Created GitHub copilot instructions  
✅ Got project setup information  
✅ Scaffolded FastAPI project structure  
✅ Created frontend structure  
✅ Set up Docker and database  
✅ Configured CI/CD pipeline  
✅ Installed required extensions  
✅ Created launch configurations

🚀 **FlowDesk is ready for development!**