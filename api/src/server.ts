import express from 'express';
import { config } from './config.js';
import { errorHandler, notFound } from './errors.js';
import { closePrisma } from './prisma.js';
import router from './routes.js';
import { applySecurity } from './security.js';

const app = express();

applySecurity(app);
app.use('/api', router);
app.use((_req, _res) => notFound('API route not found.'));
app.use(errorHandler);

const server = app.listen(config.port, () => {
  console.log(`Phulpur24 API ready on http://127.0.0.1:${config.port}/api`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received. Closing API server.`);
  server.close(async () => {
    await closePrisma();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
