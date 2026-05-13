const http = require('http');

http.get('http://173.212.243.240/api/products', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, '\nDATA:', data));
}).on('error', err => console.log('ERROR:', err.message));
