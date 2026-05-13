import jwt from 'jsonwebtoken';

async function test() {
  const token = jwt.sign({ id: 'some-id', role: 'ADMIN' }, 'admin');
  try {
    const res = await fetch('http://localhost:3002/api/products', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    console.log('Response:', data);
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}
test();
