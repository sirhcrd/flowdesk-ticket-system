# 🎫 FlowDesk - Modern Ticket System

A lightweight, frontend-only ticket management system that runs entirely in your browser. No backend required - all data is stored locally with export capabilities.

## ✨ Features

- 🎨 **Modern UI** - Beautiful interface with dark/light themes using Tailwind CSS
- 💾 **Local Storage** - All data stored in your browser (no server required)
- � **Export Ready** - Export to CSV or Excel formats
- 📱 **Mobile Responsive** - Works perfectly on all device sizes
- 🚀 **GitHub Pages Ready** - Deploy for free on GitHub Pages
- 🔍 **Smart Filtering** - Filter tickets by status, priority, and more
- 🏷️ **Tagging System** - Organize tickets with custom tags
- 📊 **Analytics Dashboard** - Track ticket metrics in real-time
- 🌙 **Dark/Light Theme** - Toggle between themes with preference saving

## 🛠️ Tech Stack

- **HTML5 + CSS3** - Semantic markup and modern styling
- **Tailwind CSS** - Utility-first CSS framework for beautiful designs
- **Alpine.js** - Lightweight JavaScript framework for reactivity
- **Local Storage** - Browser-based data persistence
- **GitHub Pages** - Free hosting and deployment

## 🚀 Quick Start

### Option 1: Use Live Demo
Visit the live demo at: **[https://sirhcrd.github.io/flowdesk-ticket-system](https://sirhcrd.github.io/flowdesk-ticket-system)**

### Option 2: Run Locally

1. **Clone the repository**
   ```bash
   git clone https://github.com/sirhcrd/flowdesk-ticket-system.git
   cd flowdesk-ticket-system
   ```

2. **Serve the frontend**
   ```bash
   # Option A: Python simple server
   cd frontend
   python -m http.server 8000
   
   # Option B: Node.js serve
   cd frontend  
   npx serve .
   
   # Option C: Any static file server
   ```

3. **Open your browser**
   - Navigate to http://localhost:8000
   - Start creating and managing tickets!

### Option 3: Deploy to GitHub Pages

1. **Fork this repository**
2. **Go to Settings → Pages**
3. **Select "Deploy from a branch"**
4. **Choose "main" branch and "/frontend" folder**
5. **Your site will be live at `https://yourusername.github.io/flowdesk-ticket-system`**

## � Data Management

### Local Storage
- **All data** is stored in your browser's local storage
- **Persistent** across browser sessions
- **Private** - data never leaves your computer
- **Exportable** - download your data anytime

### Export Options

**CSV Export:**
```
ID,Title,Description,Status,Priority,Assignee,Creator,Created,Updated,Tags
1,"Sample Ticket","Description here",open,medium,Admin,User,9/24/2025,9/24/2025,"bug,frontend"
```

**Excel Export:**
- **Formatted table** with headers
- **Compatible** with Microsoft Excel, Google Sheets, LibreOffice
- **Preserves data types** and formatting

## 🎨 Customization

### Themes
- **Light Theme** - Clean, professional appearance
- **Dark Theme** - Easy on the eyes for long sessions
- **Auto-detection** - Respects system preference
- **Persistent** - Remembers your choice

### Ticket Fields
- **Title** - Brief description
- **Description** - Detailed information
- **Status** - Open, In Progress, Resolved, Closed
- **Priority** - Low, Medium, High, Urgent
- **Assignee** - Person responsible
- **Tags** - Custom labels for organization

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