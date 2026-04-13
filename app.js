require('dotenv').config();
const express = require('express');
const path = require('path');
const ejs = require('ejs');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 80;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.use(routes);

app.listen(PORT, () => {
  const isDev = process.env.NODE_ENV === 'development';
  const URLBASE = isDev 
    ? `http://localhost:${PORT}` 
    : process.env.PUBLIC_URL || 'https://your-domain.com';
  
  console.log(`Server running on ${URLBASE}`);
  console.log(`Mode: ${isDev ? 'Development (nodemon)' : 'Production'}`);
});