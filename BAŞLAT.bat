@echo off
chcp 65001 >nul
title AKG CMMS V5.4.42 Başlatıcı
echo ========================================================
echo       AKG HAFTALIK BAKIM CMMS V5.4.42 BAŞLATICI
echo ========================================================
echo.

:: 1. Node.js kontrolü
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Node.js bulundu.
    if not exist node_modules (
        echo [INFO] Paketler yükleniyor, lütfen bekleyiniz...
        call npm install
    )
    echo [INFO] Sunucu başlatılıyor...
    start http://localhost:3000
    call npm run dev
    pause
    exit /b
)

:: 2. Python kontrolü
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Python bulundu. Statik sunucu başlatılıyor...
    start http://localhost:8080/dist/
    python -m http.server 8080
    exit /b
)

:: 3. Ne Node ne Python varsa bilgilendirme
echo [UYARI] Google Chrome ve modern tarayıcılar güvenlik kuralı
echo gereği yerel HTML dosyalarını (file://) doğrudan çalıştırmaz.
echo.
echo Bu uygulamayı çalıştırmak için iki yönteminiz vardır:
echo.
echo A) GITHUB PAGES İLE KULLANIM (ÖNERİLEN):
echo    "dist" klasörünün içindeki tüm dosyaları (index.html, assets vb.)
echo    GitHub reponuza yükleyin.
echo.
echo B) BİLGİSAYARDA YEREL KULLANIM:
echo    Node.js (https://nodejs.org) kurduktan sonra bu dosyaya tekrar tıklayın.
echo.
pause
