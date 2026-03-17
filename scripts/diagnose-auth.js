// Script de diagnostic pour NextAuth
// Vérifie les variables d'environnement et la configuration

console.log('🔍 Diagnostic NextAuth\n');
console.log('='.repeat(60));

// Vérifier les variables d'environnement
const requiredEnvVars = [
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
];

const optionalEnvVars = [
  'BLOCKTRUST_JWT_PRIVATE_KEY',
  'BLOCKTRUST_JWT_PUBLIC_KEY',
  'DATABASE_URL',
];

console.log('\n📋 Variables d\'environnement requises:\n');
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    const preview = varName.includes('SECRET') || varName.includes('KEY') 
      ? (value.length > 20 ? value.substring(0, 20) + '...' : '***')
      : value;
    console.log(`✅ ${varName} = ${preview}`);
  } else {
    console.log(`❌ ${varName} = MANQUANT`);
  }
});

console.log('\n📋 Variables d\'environnement optionnelles:\n');
optionalEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    const preview = varName.includes('KEY') 
      ? (value.length > 30 ? value.substring(0, 30) + '...' : '***')
      : value.substring(0, 50);
    console.log(`${value ? '✅' : '⚠️ '} ${varName} = ${preview}`);
    
    // Vérifier le format des clés JWT
    if (varName === 'BLOCKTRUST_JWT_PRIVATE_KEY') {
      const hasBegin = value.includes('BEGIN PRIVATE KEY');
      const hasEnd = value.includes('END PRIVATE KEY');
      const hasNewlines = value.includes('\\n');
      console.log(`   Format: ${hasBegin && hasEnd ? '✅' : '❌'} BEGIN/END, ${hasNewlines ? '✅' : '❌'} \\n`);
    } else if (varName === 'BLOCKTRUST_JWT_PUBLIC_KEY') {
      const hasBegin = value.includes('BEGIN PUBLIC KEY');
      const hasEnd = value.includes('END PUBLIC KEY');
      const hasNewlines = value.includes('\\n');
      console.log(`   Format: ${hasBegin && hasEnd ? '✅' : '❌'} BEGIN/END, ${hasNewlines ? '✅' : '❌'} \\n`);
    }
  } else {
    console.log(`⚠️  ${varName} = Non défini`);
  }
});

console.log('\n' + '='.repeat(60));
console.log('\n💡 Instructions:\n');
console.log('1. Vérifiez que toutes les variables requises sont dans .env.local');
console.log('2. Pour générer NEXTAUTH_SECRET:');
console.log('   openssl rand -base64 32');
console.log('3. NEXTAUTH_URL doit être: http://localhost:3000');
console.log('4. Les clés JWT doivent être au format PEM avec \\n pour les retours à la ligne');
console.log('\n' + '='.repeat(60));
