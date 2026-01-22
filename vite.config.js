import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/map-place': {
          target: 'https://naveropenapi.apigw.ntruss.com',
          changeOrigin: true,
        }
      },
      configureServer(server) {
        server.middlewares.use('/api/naver-callback', async (req, res) => {
          try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const code = url.searchParams.get('code');
            const state = url.searchParams.get('state');

            const client_id = env.VITE_NAVER_SEARCH_CLIENT_ID;
            const client_secret = env.VITE_NAVER_SEARCH_CLIENT_SECRET;

            if (!code || !state) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing code or state' }));
              return;
            }

            const tokenUrl = `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${client_id}&client_secret=${client_secret}&code=${code}&state=${state}`;
            const naverRes = await fetch(tokenUrl);
            const data = await naverRes.json();

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
          } catch (e) {
            console.error(e);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
          }
        });

        server.middlewares.use('/api/naver-me', async (req, res) => {
          try {
            const authHeader = req.headers['authorization'];
            if (!authHeader) {
              res.statusCode = 401;
              res.end(JSON.stringify({ error: 'No Auth Header' }));
              return;
            }
            const profileRes = await fetch('https://openapi.naver.com/v1/nid/me', {
              headers: { Authorization: authHeader }
            });
            const data = await profileRes.json();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
          } catch (e) {
            console.error(e);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
          }
        });
      }
    }
  }
})
