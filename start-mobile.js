// Script wrapper para iniciar o Expo a partir da raiz do monorepo
process.chdir('./mobile');
process.argv = ['node', 'expo', 'start', '--web', '--port', '8081'];
require('./mobile/node_modules/@expo/cli/build/bin/cli');
