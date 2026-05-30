/**
 * deploy_node.js - Deploy Bengkel POS ke VPS menggunakan password SSH
 * Jalankan: node deploy_node.js
 */

const { Client } = require('ssh2');
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const VPS_IP   = '173.212.243.240';
const VPS_USER = 'root';
const VPS_PASS = 'Ahmad_dcc07';
const ROOT     = __dirname;

const SSH_OPTS = {
  host: VPS_IP,
  port: 22,
  username: VPS_USER,
  password: VPS_PASS,
  readyTimeout: 20000
};

// ── Helper: jalankan perintah SSH ──────────────────────────────────────────
function remoteExec(command) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let output = '';
    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) { conn.end(); return reject(err); }
        stream
          .on('close', (code) => { conn.end(); resolve({ code, output }); })
          .on('data', (d) => { output += d; process.stdout.write(d); })
          .stderr.on('data', (d) => { output += d; process.stderr.write(d); });
      });
    }).on('error', reject).connect(SSH_OPTS);
  });
}

// ── Helper: upload folder via SFTP ─────────────────────────────────────────
function uploadDir(localDir, remoteDir) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) { conn.end(); return reject(err); }

        const files = getAllFiles(localDir);
        let done = 0;

        if (files.length === 0) { conn.end(); return resolve(); }

        files.forEach(localFile => {
          const relative  = path.relative(localDir, localFile).replace(/\\/g, '/');
          const remotePath = `${remoteDir}/${relative}`;
          const remoteParent = path.posix.dirname(remotePath);

          sftp.mkdir(remoteParent, { mode: 0o755 }, () => {
            // ignore error (dir may already exist)
            sftp.fastPut(localFile, remotePath, (putErr) => {
              if (putErr) {
                // Try creating parent dir recursively then retry
                mkdirRemote(sftp, remoteParent, () => {
                  sftp.fastPut(localFile, remotePath, (e2) => {
                    if (e2) console.error(`  [WARN] Failed to upload ${relative}: ${e2.message}`);
                    done++;
                    if (done === files.length) { conn.end(); resolve(); }
                  });
                });
              } else {
                done++;
                if (done === files.length) { conn.end(); resolve(); }
              }
            });
          });
        });
      });
    }).on('error', reject).connect(SSH_OPTS);
  });
}

function mkdirRemote(sftp, remoteDir, cb) {
  const parts = remoteDir.split('/').filter(Boolean);
  let current = '';
  let i = 0;
  const next = () => {
    if (i >= parts.length) return cb();
    current += '/' + parts[i++];
    sftp.mkdir(current, () => next());
  };
  next();
}

function getAllFiles(dir, base = dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files = files.concat(getAllFiles(full, base));
    else files.push(full);
  }
  return files;
}

// ── Helper: jalankan build lokal ──────────────────────────────────────────
function localBuild(label, cwd) {
  console.log(`\n  Building ${label}...`);
  const result = spawnSync('npm', ['run', 'build'], {
    cwd,
    stdio: 'inherit',
    shell: true
  });
  if (result.status !== 0) {
    throw new Error(`Build ${label} GAGAL! (exit code ${result.status})`);
  }
  console.log(`  [OK] ${label} built.`);
}

// ── MAIN ──────────────────────────────────────────────────────────────────
(async () => {
  const startTime = Date.now();
  console.log('');
  console.log('============================================================');
  console.log('  DEPLOY BENGKEL POS KE VPS');
  console.log(`  ${new Date().toLocaleString('id-ID')}`);
  console.log('============================================================');

  try {
    // [0] Test koneksi
    console.log('\n[0/5] Test koneksi VPS...');
    const pingResult = await remoteExec("echo 'PONG'");
    if (!pingResult.output.includes('PONG')) throw new Error('VPS tidak merespon!');
    console.log('[OK] VPS terhubung.');

    // [1] Setup direktori
    console.log('\n[1/5] Setup direktori di VPS...');
    await remoteExec('mkdir -p /var/www/bengkel/frontend /var/www/bengkel/mobile');
    console.log('[OK] Direktori siap.');

    // [2] Build frontend
    console.log('\n[2/5] Build Frontend (Dashboard)...');
    localBuild('Frontend', path.join(ROOT, 'frontend'));

    // [3] Build mobile
    console.log('\n[3/5] Build Mobile...');
    localBuild('Mobile', path.join(ROOT, 'mobile'));

    // [4] Upload ke VPS
    console.log('\n[4/5] Upload ke VPS...');
    console.log('  Membersihkan file lama...');
    await remoteExec('rm -rf /var/www/bengkel/frontend/* /var/www/bengkel/mobile/*');

    const frontendDist = path.join(ROOT, 'frontend', 'dist');
    const mobileDist   = path.join(ROOT, 'mobile',   'dist');

    console.log('  Upload Frontend...');
    await uploadDir(frontendDist, '/var/www/bengkel/frontend');
    console.log('  [OK] Frontend uploaded.');

    console.log('  Upload Mobile...');
    await uploadDir(mobileDist, '/var/www/bengkel/mobile');
    console.log('  [OK] Mobile uploaded.');

    // [5] Finalisasi
    console.log('\n[5/5] Reload Nginx + restart PM2...');
    const finalResult = await remoteExec(
      "systemctl reload nginx 2>/dev/null || true; pm2 restart bengkel-backend 2>/dev/null || echo 'PM2 tidak ditemukan, skip.'; echo 'DEPLOY_DONE'"
    );

    // Verifikasi
    console.log('\nVerifikasi file di VPS...');
    await remoteExec("ls /var/www/bengkel/frontend/ | head -8; echo '---'; ls /var/www/bengkel/mobile/ | head -8");

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('');
    console.log('============================================================');
    console.log('  DEPLOY SELESAI! (' + elapsed + 's)');
    console.log('');
    console.log(`  Dashboard  : http://${VPS_IP}`);
    console.log(`  Mobile     : http://${VPS_IP}:8080`);
    console.log(`  API Backend: http://${VPS_IP}:3002/api`);
    console.log('============================================================');
    console.log('');

  } catch (err) {
    console.error('\n[ERROR]', err.message);
    process.exit(1);
  }
})();
