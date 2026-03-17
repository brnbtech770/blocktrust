const fs = require('fs');
const path = require('path');

const envLocalPath = path.join(process.cwd(), '.env.local');

console.log('🔍 Diagnostic du format des clés JWT dans .env.local\n');
console.log('='.repeat(60));

if (!fs.existsSync(envLocalPath)) {
  console.log('❌ Fichier .env.local non trouvé');
  process.exit(1);
}

try {
  const env = fs.readFileSync(envLocalPath, 'utf8');
  
  // Extraire les noms des variables
  const lines = env.split('\n');
  const vars = lines
    .filter(l => l.trim() && !l.trim().startsWith('#'))
    .map(l => l.split('=')[0].trim())
    .filter(v => v);
  
  console.log('📋 Variables présentes dans .env.local:\n');
  vars.forEach(v => console.log(`  - ${v}`));
  
  console.log('\n' + '='.repeat(60));
  console.log('\n🔍 Vérification des variables requises:\n');
  
  const hasNextAuthSecret = env.includes('NEXTAUTH_SECRET');
  const hasNextAuthUrl = env.includes('NEXTAUTH_URL');
  const hasGoogleClientId = env.includes('GOOGLE_CLIENT_ID');
  const hasGoogleClientSecret = env.includes('GOOGLE_CLIENT_SECRET');
  const hasJwtPrivate = env.includes('BLOCKTRUST_JWT_PRIVATE_KEY');
  const hasJwtPublic = env.includes('BLOCKTRUST_JWT_PUBLIC_KEY');
  
  console.log(`${hasNextAuthSecret ? '✅' : '❌'} NEXTAUTH_SECRET`);
  console.log(`${hasNextAuthUrl ? '✅' : '❌'} NEXTAUTH_URL`);
  console.log(`${hasGoogleClientId ? '✅' : '❌'} GOOGLE_CLIENT_ID`);
  console.log(`${hasGoogleClientSecret ? '✅' : '❌'} GOOGLE_CLIENT_SECRET`);
  console.log(`${hasJwtPrivate ? '✅' : '❌'} BLOCKTRUST_JWT_PRIVATE_KEY`);
  console.log(`${hasJwtPublic ? '✅' : '❌'} BLOCKTRUST_JWT_PUBLIC_KEY`);
  
  console.log('\n' + '='.repeat(60));
  console.log('\n🔍 Vérification du format des clés JWT:\n');
  
  // Vérifier le format de la clé privée
  if (hasJwtPrivate) {
    const privateKeyMatch = env.match(/BLOCKTRUST_JWT_PRIVATE_KEY\s*=\s*"([^"]+)"/s);
    if (privateKeyMatch) {
      const privateKey = privateKeyMatch[1];
      const hasBegin = privateKey.includes('BEGIN PRIVATE KEY');
      const hasEnd = privateKey.includes('END PRIVATE KEY');
      const hasEscapedNewlines = privateKey.includes('\\n');
      const hasRealNewlines = privateKey.includes('\n') && !privateKey.includes('\\n');
      
      console.log('🔑 BLOCKTRUST_JWT_PRIVATE_KEY:');
      console.log(`   BEGIN/END présent: ${hasBegin && hasEnd ? '✅' : '❌'}`);
      console.log(`   Utilise \\n (échappé): ${hasEscapedNewlines ? '✅' : '❌'}`);
      console.log(`   Utilise de vrais retours à la ligne: ${hasRealNewlines ? '❌ PROBLÈME!' : '✅'}`);
      console.log(`   Longueur: ${privateKey.length} caractères`);
      
      if (hasRealNewlines && !hasEscapedNewlines) {
        console.log('\n   ⚠️  PROBLÈME DÉTECTÉ: La clé utilise de vrais retours à la ligne au lieu de \\n');
        console.log('   La clé doit être sur UNE SEULE LIGNE avec \\n pour les retours à la ligne');
      }
    } else {
      console.log('❌ Impossible de parser BLOCKTRUST_JWT_PRIVATE_KEY');
    }
  }
  
  // Vérifier le format de la clé publique
  if (hasJwtPublic) {
    const publicKeyMatch = env.match(/BLOCKTRUST_JWT_PUBLIC_KEY\s*=\s*"([^"]+)"/s);
    if (publicKeyMatch) {
      const publicKey = publicKeyMatch[1];
      const hasBegin = publicKey.includes('BEGIN PUBLIC KEY');
      const hasEnd = publicKey.includes('END PUBLIC KEY');
      const hasEscapedNewlines = publicKey.includes('\\n');
      const hasRealNewlines = publicKey.includes('\n') && !publicKey.includes('\\n');
      
      console.log('\n🔑 BLOCKTRUST_JWT_PUBLIC_KEY:');
      console.log(`   BEGIN/END présent: ${hasBegin && hasEnd ? '✅' : '❌'}`);
      console.log(`   Utilise \\n (échappé): ${hasEscapedNewlines ? '✅' : '❌'}`);
      console.log(`   Utilise de vrais retours à la ligne: ${hasRealNewlines ? '❌ PROBLÈME!' : '✅'}`);
      console.log(`   Longueur: ${publicKey.length} caractères`);
      
      if (hasRealNewlines && !hasEscapedNewlines) {
        console.log('\n   ⚠️  PROBLÈME DÉTECTÉ: La clé utilise de vrais retours à la ligne au lieu de \\n');
        console.log('   La clé doit être sur UNE SEULE LIGNE avec \\n pour les retours à la ligne');
      }
    } else {
      console.log('❌ Impossible de parser BLOCKTRUST_JWT_PUBLIC_KEY');
    }
  }
  
  console.log('\n' + '='.repeat(60));
  
} catch (error) {
  console.error('❌ Erreur lors de la lecture du fichier:', error.message);
  if (error.code === 'EPERM') {
    console.error('   Permission refusée. Essayez d\'exécuter avec les permissions nécessaires.');
  }
  process.exit(1);
}
