// Script simple pour vérifier les variables d'environnement
// À exécuter manuellement: node scripts/check-env-simple.js

const fs = require('fs');
const path = require('path');

const envLocalPath = path.join(process.cwd(), '.env.local');

console.log('🔍 Vérification des variables dans .env.local\n');
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
    .map(l => {
      const match = l.match(/^([A-Z_][A-Z0-9_]*)\s*=/);
      return match ? match[1] : null;
    })
    .filter(v => v);
  
  console.log('📋 Variables présentes:\n');
  vars.forEach(v => console.log(`  ✅ ${v}`));
  
  console.log('\n' + '='.repeat(60));
  console.log('\n🔍 Vérification des variables requises:\n');
  
  const required = [
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'BLOCKTRUST_JWT_PRIVATE_KEY',
    'BLOCKTRUST_JWT_PUBLIC_KEY'
  ];
  
  required.forEach(varName => {
    const present = vars.includes(varName);
    console.log(`${present ? '✅' : '❌'} ${varName}`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('\n🔍 Vérification du format des clés JWT:\n');
  
  // Vérifier le format
  const privateKeyLine = lines.find(l => l.includes('BLOCKTRUST_JWT_PRIVATE_KEY'));
  const publicKeyLine = lines.find(l => l.includes('BLOCKTRUST_JWT_PUBLIC_KEY'));
  
  if (privateKeyLine) {
    const hasEscapedNewlines = privateKeyLine.includes('\\n');
    const hasRealNewlines = privateKeyLine.includes('\n') && !privateKeyLine.includes('\\n');
    const isSingleLine = !privateKeyLine.match(/BLOCKTRUST_JWT_PRIVATE_KEY\s*=\s*"[^"]*\n[^"]*"/);
    
    console.log('🔑 BLOCKTRUST_JWT_PRIVATE_KEY:');
    console.log(`   Sur une seule ligne: ${isSingleLine ? '✅' : '❌'}`);
    console.log(`   Utilise \\n: ${hasEscapedNewlines ? '✅' : '❌'}`);
    console.log(`   Utilise de vrais retours à la ligne: ${hasRealNewlines ? '❌ PROBLÈME!' : '✅'}`);
    
    if (hasRealNewlines || !isSingleLine) {
      console.log('\n   ⚠️  PROBLÈME: La clé doit être sur UNE SEULE LIGNE avec \\n');
      console.log('   Exécutez: node scripts/fix-jwt-format.js');
    }
  }
  
  if (publicKeyLine) {
    const hasEscapedNewlines = publicKeyLine.includes('\\n');
    const hasRealNewlines = publicKeyLine.includes('\n') && !publicKeyLine.includes('\\n');
    const isSingleLine = !publicKeyLine.match(/BLOCKTRUST_JWT_PUBLIC_KEY\s*=\s*"[^"]*\n[^"]*"/);
    
    console.log('\n🔑 BLOCKTRUST_JWT_PUBLIC_KEY:');
    console.log(`   Sur une seule ligne: ${isSingleLine ? '✅' : '❌'}`);
    console.log(`   Utilise \\n: ${hasEscapedNewlines ? '✅' : '❌'}`);
    console.log(`   Utilise de vrais retours à la ligne: ${hasRealNewlines ? '❌ PROBLÈME!' : '✅'}`);
    
    if (hasRealNewlines || !isSingleLine) {
      console.log('\n   ⚠️  PROBLÈME: La clé doit être sur UNE SEULE LIGNE avec \\n');
      console.log('   Exécutez: node scripts/fix-jwt-format.js');
    }
  }
  
  console.log('\n' + '='.repeat(60));
  
} catch (error) {
  console.error('❌ Erreur:', error.message);
  if (error.code === 'EPERM') {
    console.error('\n💡 Permission refusée. Exécutez ce script dans votre terminal:');
    console.error('   node scripts/check-env-simple.js');
  }
  process.exit(1);
}
