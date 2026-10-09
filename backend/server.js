const app = require('./app');
const config = require('./config');
const pool = require('./config/db');

const server = app.listen(config.port, () => {
    console.log(`BLTF server running on port ${config.port} (${config.nodeEnv})`);
});

async function shutdown() {
    server.close(async () => {
        await pool.end();
        process.exit(0);
    });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);