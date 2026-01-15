# Script pour diagnostiquer et corriger la connexion Supabase avec Prisma

Write-Host "`n=== DIAGNOSTIC DE CONNEXION SUPABASE ===" -ForegroundColor Cyan

# Vérifier si le fichier .env existe
if (-not (Test-Path .env)) {
    Write-Host "ERREUR: Le fichier .env n'existe pas!" -ForegroundColor Red
    exit 1
}

# Lire la configuration actuelle
$envContent = Get-Content .env
$dbUrlLine = $envContent | Select-String -Pattern "DATABASE_URL"

if (-not $dbUrlLine) {
    Write-Host "ERREUR: DATABASE_URL non trouvé dans .env" -ForegroundColor Red
    exit 1
}

Write-Host "`nConfiguration actuelle:" -ForegroundColor Yellow
Write-Host $dbUrlLine.Line -ForegroundColor Gray

# Vérifier le format
$url = $dbUrlLine.Line -replace 'DATABASE_URL=', '' -replace '"', ''

if ($url -notmatch 'postgresql://') {
    Write-Host "`nERREUR: L'URL ne commence pas par 'postgresql://'" -ForegroundColor Red
    exit 1
}

if ($url -notmatch '\?sslmode=require') {
    Write-Host "`nATTENTION: Le paramètre SSL manque. Ajout en cours..." -ForegroundColor Yellow
    $newUrl = if ($url -match '\?') { "$url&sslmode=require" } else { "$url?sslmode=require" }
    $envContent = $envContent -replace [regex]::Escape($dbUrlLine.Line), "DATABASE_URL=`"$newUrl`""
    $envContent | Set-Content .env
    Write-Host "Paramètre SSL ajouté!" -ForegroundColor Green
}

# Vérifier le mot de passe placeholder
if ($url -match 'TonNouveauMotDePasse|YOUR-PASSWORD|\[YOUR-PASSWORD\]') {
    Write-Host "`nATTENTION: Le mot de passe semble être un placeholder!" -ForegroundColor Red
    Write-Host "Vous devez remplacer le mot de passe par votre vrai mot de passe Supabase." -ForegroundColor Yellow
    Write-Host "`nPour obtenir votre URL de connexion:" -ForegroundColor Cyan
    Write-Host "1. Allez sur https://supabase.com/dashboard" -ForegroundColor White
    Write-Host "2. Sélectionnez votre projet" -ForegroundColor White
    Write-Host "3. Settings > Database > Connection string" -ForegroundColor White
    Write-Host "4. Choisissez 'Connection pooling' (port 6543)" -ForegroundColor White
    Write-Host "5. Copiez l'URL complète" -ForegroundColor White
}

# Tester la connexion
Write-Host "`n=== TEST DE CONNEXION ===" -ForegroundColor Cyan
Write-Host "Exécution de: npx prisma db push`n" -ForegroundColor Yellow

npx prisma db push

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nSUCCÈS: La connexion fonctionne!" -ForegroundColor Green
} else {
    Write-Host "`nÉCHEC: La connexion a échoué." -ForegroundColor Red
    Write-Host "`nSolutions possibles:" -ForegroundColor Yellow
    Write-Host "1. Vérifiez que votre mot de passe Supabase est correct" -ForegroundColor White
    Write-Host "2. Vérifiez que votre IP est autorisée dans Supabase (Settings > Database > Connection pooling)" -ForegroundColor White
    Write-Host "3. Essayez d'utiliser le port direct (5432) au lieu du pooler (6543)" -ForegroundColor White
    Write-Host "4. Vérifiez votre connexion internet et firewall" -ForegroundColor White
}
