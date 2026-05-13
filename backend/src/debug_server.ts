console.log('--- BACKEND DEBUG START ---');
import express from 'express';
const app = express();
app.get('/', (req, res) => res.send('OK'));
app.listen(3001, () => {
  console.log('Server is alive on 3001');
});
