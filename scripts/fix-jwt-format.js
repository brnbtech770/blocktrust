const fs = require('fs');
const path = require('path');

const envLocalPath = path.join(process.cwd(), '.env.local');

console.log('🔧 Script de correction du format des clés JWT\n');
console.log('='.repeat(60));

if (!fs.existsSync(envLocalPath)) {
  console.log('❌ Fichier .env.local non trouvé');
  console.log('   Créez d\'abord le fichier .env.local avec vos variables');
  process.exit(1);
}

try {
  let env = fs.readFileSync(envLocalPath, 'utf8');
  let modified = false;
  
  // Fonction pour reformater une clé JWT
  function reformatJwtKey(keyName, beginMarker, endMarker) {
    // Chercher la clé avec regex multiline
    const regex = new RegExp(`${keyName}\\s*=\\s*"([^"]*(?:BEGIN[^"]*END[^"]*)+[^"]*)"`, 's');
    const match = env.match(regex);
    
    if (!match) {
      // Essayer avec des retours à la ligne réels
      const multilineRegex = new RegExp(`${keyName}\\s*=\\s*"([^"]*)"`, 's');
      const multilineMatch = env.match(multilineRegex);
      
      if (multilineMatch) {
        let keyValue = multilineMatch[1];
        
        // Vérifier si la clé contient de vrais retours à la ligne
        if (keyValue.includes('\n') && !keyValue.includes('\\n')) {
          console.log(`\n🔧 Reformattage de ${keyName}...`);
          
          // Remplacer les vrais retours à la ligne par \n
          keyValue = keyValue.replace(/\r\n/g, '\\n').replace(/\n/g, '\\n');
          
          // S'assurer qu'il y a un \n à la fin
          if (!keyValue.endsWith('\\n')) {
            keyValue += '\\n';
          }
          
          // Remplacer dans le fichier
          env = env.replace(multilineRegex, `${keyName}="${keyValue}"`);
          modified = true;
          
          console.log(`   ✅ ${keyName} reformatée`);
          return true;
        }
      }
    }
    
    return false;
  }
  
  // Reformater les clés JWT
  const privateKeyFixed = reformatJwtKey('BLOCKTRUST_JWT_PRIVATE_KEY', 'BEGIN PRIVATE KEY', 'END PRIVATE KEY');
  const publicKeyFixed = reformatJwtKey('BLOCKTRUST_JWT_PUBLIC_KEY', 'BEGIN PUBLIC KEY', 'END PUBLIC KEY');
  
  if (modified) {
    // Créer une sauvegarde
    const backupPath = envLocalPath + '.backup';
    fs.writeFileSync(backupPath, fs.readFileSync(envLocalPath), 'utf8');
    console.log(`\n💾 Sauvegarde créée: ${backupPath}`);
    
    // Écrire le fichier modifié
    fs.writeFileSync(envLocalPath, env, 'utf8');
    console.log(`\n✅ Fichier .env.local mis à jour`);
    console.log('\n📋 Résumé des modifications:');
    if (privateKeyFixed) console.log('   ✅ BLOCKTRUST_JWT_PRIVATE_KEY reformatée');
    if (publicKeyFixed) console.log('   ✅ BLOCKTRUST_JWT_PUBLIC_KEY reformatée');
    
    console.log('\n💡 Redémarrez le serveur: npm run dev');
  } else {
    console.log('\n✅ Les clés JWT sont déjà au bon format');
    console.log('   Aucune modification nécessaire');
  }
  
  console.log('\n' + '='.repeat(60));
  
} catch (error) {
  console.error('❌ Erreur:', error.message);
  if (error.code === 'EPERM') {
    console.error('\n💡 Permission refusée. Exécutez ce script manuellement:');
    console.error('   node scripts/fix-jwt-format.js');
  }
  process.exit(1);
}
