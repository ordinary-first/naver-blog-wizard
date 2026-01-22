export default async function handler(request, response) {
    // CORS Handling
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    response.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (request.method === 'OPTIONS') {
        response.status(200).end();
        return;
    }

    const { code, state } = request.query;

    if (!code || !state) {
        return response.status(400).json({ error: 'Missing code or state' });
    }

    const client_id = process.env.VITE_NAVER_SEARCH_CLIENT_ID;
    const client_secret = process.env.VITE_NAVER_SEARCH_CLIENT_SECRET;

    // Note: In Vercel, standard env vars are accessed via process.env. 
    // We reuse VITE_ prefixed vars here for convenience if they are set in Vercel project settings,
    // but ideally they should be renamed to just NAVER_... in production variables.

    if (!client_id || !client_secret) {
        return response.status(500).json({ error: 'Server misconfiguration: Credentials missing' });
    }

    try {
        const tokenUrl = `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${client_id}&client_secret=${client_secret}&code=${code}&state=${state}`;

        const naverResponse = await fetch(tokenUrl);
        const data = await naverResponse.json();

        if (data.error) {
            return response.status(400).json(data);
        }

        // Return the token to the client (or set a session cookie in Phase 2)
        return response.status(200).json(data);
    } catch (error) {
        console.error('Naver Token Exchange Error:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}
