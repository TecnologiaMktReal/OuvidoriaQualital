module.exports = {
  apps: [{
    name: 'ouvidoria-qualital-app',
    script: './dist/index.js',
    cwd: '/home/ubuntu/app/OuvidoriaQualital',
    env_production: {
      NODE_ENV: 'production',
      env_file: '.env'
    }
  }]
};


