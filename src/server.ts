import { buildContainer } from './container';
import { createApp } from './app';

try {
  process.loadEnvFile(); // charge .env s'il existe (Node >= 20.12)
} catch {
  /* pas de fichier .env : on garde les variables d'environnement existantes */
}

async function main() {
  const container = await buildContainer(undefined, { emailConsole: true });
  const port = Number(process.env.PORT ?? 3000);
  const server = createApp(container).listen(port, () => {
    console.log(`API campus-incidents sur http://localhost:${port}/api (mode : ${container.mode})`);
  });

  const stop = () => server.close(() => container.shutdown().then(() => process.exit(0)));
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
