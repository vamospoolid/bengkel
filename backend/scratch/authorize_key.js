const { Client } = require('ssh2');

const VPS_IP   = '173.212.243.240';
const VPS_USER = 'root';
const VPS_PASS = 'Ahmad_dcc07';

const pubKey = `ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDW7QkvKGcTeeZuHu/FmdcQySdb5H9GDwnzsaSqrGM5l0btB6J1QBOc63lEyrVFSfPU5BU+DeFeFM7Otsa/PY4qGCU8vfuUzZ65JF+GHVp0IdvcWIO8z8GewrtQQ+/cKS7Iq/aaR6mBtDOK2DUsfIvH06DElNby4koxkA85EltIgDh9fuAfusOL3AUxszvXwRbsbSOEQYGdqYq1kHHuUn4EW2H25QDOU3K3abOgav1T0CAftz1bBCU7ckHB68pKOy5E2aiwSnXEt56HdJ6vxyH3EhPFWeOdJNRtbf8Cuac4SUmlAn2sUmZwoAD37uMB6HHKfqxWs5pHACu8f5Ub6e6ryt5rUmnnlbnjscFoc0mK2ATNNkK099KZ7CC/BiHaUjWD5xIxWxSfQ69/8e3g6CH92zSnhC63T/n3iDQA7uAa/FNokhd/NwRS1EpZ3cBUfaojKzIuHQW5/+vAc4Tg/vT5Q1mi86sCkHSUcJqWeJddgEEhFnEIbs9hZccIAkW7IH3BkNojDW9Kow4T5N8ofMVJisbekgs3C803U59PKS/Nshpu7SPXR5b2vFlNthblr/FC4lVWuh9ykaIFrEcnkpfQ1Zy0iAabX3kFe1WDNReHfjqfftEHL6yk+THGWt7jKEa5LC/P6q8SY62Lj7woAU2n5MnRianB6+TOfI2tZOeWVw== personal@DESKTOP-3NA1GAL`;

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection established. Authorizing key...');
  conn.exec(`mkdir -p ~/.ssh && echo "${pubKey}" >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys && echo "SSH_KEY_SETUP_OK"`, (err, stream) => {
    if (err) {
      console.error('Execution error:', err);
      conn.end();
      process.exit(1);
    }
    stream.on('close', (code) => {
      console.log('Command finished with exit code:', code);
      conn.end();
      process.exit(0);
    }).on('data', (data) => {
      console.log('STDOUT:', data.toString());
    }).stderr.on('data', (data) => {
      console.error('STDERR:', data.toString());
    });
  });
}).on('error', (err) => {
  console.error('Connection error:', err);
  process.exit(1);
}).connect({
  host: VPS_IP,
  port: 22,
  username: VPS_USER,
  password: VPS_PASS,
  readyTimeout: 10000
});
