@echo off
echo [1/3] Menambahkan perubahan...
git add .
set /p msg="Masukkan pesan update (kosongkan untuk 'Update'): "
if "%msg%"=="" set msg=Update
echo [2/3] Melakukan Commit...
git commit -m "%msg%"
echo [3/3] Mengirim ke GitHub (Push)...
git push origin main
echo Done! Kode sudah terkirim ke GitHub.
pause
