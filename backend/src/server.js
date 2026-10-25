const environment = require('./config/environment');
environment.assertRequiredEnvironment();

const app = require('./app');
const { query } = require('./config/database');
const { startBackgroundJobs } = require('./jobs/backgroundJobs');

async function start() {
  try {
    await query('SELECT 1');
  } catch (error) {
    console.error('Cannot connect to PostgreSQL. Check DATABASE_URL in backend/.env and that PostgreSQL is running.');
    console.error(error.message);
    process.exit(1);
  }

  app.listen(environment.port, () => console.log(`AegisCart API running on port ${environment.port}`));
  startBackgroundJobs();
}

start();
