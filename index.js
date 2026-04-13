require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 55005;

app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'public', 'css')));
app.use(express.static(path.join(__dirname, 'public', 'js')));

const isDev = process.env.NODE_ENV === 'development';

const URLBASE = isDev 
  ? `http://localhost:${PORT}` 
  : process.env.PUBLIC_URL || 'https://your-domain.com';

app.get('/config', (req, res) => {
  res.json({
    URLBASE: URLBASE,
    mode: isDev ? 'development' : 'production'
  });
});

app.get('/public/1', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', '1.html'));
});

app.get('/public/1.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', '1.html'));
});

app.get('/', (req, res) => {
  res.send(`URLBASE: ${URLBASE}<br>Mode: ${isDev ? 'Development' : 'Production'}`);
});

app.listen(PORT, () => {
  console.log(`Server running on ${URLBASE}`);
  console.log(`Mode: ${isDev ? 'Development (nodemon)' : 'Production'}`);
});