const { generateKeyPairSync } = require('crypto');
const { writeFileSync, readFileSync, existsSync } = require('fs');
const { join } = require('path');

const { privateKey, publicKey } = generateKeyPairSync('ec', {
  namedCurve: 'P-256',
});

const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });

console.log('✅ Clés JWT générées avec succès!\n');

// Formater les clés pour .env.local (une seule ligne avec \n)
const privateKeyFormatted = privateKeyPem.replace(/\n/g, '\\n').trim();
const publicKeyFormatted = publicKeyPem.replace(/\n/g, '\\n').trim();

// Essayer d'ajouter au fichier .env.local
const envLocalPath = join(process.cwd(), '.env.local');

try {
  let envContent = '';
  
  if (existsSync(envLocalPath)) {
    try {
      envContent = readFileSync(envLocalPath, 'utf-8');
    } catch (err) {
      console.log('⚠️  Impossible de lire .env.local, affichage des clés pour copie manuelle\n');
      envContent = null;
    }
  }

  if (envContent !== null) {
    // Vérifier si les clés existent déjà
    const hasPrivateKey = envContent.includes('BLOCKTRUST_JWT_PRIVATE_KEY');
    const hasPublicKey = envContent.includes('BLOCKTRUST_JWT_PUBLIC_KEY');

    if (hasPrivateKey || hasPublicKey) {
      console.log('⚠️  Les clés JWT existent déjà dans .env.local');
      console.log('   Suppression des anciennes clés...\n');
      
      // Supprimer les anciennes clés (multiline regex)
      envContent = envContent.replace(/BLOCKTRUST_JWT_PRIVATE_KEY=.*?(?=\n[A-Z_]|\n$|$)/gs, '');
      envContent = envContent.replace(/BLOCKTRUST_JWT_PUBLIC_KEY=.*?(?=\n[A-Z_]|\n$|$)/gs, '');
    }

    // Ajouter les nouvelles clés
    if (envContent && !envContent.endsWith('\n')) {
      envContent += '\n';
    }
    envContent += `\n# Clés JWT pour la signature des tokens (générées automatiquement)\n`;
    envContent += `BLOCKTRUST_JWT_PRIVATE_KEY="${privateKeyFormatted}"\n`;
    envContent += `BLOCKTRUST_JWT_PUBLIC_KEY="${publicKeyFormatted}"\n`;

    try {
      writeFileSync(envLocalPath, envContent, 'utf-8');
      console.log('✅ Clés ajoutées au fichier .env.local');
      console.log(`📁 Fichier: ${envLocalPath}\n`);
    } catch (err) {
      console.log('⚠️  Impossible d\'écrire dans .env.local automatiquement');
      console.log('📋 Copiez les lignes suivantes dans votre fichier .env.local :\n');
      console.log('─'.repeat(60));
      console.log('\n# Clés JWT pour la signature des tokens (générées automatiquement)');
      console.log(`BLOCKTRUST_JWT_PRIVATE_KEY="${privateKeyFormatted}"`);
      console.log(`BLOCKTRUST_JWT_PUBLIC_KEY="${publicKeyFormatted}"`);
      console.log('\n' + '─'.repeat(60));
    }
  } else {
    // Afficher pour copie manuelle
    console.log('📋 Copiez les lignes suivantes dans votre fichier .env.local :\n');
    console.log('─'.repeat(60));
    console.log('\n# Clés JWT pour la signature des tokens (générées automatiquement)');
    console.log(`BLOCKTRUST_JWT_PRIVATE_KEY="${privateKeyFormatted}"`);
    console.log(`BLOCKTRUST_JWT_PUBLIC_KEY="${publicKeyFormatted}"`);
    console.log('\n' + '─'.repeat(60));
  }
} catch (err) {
  console.log('⚠️  Erreur lors de l\'écriture du fichier');
  console.log('📋 Copiez les lignes suivantes dans votre fichier .env.local :\n');
  console.log('─'.repeat(60));
  console.log('\n# Clés JWT pour la signature des tokens (générées automatiquement)');
  console.log(`BLOCKTRUST_JWT_PRIVATE_KEY="${privateKeyFormatted}"`);
  console.log(`BLOCKTRUST_JWT_PUBLIC_KEY="${publicKeyFormatted}"`);
  console.log('\n' + '─'.repeat(60));
}

console.log('\n💡 Après avoir ajouté les clés, redémarrez le serveur : npm run dev');
