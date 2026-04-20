require('dotenv').config();
const express = require('express');
const path = require('path');
const ejs = require('ejs');
const cookieParser = require('cookie-parser');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT ||80;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(routes);

app.listen(PORT, () => {
  const isDev = process.env.NODE_ENV === 'development';
  const URLBASE = isDev 
    ? `http://localhost:${PORT}` 
    : process.env.PUBLIC_URL || 'https://your-domain.com';
  
  console.log(`Server running on port ${PORT} ${URLBASE}`);
  console.log(`Mode: ${isDev ? 'Development (nodemon)' : 'Production'}`);
});