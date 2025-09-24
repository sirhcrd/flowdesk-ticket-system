# 🎫 FlowDesk - Modern Ticket System

A production-ready ticket management system built with FastAPI, PostgreSQL, and modern web technologies. Features real-time updates, email notifications, and a beautiful responsive interface.

## ✨ Features

- 🎨 **Modern UI** - Beautiful interface with dark/light themes using Tailwind CSS
- ⚡ **Real-time Updates** - WebSocket integration for live notifications
- 🔐 **Secure Authentication** - JWT-based auth with role-based access control
- 📧 **Email Notifications** - Automated notifications for ticket updates
- 📱 **Mobile Responsive** - Works perfectly on all device sizes
- 🚀 **Production Ready** - Docker containerization with CI/CD pipeline
- 🔍 **Advanced Search** - Filter tickets by status, priority, assignee, and more
- 🏷️ **Smart Tagging** - Organize tickets with customizable tags
- 📊 **Analytics Dashboard** - Track ticket metrics and team performance

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework with automatic API docs
- **PostgreSQL** - Robust relational database with full-text search
- **SQLAlchemy** - Powerful ORM with Alembic migrations
- **Redis** - Caching and session management
- **WebSockets** - Real-time bidirectional communication
- **Celery** - Asynchronous task processing
- **SendGrid** - Email delivery service

### Frontend
- **HTML5 + CSS3** - Semantic markup and modern styling
- **Tailwind CSS** - Utility-first CSS framework
- **Alpine.js** - Lightweight JavaScript framework
- **WebSocket API** - Real-time UI updates

### DevOps
- **Docker & Docker Compose** - Containerization
- **GitHub Actions** - CI/CD automation
- **Railway/Render** - Cloud deployment platforms
- **Nginx** - Reverse proxy and static file serving

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Git
- (Optional) Python 3.11+ for local development

### Option 1: Docker Setup (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/flowdesk.git
   cd flowdesk
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the services**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Web Interface: http://localhost:8000
   - API Documentation: http://localhost:8000/api/docs
   - Admin Panel: http://localhost:8000 (admin@flowdesk.com / admin123)

### Option 2: Local Development

1. **Backend setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Database setup**
   ```bash
   # Start PostgreSQL and Redis
   docker-compose up -d db redis
   
   # Run migrations
   alembic upgrade head
   ```

3. **Start the backend**
   ```bash
   uvicorn main:app --reload
   ```

4. **Open your browser**
   - Navigate to http://localhost:8000

## 📖 API Documentation

The API is fully documented with OpenAPI/Swagger. Access the interactive documentation at:
- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

### Key Endpoints

```
POST   /api/auth/login          # User authentication
POST   /api/auth/register       # User registration
GET    /api/auth/me            # Current user info

GET    /api/tickets            # List tickets (with filtering)
POST   /api/tickets            # Create new ticket
GET    /api/tickets/{id}       # Get ticket details
PUT    /api/tickets/{id}       # Update ticket
DELETE /api/tickets/{id}       # Delete ticket

POST   /api/tickets/{id}/comments  # Add comment to ticket
GET    /api/users              # List users
```

## 🔧 Configuration

### Environment Variables

Key configuration options in `.env`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/flowdesk

# Security
SECRET_KEY=your-super-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Email (SendGrid)
SENDGRID_API_KEY=your-sendgrid-key
FROM_EMAIL=noreply@yourcompany.com

# Redis
REDIS_URL=redis://localhost:6379/0
```

### User Roles

- **Admin**: Full system access, user management
- **Agent**: Ticket management, can be assigned tickets
- **User**: Can create tickets and comment on own tickets

## 🚀 Deployment

### Railway Deployment

1. **Connect to Railway**
   ```bash
   npm install -g @railway/cli
   railway login
   railway init
   ```

2. **Configure environment variables**
   - Add all environment variables in Railway dashboard
   - DATABASE_URL will be automatically provided

3. **Deploy**
   ```bash
   railway up
   ```

### Render Deployment

1. **Create new Web Service**
   - Connect your GitHub repository
   - Set build command: `cd backend && pip install -r requirements.txt`
   - Set start command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`

2. **Add PostgreSQL database**
   - Create new PostgreSQL service
   - Copy connection URL to environment variables

### Manual VPS Deployment

1. **Server setup**
   ```bash
   # Clone repository
   git clone https://github.com/yourusername/flowdesk.git
   cd flowdesk
   
   # Start with Docker Compose
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **SSL Certificate** (with Let's Encrypt)
   ```bash
   # Install certbot
   sudo apt install certbot python3-certbot-nginx
   
   # Get certificate
   sudo certbot --nginx -d yourdomain.com
   ```

## 🧪 Testing

Run the test suite:

```bash
cd backend

# Install test dependencies
pip install pytest pytest-asyncio pytest-cov httpx

# Run tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html
```

## 📚 Development

### Project Structure

```
flowdesk/
├── backend/                 # FastAPI application
│   ├── app/
│   │   ├── models.py       # Database models
│   │   ├── schemas.py      # Pydantic schemas
│   │   ├── database.py     # Database connection
│   │   └── routers/        # API route handlers
│   ├── main.py             # Application entry point
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile         # Backend container
├── frontend/               # Static web interface
│   ├── index.html         # Main application
│   └── static/
│       ├── css/           # Stylesheets
│       └── js/            # JavaScript
├── .github/workflows/     # CI/CD automation
├── docker-compose.yml     # Development containers
└── README.md             # This file
```

### Database Migrations

Using Alembic for database schema management:

```bash
# Create new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

### Code Quality

We maintain high code quality with:

- **Black** - Code formatting
- **Flake8** - Linting
- **MyPy** - Type checking
- **Pytest** - Testing framework
- **Pre-commit hooks** - Automated checks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 **Documentation**: Check the `/docs` folder for detailed guides
- 🐛 **Issues**: Report bugs on GitHub Issues
- 💬 **Discussions**: Join GitHub Discussions for questions
- 📧 **Email**: Contact support@yourcompany.com

## 🔮 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics and reporting
- [ ] Integration with Slack/Teams
- [ ] Custom workflows and automation
- [ ] Multi-tenant support
- [ ] Advanced file attachments
- [ ] Ticket templates
- [ ] SLA management
- [ ] Knowledge base integration

---

**Built with ❤️ by the FlowDesk Team** | [Website](https://yourcompany.com) | [Documentation](https://docs.yourcompany.com)