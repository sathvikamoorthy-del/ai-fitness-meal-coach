// API entry: starts the HTTP server on PORT (default 3000).
import { start } from './http/server';

start()
  .then((server) => {
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : addr;
    console.log(`api listening on http://localhost:${port}`);
  })
  .catch((err) => {
    console.error('api failed to start:', err);
    process.exit(1);
  });
