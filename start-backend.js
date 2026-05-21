// Script wrapper para iniciar o backend a partir da raiz do monorepo
process.chdir('./backend');
require('./backend/node_modules/@nestjs/cli/bin/nest.js');
