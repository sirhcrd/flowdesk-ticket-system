# GitHub OAuth App Setup Instructions

## Create GitHub OAuth Application

1. **Go to GitHub Developer Settings**:
   - Visit: https://github.com/settings/developers
   - Click "New OAuth App"

2. **Fill in Application Details**:
   ```
   Application name: FlowDesk Ticket System
   Homepage URL: https://sirhcrd.github.io/flowdesk-ticket-system
   Authorization callback URL: https://sirhcrd.github.io/flowdesk-ticket-system/auth/callback
   Application description: Collaborative ticket management system with GitHub integration
   ```

3. **After Creating the App**:
   - Copy your **Client ID** 
   - Generate and copy your **Client Secret**
   - Keep these secure!

## For Local Development (Optional)

If you want to test locally:
```
Application name: FlowDesk Ticket System (Local)
Homepage URL: http://localhost:3000
Authorization callback URL: http://localhost:3000/auth/callback
```

## Security Notes

- **Client Secret**: Never expose in frontend code
- **Use HTTPS**: GitHub requires HTTPS for production OAuth
- **Validate State**: Always validate the state parameter to prevent CSRF attacks

## Next Steps

1. Register the OAuth app with the details above
2. Copy the Client ID and Client Secret
3. We'll implement a secure OAuth flow that keeps the secret on a backend service