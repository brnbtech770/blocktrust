const fs = require('fs');
const path = require('path');

const envLocalPath = path.join(process.cwd(), '.env.local');

console.log('🔧 Mise à jour de NEXTAUTH_URL vers port 3004...\n');

try {
  let envContent = fs.readFileSync(envLocalPath, 'utf8');
  
  // Remplacer NEXTAUTH_URL
  const lines = envContent.split('\n');
  const newLines = lines.map(line => {
    if (line.trim().startsWith('NEXTAUTH_URL=')) {
      return 'NEXTAUTH_URL=http://localhost:3004';
    }
    return line;
  });
  
  // Si NEXTAUTH_URL n'existe pas, l'ajouter
  if (!envContent.includes('NEXTAUTH_URL=')) {
    newLines.push('NEXTAUTH_URL=http://localhost:3004');
  }
  
  fs.writeFileSync(envLocalPath, newLines.join('\n'), 'utf8');
  console.log('✅ NEXTAUTH_URL mis à jour: http://localhost:3004');
  
} catch (error) {
  console.error('❌ Erreur:', error.message);
  process.exit(1);
}
