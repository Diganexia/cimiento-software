!macro customInit
  ReadEnvStr $R9 "PROCESSOR_ARCHITEW6432"
  StrCmp $R9 "AMD64" +5 +1
  ReadEnvStr $R9 "PROCESSOR_ARCHITECTURE"
  StrCmp $R9 "AMD64" +3 +1
  MessageBox MB_OK|MB_ICONSTOP "Este instalador es solo para Windows 64-bit (x64).$\n$\nSu equipo tiene Windows 32-bit.$\n$\nPor favor descargue el instalador de 32-bit."
  Quit
  StrCpy $R0 "$APPDATA\ferreteria-client\arch.txt"
  IfFileExists $R0 +1 +8
  FileOpen $R1 $R0 r
  FileRead $R1 $R2
  FileClose $R1
  StrCpy $R2 $R2 5
  StrCmp $R2 "32bit" +1 +3
  MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "ATENCION: Se detecto una instalacion de Cimiento 32-bit en este equipo.$\n$\nEste instalador es la version 64-bit.$\n$\nSi instalo la version 32-bit por compatibilidad del equipo, CANCELE y use el instalador 32-bit correcto.$\n$\n?Desea instalar la version 64-bit de todas formas?" IDOK +2
  Quit
!macroend
