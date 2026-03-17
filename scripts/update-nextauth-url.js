const fs = require('fs');
const path = require('path');

const envLocalPath = path.join(process.cwd(), '.env.local');

console.log('🔧 Mise à jour de NEXTAUTH_URL dans .env.local...\n');

try {
  let envContent = '';
  
  // Lire le fichier existant
  if (fs.existsSync(envLocalPath)) {
    envContent = fs.readFileSync(envLocalPath, 'utf8');
    console.log('✅ Fichier .env.local trouvé\n');
  } else {
    console.log('❌ Fichier .env.local non trouvé');
    process.exit(1);
  }
  
  // Créer une sauvegarde
  const backupPath = envLocalPath + '.backup.' + Date.now();
  fs.writeFileSync(backupPath, envContent, 'utf8');
  console.log(`💾 Sauvegarde créée: ${backupPath}\n`);
  
  // Remplacer ou ajouter NEXTAUTH_URL
  const lines = envContent.split('\n');
  const newLines = [];
  let found = false;
  
  for (const line of lines) {
    if (line.trim().startsWith('NEXTAUTH_URL=')) {
      newLines.push('NEXTAUTH_URL=http://localhost:3002');
      found = true;
      console.log('🔄 Mise à jour de NEXTAUTH_URL');
    } else {
      newLines.push(line);
    }
  }
  
  if (!found) {
    newLines.push('NEXTAUTH_URL=http://localhost:3002');
    console.log('➕ Ajout de NEXTAUTH_URL');
  }
  
  // Écrire le fichier
  const newContent = newLines.join('\n');
  if (!newContent.endsWith('\n')) {
    newContent += '\n';
  }
  
  fs.writeFileSync(envLocalPath, newContent, 'utf8');
  
  console.log('\n✅ Fichier .env.local mis à jour avec succès!');
  console.log('   NEXTAUTH_URL=http://localhost:3002');
  console.log('\n' + '='.repeat(60));
  
} catch (error) {
  console.error('❌ Erreur:', error.message);
  if (error.code === 'EPERM') {
    console.error('\n💡 Permission refusée. Exécutez ce script manuellement:');
    console.error('   node scripts/update-nextauth-url.js');
  }
  process.exit(1);
}
