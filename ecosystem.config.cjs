const path = require('path');

module.exports = {
  apps: [
    {
      name: 'festosh-api',
      script: 'node',
      args: '--import tsx server/index.ts',
      cwd: __dirname,
      watch: false,
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: 'development',
      },
    },
    {
      name: 'festosh-front',
      script: path.join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js'),
      args: 'preview --port 3002 --host',
      cwd: __dirname,
      watch: false,
      autorestart: true,
      max_restarts: 10,
    },
  ],
};
