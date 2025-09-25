// Netlify serverless function to handle GitHub OAuth token exchange
// This keeps the client secret secure on the server side

exports.handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { client_id, code, redirect_uri } = JSON.parse(event.body);

        if (!client_id || !code) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required parameters' })
            };
        }

        // GitHub OAuth client secret - set this as an environment variable in Netlify
        const client_secret = process.env.GITHUB_CLIENT_SECRET;
        
        if (!client_secret) {
            console.error('GITHUB_CLIENT_SECRET environment variable not set');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'Server configuration error',
                    message: 'GitHub client secret not configured. Please set GITHUB_CLIENT_SECRET environment variable in Netlify.'
                })
            };
        }

        // Exchange code for access token
        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id,
                client_secret,
                code,
                redirect_uri
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error('GitHub OAuth error:', data);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: data.error,
                    error_description: data.error_description
                })
            };
        }

        if (!data.access_token) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'no_access_token',
                    error_description: 'No access token received from GitHub'
                })
            };
        }

        // Return only the access token (don't log it for security)
        console.log('✅ Successfully exchanged code for token');
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                access_token: data.access_token,
                token_type: data.token_type,
                scope: data.scope
            })
        };

    } catch (error) {
        console.error('OAuth function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'internal_server_error',
                error_description: 'An error occurred processing the OAuth request'
            })
        };
    }
};