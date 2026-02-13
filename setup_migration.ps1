# Setup script for studio-antigravity migration
Write-Host "Iniciando configuración de studio-antigravity..." -ForegroundColor Green

# 1. Configurar Usuario Git
$currentName = git config user.name
$currentEmail = git config user.email

if ([string]::IsNullOrWhiteSpace($currentName)) {
    $name = Read-Host "Introduce tu Nombre para Git (ej. Augusto)"
    git config user.name "$name"
}
if ([string]::IsNullOrWhiteSpace($currentEmail)) {
    $email = Read-Host "Introduce tu Email para Git"
    git config user.email "$email"
}

# 2. Commit Inicial
Write-Host "Creando commit inicial..." -ForegroundColor Cyan
git add .
git commit -m "Initial commit for v3.0"

# 3. Instrucciones GitHub
Write-Host "`n-----------------------------------------------------" -ForegroundColor Yellow
Write-Host "IMPORTANTE: Necesitas crear el repositorio en GitHub." -ForegroundColor Yellow
Write-Host "1. Ve a: https://github.com/new"
Write-Host "2. Nombre del repositorio: studio-antigravity"
Write-Host "3. Crea el repositorio."
Write-Host "4. Copia la URL HTTPS (termina en .git)"
Write-Host "-----------------------------------------------------`n" -ForegroundColor Yellow

$repoUrl = Read-Host "Pega aquí la URL del repositorio creado"

if (-not [string]::IsNullOrWhiteSpace($repoUrl)) {
    git remote add origin $repoUrl
    git branch -M main
    git push -u origin main
    Write-Host "`n¡Felicidades! Migration completada." -ForegroundColor Green
} else {
    Write-Host "No se introdujo URL. Puedes hacerlo manualmente luego con 'git remote add origin <URL>'" -ForegroundColor Red
}

Read-Host "Presiona Enter para salir"
