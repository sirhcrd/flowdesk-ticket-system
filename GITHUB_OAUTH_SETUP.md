# FlowDesk GitHub OAuth Setup

To enable full collaborative features with GitHub integration, you need to set up GitHub OAuth.

## Setup Steps

### 1. Create a GitHub OAuth App

1. Go to GitHub Settings: [https://github.com/settings/applications/new](https://github.com/settings/applications/new)
2. Fill in the application details:
   - **Application name**: `FlowDesk Ticket System`
   - **Homepage URL**: `https://yourusername.github.io/flowdesk-ticket-system` (or your domain)
   - **Authorization callback URL**: `https://yourusername.github.io/flowdesk-ticket-system/` (same as homepage)
   - **Application description**: `Collaborative ticket management system`

3. Click "Register application"

### 2. Configure OAuth Credentials

1. After creating the app, you'll see your **Client ID** and **Client Secret**
2. Open `static/js/github-oauth.js`
3. Replace `YOUR_GITHUB_CLIENT_ID` with your actual Client ID:
   ```javascript
   this.clientId = 'your_actual_client_id_here';
   ```

### 3. Backend Proxy (Recommended for Production)

⚠️ **Security Note**: The current implementation includes the client secret in the frontend code, which is not secure for production use.

For production, you should:

1. Create a backend endpoint that handles the OAuth token exchange
2. Keep the client secret on your server
3. Update the `exchangeCodeForToken` method to call your backend

Example backend endpoint (Node.js/Express):
```javascript
app.post('/api/github-oauth', async (req, res) => {
  const { code } = req.body;
  
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code: code
    })
  });
  
  const data = await response.json();
  res.json(data);
});
```

### 4. Alternative: GitHub Device Flow

For a more secure client-only approach, consider using GitHub's Device Flow:
[GitHub Device Flow Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps#device-flow)

## Features Enabled with OAuth

✅ **Read Access** (no auth required):
- View existing tickets, users, and kanban columns
- Browse the dashboard and statistics
- Export data to CSV/JSON

🔐 **Write Access** (OAuth required):
- Create new tickets and users
- Edit existing tickets
- Move tickets between kanban columns
- Add activities and comments
- Real-time collaboration with team members

## Fallback Mode

If OAuth is not set up, FlowDesk runs in **read-only mode**:
- Users can view all existing data from the GitHub repository
- Full UI functionality for browsing and filtering
- Export capabilities remain available
- No ability to create or modify data

## Testing OAuth Setup

1. Open your FlowDesk application
2. Click "Sign in with GitHub" in the top navigation
3. Authorize the application on GitHub
4. You should be redirected back with full write access
5. Try creating a new ticket to test the integration

## Troubleshooting

- **"Authentication failed"**: Check that your Client ID is correct
- **"Callback URL mismatch"**: Ensure the OAuth app callback URL matches your site URL exactly
- **"Invalid client"**: Verify the client secret is correct (if not using backend proxy)

## Repository Structure

The collaborative data is stored in the `data/` directory:
- `data/tickets.json` - All ticket data
- `data/users.json` - User profiles
- `data/columns.json` - Kanban column configuration
- `data/activities.json` - Activity log and audit trail

Each file includes metadata about the last update and who made changes for full collaboration tracking.