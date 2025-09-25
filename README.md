# FlowDesk - GitHub-Powered Ticket Management System

A modern, collaborative ticket management system that uses GitHub as a database with full OAuth authentication. No backend required - runs entirely in the browser with GitHub integration for team collaboration.

## 🌟 Features

### Core Functionality
- **GitHub OAuth Authentication**: Secure login with your GitHub account
- **Collaborative Storage**: Uses GitHub repository as database via JSON files
- **Real-time Collaboration**: Share tickets with your team through GitHub
- **Kanban Board**: Drag-and-drop interface with customizable columns
- **Ticket Management**: Create, update, delete, and organize tickets
- **Dashboard**: Statistics and progress tracking
- **Multiple Views**: Dashboard, List, and Kanban board layouts

### User Experience
- **Zero Setup**: No database or backend configuration needed
- **GitHub Integration**: Leverages GitHub's infrastructure for reliability
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Mode**: Automatic theme switching based on system preferences
- **Export Options**: CSV and JSON export functionality
- **Real-time Updates**: Syncs automatically with GitHub repository

### Technical Features
- **Frontend Only**: Pure HTML5, Alpine.js, and Tailwind CSS
- **GitHub API Integration**: Direct integration with GitHub's REST API
- **OAuth Security**: Secure authentication flow with proper token handling
- **Serverless Functions**: Uses Netlify functions for OAuth token exchange
- **No Database**: Uses GitHub repository JSON files for data persistence

## 🚀 Quick Start

### Live Demo
- **GitHub URL**: https://sirhcrd.github.io/flowdesk-ticket-system *(Clean GitHub link)*
- **Direct URL**: https://flowdesk-tickets.netlify.app *(Full application)*

> Both URLs work! The GitHub link automatically redirects to the full Netlify app with OAuth.

## 🔄 How It Works

### **Deployment Workflow**
1. **You commit** to GitHub (like you just did!)
2. **GitHub Pages** automatically updates the redirect page
3. **Netlify** automatically redeploys the main application  
4. **Both URLs work** - users can access via either

### **Why This Setup?**
- ✅ **Clean GitHub URL** for sharing: `github.io/flowdesk-ticket-system`
- ✅ **OAuth functionality** works perfectly on Netlify
- ✅ **Automatic deployments** from your GitHub commits
- ✅ **Environment variables** securely stored on Netlify
- ✅ **Best of both worlds** - simple URL + full functionality

### Setup Your Own Instance

1. **Fork this repository**
   ```bash
   git clone https://github.com/yourusername/ticketSystem.git
   cd ticketSystem
   ```

2. **Create GitHub OAuth App**
   - Go to GitHub Settings → Developer settings → OAuth Apps
   - Click "New OAuth App"
   - Set Authorization callback URL to: `https://your-netlify-domain.netlify.app/`
   - Note your Client ID and Client Secret

3. **Deploy to Netlify**
   - Connect your forked repository to Netlify
   - Set environment variables:
     - `GITHUB_CLIENT_SECRET`: Your OAuth app client secret
   - Update `static/js/github-oauth.js` with your Client ID
   - Deploy the site

4. **Configure GitHub Repository**
   - Create a new repository for ticket data storage
   - Update the repository configuration in the app settings
   - The app will automatically create necessary JSON files

### Local Development

1. **Clone and setup**
   ```bash
   git clone https://github.com/yourusername/ticketSystem.git
   cd ticketSystem
   ```

2. **Install Netlify CLI** (for local OAuth testing)
   ```bash
   npm install -g netlify-cli
   netlify dev
   ```

3. **Configure OAuth**
   - Update `static/js/github-oauth.js` with your GitHub OAuth app Client ID
   - Set `GITHUB_CLIENT_SECRET` in Netlify environment variables

4. **Access locally**
   - Open http://localhost:8888 (Netlify dev server)
   - Sign in with your GitHub account

## ⚙️ Configuration

### GitHub OAuth App Setup
1. **Application Name**: FlowDesk Tickets (or your choice)
2. **Homepage URL**: `https://your-domain.netlify.app`
3. **Authorization callback URL**: `https://your-domain.netlify.app/`
4. **Client ID**: Copy this to `static/js/github-oauth.js`
5. **Client Secret**: Add to Netlify environment variables

### Data Storage Configuration
**IMPORTANT**: FlowDesk uses a **separate GitHub repository** for data storage to prevent data loss during code deployments.

**First Time Setup:**
1. After signing in, you'll be prompted to configure your data repository
2. Choose to use the default `flowdesk-data` repository (recommended)
3. The repository will be created automatically if it doesn't exist
4. All your tickets, columns, and settings will be stored there

**Data Repository Structure:**
- `data/tickets.json` - All ticket data
- `data/users.json` - Team member information  
- `data/columns.json` - Kanban column definitions
- `data/activities.json` - Ticket activity history

**Team Collaboration:**
- Share your data repository name with team members
- They'll be prompted to enter the same repository name
- Everyone accesses the same shared ticket data

### Environment Variables
Required Netlify environment variables:
```
GITHUB_CLIENT_SECRET=your_oauth_app_client_secret
```

## 📁 File Structure

```
ticketSystem/
├── index.html                 # Main application interface
├── static/
│   ├── js/
│   │   ├── github-oauth.js   # GitHub OAuth integration
│   │   ├── github-database.js # GitHub API data management
│   │   └── app-clean.js      # Alpine.js application logic
│   └── css/
│       └── styles.css        # Custom styles (Tailwind)
├── .netlify/
│   └── functions/
│       └── github-oauth.js   # OAuth token exchange function
├── data/                     # GitHub-stored JSON files
│   ├── tickets.json
│   ├── users.json
│   └── settings.json
└── netlify.toml             # Netlify configuration
```

## 🔧 Technical Architecture

### Authentication Flow
1. User clicks "Sign in with GitHub"
2. Redirects to GitHub OAuth authorization
3. GitHub redirects back with authorization code
4. Netlify function exchanges code for access token
5. App stores token securely and authenticates API calls

### Data Storage
- **GitHub Repository**: Acts as the database
- **JSON Files**: Store structured data in `data/` directory
- **GitHub API**: All CRUD operations via authenticated API calls
- **Collaboration**: Multiple users can access same repository

### Frontend Stack
- **Alpine.js**: Reactive JavaScript framework
- **Tailwind CSS**: Utility-first CSS framework
- **SortableJS**: Drag-and-drop functionality
- **GitHub API**: Data persistence and collaboration

## 🛠️ Development

### Adding Features
1. **Frontend**: Edit `index.html` and Alpine.js components
2. **Styling**: Use Tailwind CSS classes or add custom CSS
3. **Data Logic**: Modify `github-database.js` for data operations
4. **Authentication**: Update `github-oauth.js` if needed

### Testing OAuth Locally
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Start local development server
netlify dev

# Access at http://localhost:8888
```

### Deployment
1. **Push to GitHub**: Commits automatically trigger Netlify deployment
2. **Environment Variables**: Set in Netlify dashboard
3. **Custom Domain**: Configure in Netlify domain settings

## 🤝 Collaboration

### Team Setup
1. **Data Repository**: Create or use existing data repository (e.g., `username/flowdesk-data`)
2. **Team Access**: Add team members as collaborators to your **data repository**
3. **Repository Configuration**: Each team member enters the same data repository name when prompted
4. **Permission Levels**: 
   - **Admin**: Full access (repository admin)
   - **User**: Read/write access (repository collaborator)
5. **Automatic Sync**: Changes sync across all team members through GitHub

### Important Notes
- **Code Repository**: `sirhcrd/flowdesk-ticket-system` (this repo - contains the application)
- **Data Repository**: `your-username/flowdesk-data` (your data - tickets, columns, etc.)
- **Separation Benefits**: Code updates never affect your ticket data!

### Data Sharing
- All ticket data is stored in shared GitHub repository
- Real-time collaboration through GitHub's infrastructure
- Version control and history tracking included
- Backup and restore via GitHub repository features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: Create issues in the GitHub repository
- **Authentication Problems**: Check GitHub OAuth app configuration
- **Deployment**: Review Netlify deployment logs
- **Data Issues**: Verify GitHub repository permissions

---

**🌟 Star this repository if you find it useful!**
- [ ] SLA management
- [ ] Knowledge base integration

---

**Built with ❤️ by the FlowDesk Team** | [Website](https://yourcompany.com) | [Documentation](https://docs.yourcompany.com)