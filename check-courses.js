const db = require('./utils/db/connection');
const con = db.get();
const courses = con.prepare('SELECT id, name, slots FROM courses').all();
console.log('Total courses:', courses.length);
courses.forEach(c => {
  console.log(`ID: ${c.id}, Name: ${c.name}`);
  console.log('  Slots:', c.slots);
});