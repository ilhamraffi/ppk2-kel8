const app = require('./app');
const { initDb } = require('./db/initDb');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await initDb();
    console.log('Database initialized successfully.');

    app.listen(PORT, () => {
      console.log(`SakuGue server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

