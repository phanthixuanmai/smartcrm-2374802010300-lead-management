const { spawnSync } = require('node:child_process');
const path = require('node:path');

const initialization = spawnSync(
  process.execPath,
  [path.join(__dirname, 'scripts', 'init-db.js')],
  { stdio: 'inherit' }
);

if (initialization.error) {
  console.error('Database initialization process failed:', initialization.error);
  process.exitCode = 1;
} else if (initialization.status !== 0) {
  process.exitCode = initialization.status || 1;
} else {
  require('./server');
}
