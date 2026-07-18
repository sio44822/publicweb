const fs = require('fs');
const path = 'C:\\Users\\User\\Desktop\\web\\publicweb\\views\\services.ejs';
let content = fs.readFileSync(path, 'utf-8');

content = content.replace(
  "card.className = 'service-card block bg-white rounded-2xl border border-gray-100 p-6 text-center no-underline fade-in';",
  "card.className = 'service-card rounded-2xl p-2 no-underline fade-in';"
);

const oldBlock1 = '<div class="text-4xl mb-4"></div>\n                    <h2 class="text-lg font-bold text-gray-800 mb-1"></h2>\n                    <p class="text-sm text-gray-400"></p>';
const newBlock1 = '<div class="text-3xl leading-none"></div>\n                    <div class="text-[10px] text-gray-500 font-medium mt-1.5 leading-tight text-center truncate max-w-[68px]"></div>';
content = content.replace(oldBlock1, newBlock1);

fs.writeFileSync(path, content, 'utf-8');
console.log('OK: ' + (content.indexOf('text-3xl') > -1));