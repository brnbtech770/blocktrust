const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

const envLocalPath = join(process.cwd(), '.env.local');
const envPath = join(process.cwd(), '.env');

console.log('🔍 Vérification des variables d\'environnement...\n');

// Variables requises
const requiredVars = {
  'NEXTAUTH_SECRET': 'Secret pour NextAuth (générer avec: openssl rand -base64 32)',
  'NEXTAUTH_URL': 'URL de l\'application (http://localhost:3000)',
  'GOOGLE_CLIENT_ID': 'ID client Google OAuth',
  'GOOGLE_CLIENT_SECRET': 'Secret client Google OAuth',
  'BLOCKTRUST_JWT_PRIVATE_KEY': 'Clé privée JWT (format PKCS8)',
  'BLOCKTRUST_JWT_PUBLIC_KEY': 'Clé publique JWT (format SPKI)',
};

// Variables optionnelles mais importantes
const optionalVars = {
  'DATABASE_URL': 'URL de connexion PostgreSQL',
  'DIRECT_URL': 'URL directe PostgreSQL',
};

let envContent = '';

// Lire .env.local
if (existsSync(envLocalPath)) {
  try {
    envContent = readFileSync(envLocalPath, 'utf-8');
    console.log('✅ Fichier .env.local trouvé\n');
  } catch (err) {
    console.log('⚠️  Impossible de lire .env.local:', err.message);
  }
} else {
  console.log('❌ Fichier .env.local non trouvé\n');
}

// Lire .env si .env.local n'existe pas
if (!envContent && existsSync(envPath)) {
  try {
    envContent = readFileSync(envPath, 'utf-8');
    console.log('✅ Fichier .env trouvé\n');
  } catch (err) {
    console.log('⚠️  Impossible de lire .env:', err.message);
  }
}

if (!envContent) {
  console.log('❌ Aucun fichier d\'environnement trouvé\n');
  process.exit(1);
}

// Parser les variables
const envVars = {};
const lines = envContent.split('\n');

lines.forEach((line, index) => {
  // Ignorer les commentaires et lignes vides
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return;
  }

  // Parser KEY="VALUE" ou KEY=VALUE
  const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.+)$/);
  if (match) {
    const key = match[1];
    let value = match[2];
    
    // Retirer les guillemets
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    envVars[key] = value;
  }
});

console.log('📋 Variables présentes dans le fichier:\n');
const allVarNames = Object.keys(envVars).sort();
allVarNames.forEach(key => {
  const value = envVars[key];
  const isPresent = value && value.trim() !== '';
  const status = isPresent ? '✅' : '❌';
  const preview = isPresent ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : '(vide)';
  console.log(`${status} ${key}`);
  if (isPresent && (key.includes('KEY') || key.includes('SECRET'))) {
    // Pour les clés, vérifier le format
    if (key === 'BLOCKTRUST_JWT_PRIVATE_KEY') {
      const hasBegin = value.includes('BEGIN PRIVATE KEY');
      const hasEnd = value.includes('END PRIVATE KEY');
      const hasNewlines = value.includes('\\n');
      console.log(`   Format: ${hasBegin && hasEnd ? '✅' : '❌'} BEGIN/END, ${hasNewlines ? '✅' : '❌'} \\n`);
    } else if (key === 'BLOCKTRUST_JWT_PUBLIC_KEY') {
      const hasBegin = value.includes('BEGIN PUBLIC KEY');
      const hasEnd = value.includes('END PUBLIC KEY');
      const hasNewlines = value.includes('\\n');
      console.log(`   Format: ${hasBegin && hasEnd ? '✅' : '❌'} BEGIN/END, ${hasNewlines ? '✅' : '❌'} \\n`);
    }
  }
});

console.log('\n🔍 Vérification des variables requises:\n');
let allPresent = true;

Object.keys(requiredVars).forEach(key => {
  const value = envVars[key];
  const isPresent = value && value.trim() !== '';
  
  if (isPresent) {
    console.log(`✅ ${key}`);
  } else {
    console.log(`❌ ${key} - MANQUANT`);
    console.log(`   ${requiredVars[key]}`);
    allPresent = false;
  }
});

console.log('\n📝 Variables optionnelles:\n');
Object.keys(optionalVars).forEach(key => {
  const value = envVars[key];
  const isPresent = value && value.trim() !== '';
  console.log(`${isPresent ? '✅' : '⚠️ '} ${key} ${isPresent ? '' : '- (optionnel)'}`);
});

console.log('\n' + '='.repeat(60));
if (allPresent) {
  console.log('✅ Toutes les variables requises sont présentes');
} else {
  console.log('❌ Certaines variables requises sont manquantes');
  console.log('\n💡 Pour générer NEXTAUTH_SECRET:');
  console.log('   openssl rand -base64 32');
}
console.log('='.repeat(60));
