const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://173.212.243.240/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    console.log('VPS LOGIN SUCCESS:', res.data);
  } catch (err) {
    console.log('VPS LOGIN FAILED:', err.response?.status, err.response?.data || err.message);
  }
}
test();
