import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './database/client.js';

const server = app.listen(env.PORT, () => console.info(`METRICAST API listening on port ${env.PORT}`));
const shutdown = async () => {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
