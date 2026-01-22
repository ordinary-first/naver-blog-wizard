export default async function handler(request, response) {
    // CORS Handling
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    response.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    if (request.method === 'OPTIONS') {
        response.status(200).end();
        return;
    }

    const authHeader = request.headers.authorization;

    if (!authHeader) {
        return response.status(401).json({ error: 'Authorization header required' });
    }

    try {
        const profileResponse = await fetch('https://openapi.naver.com/v1/nid/me', {
            headers: { Authorization: authHeader }
        });

        const data = await profileResponse.json();

        if (data.resultcode !== '00') {
            return response.status(400).json(data);
        }

        return response.status(200).json(data);
    } catch (error) {
        console.error('Naver Profile Fetch Error:', error);
        return response.status(500).json({ error: 'Internal Server Error' });
    }
}
