const app = require('./app');
const { connectDatabase } = require('./db/pool');

const port = Number(process.env.PORT) || 3000;

connectDatabase()
	.then(() => app.listen(port, () => console.log(`RFQ marketplace listening on http://localhost:${port}`)))
	.catch((error) => {
		console.error('Unable to connect to MongoDB:', error.message);
		process.exit(1);
	});
