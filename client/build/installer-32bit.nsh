!macro customInit
  StrCpy $R0 "$APPDATA\ferreteria-client\arch.txt"
  IfFileExists $R0 +1 +8
  FileOpen $R1 $R0 r
  FileRead $R1 $R2
  FileClose $R1
  StrCpy $R2 $R2 5
  StrCmp $R2 "64bit" +1 +3
  MessageBox MB_OKCANCEL|MB_DEFBUTTON2|MB_ICONEXCLAMATION "ATENCION: Se detecto una instalacion de Cimiento 64-bit en este equipo.$\n$\nEste instalador es Cimiento v${VERSION} (32-bit).$\n$\nSi su equipo es compatible con 64-bit, presione CANCELAR y use el instalador 64-bit que tiene mejor rendimiento.$\n$\n?Desea reemplazar con la version 32-bit de todas formas?" IDOK +2
  Quit
!macroend
