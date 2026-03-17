const fs = require('fs');
const path = require('path');

const envLocalPath = path.join(process.cwd(), '.env.local');

console.log('🔧 Mise à jour de .env.local...\n');

// Variables à ajouter/remplacer
const updates = {
  'NEXTAUTH_SECRET': 'NEXTAUTH_SECRET="blocktrust-dev-secret-2026-change-in-prod"',
  'BLOCKTRUST_JWT_PRIVATE_KEY': 'BLOCKTRUST_JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgN2LAz0X5bPFLvDGsNm6r8OSfQnNBFDMYGqW9jsD8MpmhRANCAAQGn1F4FeKv6NQKC0YzF1UTJvmJN4LSf3S8C3CQhPH3D2L8PsJQ4Np3sU1TLRqvmAE0BmPUA0P6v7U3PV9uqMHl\n-----END PRIVATE KEY-----"',
  'BLOCKTRUST_JWT_PUBLIC_KEY': 'BLOCKTRUST_JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEBp9ReBXir+jUCgtGMxdVEyb5iTeC0n90vAtwkITx9w9i/D7CUODad7FNUy0ar5gBNAZj1AND+r+1Nz1fbqjB5Q==\n-----END PUBLIC KEY-----"'
};

try {
  let envContent = '';
  
  // Lire le fichier existant s'il existe
  if (fs.existsSync(envLocalPath)) {
    envContent = fs.readFileSync(envLocalPath, 'utf8');
    console.log('✅ Fichier .env.local trouvé\n');
  } else {
    console.log('📝 Création du fichier .env.local\n');
  }
  
  // Créer une sauvegarde
  if (fs.existsSync(envLocalPath)) {
    const backupPath = envLocalPath + '.backup.' + Date.now();
    fs.writeFileSync(backupPath, envContent, 'utf8');
    console.log(`💾 Sauvegarde créée: ${backupPath}\n`);
  }
  
  // Traiter chaque ligne
  const lines = envContent.split('\n');
  const newLines = [];
  const updatedKeys = new Set();
  
  // Parcourir les lignes existantes
  for (const line of lines) {
    let shouldSkip = false;
    
    // Vérifier si cette ligne contient une variable à mettre à jour
    for (const [key, newValue] of Object.entries(updates)) {
      if (line.trim().startsWith(key + '=') || line.trim().startsWith('#' + key)) {
        // Remplacer cette ligne
        newLines.push(newValue);
        updatedKeys.add(key);
        shouldSkip = true;
        break;
      }
    }
    
    if (!shouldSkip) {
      newLines.push(line);
    }
  }
  
  // Ajouter les variables manquantes
  for (const [key, value] of Object.entries(updates)) {
    if (!updatedKeys.has(key)) {
      newLines.push(value);
      console.log(`➕ Ajout de ${key}`);
    } else {
      console.log(`🔄 Mise à jour de ${key}`);
    }
  }
  
  // Écrire le fichier
  let newContent = newLines.join('\n');
  if (!newContent.endsWith('\n')) {
    newContent += '\n';
  }
  
  fs.writeFileSync(envLocalPath, newContent, 'utf8');
  
  console.log('\n✅ Fichier .env.local mis à jour avec succès!');
  console.log('\n📋 Variables ajoutées/mises à jour:');
  Object.keys(updates).forEach(key => console.log(`   ✅ ${key}`));
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Terminé! Vous pouvez maintenant redémarrer le serveur.');
  
} catch (error) {
  console.error('❌ Erreur:', error.message);
  if (error.code === 'EPERM') {
    console.error('\n💡 Permission refusée. Exécutez ce script manuellement:');
    console.error('   node scripts/update-env-local.js');
  }
  process.exit(1);
}
