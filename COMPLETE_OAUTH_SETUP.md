# Complete GitHub OAuth Setup for FlowDesk

## Quick Setup Checklist

### ✅ Step 1: Register GitHub OAuth App
1. Go to: https://github.com/settings/applications/new
2. Fill in the form:
   ```
   Application name: FlowDesk Ticket System
   Homepage URL: https://sirhcrd.github.io/flowdesk-ticket-system
   Authorization callback URL: https://sirhcrd.github.io/flowdesk-ticket-system
   Application description: Collaborative ticket management system
   ```
3. Click "Register application"
4. **Copy your Client ID** (looks like: `Ov23li...`)
5. **Generate and copy your Client Secret** (looks like: `github_pat_...`)

### ✅ Step 2: Update Client ID in Code
1. Open `static/js/github-oauth.js`
2. Replace this line:
   ```javascript
   this.clientId = 'Ov23liK8J9X4fN2pQ8mH'; // Replace this with your real client ID
   ```
   With your actual Client ID:
   ```javascript
   this.clientId = 'YOUR_ACTUAL_CLIENT_ID';
   ```

### ✅ Step 3: Deploy with Netlify (Recommended)
1. **Deploy to Netlify**:
   - Connect your GitHub repository to Netlify
   - Deploy the site

2. **Set Environment Variable**:
   - In Netlify Dashboard → Site Settings → Environment Variables
   - Add: `GITHUB_CLIENT_SECRET` = `your_client_secret_here`

3. **Update OAuth App**:
   - Go back to your GitHub OAuth App settings
   - Update the URLs to your Netlify domain:
     ```
     Homepage URL: https://your-site.netlify.app
     Authorization callback URL: https://your-site.netlify.app
     ```

## Alternative: GitHub Pages + External Serverless Function

If you want to keep using GitHub Pages:

1. **Create a separate repository** for the OAuth function
2. **Deploy the function** to Netlify/Vercel separately  
3. **Update the OAuth URLs** in `github-oauth.js` to point to your function

## Testing the Setup

1. **Open your deployed site**
2. **Click "Sign in with GitHub"**
3. **You should be redirected to GitHub**
4. **After authorizing, you should be redirected back**
5. **You should see "💾 Full Access" in the navigation**

## Troubleshooting

### "OAuth not properly configured" alert
- Your Client ID is still the placeholder
- Update it in `github-oauth.js`

### "Token exchange failed" error
- Client Secret not set in Netlify environment variables
- Redirect URI doesn't match exactly
- Netlify function not deployed properly

### "Authentication expired" after some time
- GitHub tokens expire, this is normal
- Users just need to re-authenticate

## Security Features

✅ **Client Secret Security**: Kept on server, never exposed in browser  
✅ **State Validation**: Prevents CSRF attacks  
✅ **HTTPS Required**: GitHub OAuth requires secure connections  
✅ **Token Storage**: Securely stored in localStorage  
✅ **Automatic Cleanup**: Handles token expiration gracefully  

## What Happens After Authentication

1. ✅ User is authenticated with GitHub
2. ✅ User is automatically added to the FlowDesk user database
3. ✅ User can create, edit, and manage tickets
4. ✅ All changes are saved to the GitHub repository
5. ✅ Real-time collaboration with other authenticated users

## Production Deployment Checklist

- [ ] GitHub OAuth App created with correct URLs
- [ ] Client ID updated in code
- [ ] Client Secret set as environment variable
- [ ] Site deployed to Netlify with functions enabled
- [ ] OAuth flow tested end-to-end
- [ ] Ticket creation/editing tested
- [ ] GitHub repository write permissions verified