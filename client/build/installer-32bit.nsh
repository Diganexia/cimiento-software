!macro customInit
  StrCpy $R0 "$APPDATA\ferreteria-client\arch.txt"
  IfFileExists $R0 0 done32
  FileOpen $R1 $R0 r
  FileRead $R1 $R2
  FileClose $R1
  StrCpy $R2 $R2 5
  ${If} $R2 == "64bit"
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION \
      "ATENCI$\xD3N: Se detect$\xF3 una instalaci$\xF3n de Cimiento 64-bit en este equipo.$\n$\n\
Este instalador es la versi$\xF3n 32-bit.$\n$\n\
Si su equipo es compatible con 64-bit, CANCELE y use el instalador 64-bit que tiene mejor rendimiento.$\n$\n\
$\xBFDesea instalar la versi$\xF3n 32-bit de todas formas?" \
      IDOK done32
    Quit
  ${EndIf}
  done32:
!macroend
