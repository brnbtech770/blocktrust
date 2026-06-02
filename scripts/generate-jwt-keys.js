const { generateKeyPairSync } = require('crypto');
const { writeFileSync, readFileSync, existsSync } = require('fs');
const { join } = require('path');

const { privateKey, publicKey } = generateKeyPairSync('ec', {
  namedCurve: 'P-256',
});

const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });

// SÉCURITÉ : ne JAMAIS imprimer les clés (surtout la privée) en stdout.
// On les écrit uniquement dans .env.local (gitignored).
console.log('✅ Clés JWT (ES256) générées.');

// Ajouter au fichier .env.local
const envLocalPath = join(process.cwd(), '.env.local');
let envContent = '';

if (existsSync(envLocalPath)) {
  envContent = readFileSync(envLocalPath, 'utf-8');
} else {
  console.log('\n📝 Création du fichier .env.local...');
}

// Vérifier si les clés existent déjà
const hasPrivateKey = envContent.includes('BLOCKTRUST_JWT_PRIVATE_KEY');
const hasPublicKey = envContent.includes('BLOCKTRUST_JWT_PUBLIC_KEY');

if (hasPrivateKey || hasPublicKey) {
  console.log('\n⚠️  Les clés JWT existent déjà dans .env.local');
  console.log('   Suppression des anciennes clés...');
  
  // Supprimer les anciennes clés (multiline regex)
  envContent = envContent.replace(/BLOCKTRUST_JWT_PRIVATE_KEY=.*?(?=\n[A-Z_]|\n$|$)/gs, '');
  envContent = envContent.replace(/BLOCKTRUST_JWT_PUBLIC_KEY=.*?(?=\n[A-Z_]|\n$|$)/gs, '');
}

// Formater les clés pour .env.local (une seule ligne avec \n)
const privateKeyFormatted = privateKeyPem.replace(/\n/g, '\\n').trim();
const publicKeyFormatted = publicKeyPem.replace(/\n/g, '\\n').trim();

// Ajouter les nouvelles clés
if (envContent && !envContent.endsWith('\n')) {
  envContent += '\n';
}
envContent += `\n# Clés JWT pour la signature des tokens (générées automatiquement)\n`;
envContent += `BLOCKTRUST_JWT_PRIVATE_KEY="${privateKeyFormatted}"\n`;
envContent += `BLOCKTRUST_JWT_PUBLIC_KEY="${publicKeyFormatted}"\n`;

writeFileSync(envLocalPath, envContent, 'utf-8');
console.log('\n✅ Clés ajoutées au fichier .env.local');
console.log(`📁 Fichier: ${envLocalPath}`);
