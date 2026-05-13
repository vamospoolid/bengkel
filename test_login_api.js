const http = require('http');

const data = JSON.stringify({ username: 'admin', password: 'admin123' });

const options = {
  hostname: '173.212.243.240',
  port: 80,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let resData = '';
  res.on('data', chunk => resData += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, '\nDATA:', resData));
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
