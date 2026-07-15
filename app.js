import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import routes from './routes/index.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 80;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(routes);

// Export for Vercel serverless runtime
export default app;

// Only start the server when running locally (not on Vercel)
if (!process.env.VERCEL) {
app.listen(PORT, () => {
  const isDev = process.env.NODE_ENV === 'development';
  const URLBASE = isDev
    ? `http://localhost:${PORT}`
    : process.env.PUBLIC_URL || 'https://your-domain.com';

  console.log(`Server running on port ${PORT} ${URLBASE}`);
  console.log(`Mode: ${isDev ? 'Development (nodemon)' : 'Production'}`);
});
}

