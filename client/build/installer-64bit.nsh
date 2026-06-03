!macro customInit
  StrCpy $R0 "$APPDATA\ferreteria-client\arch.txt"
  IfFileExists $R0 0 done64
  FileOpen $R1 $R0 r
  FileRead $R1 $R2
  FileClose $R1
  StrCpy $R2 $R2 5
  ${If} $R2 == "32bit"
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION \
      "ATENCI$\xD3N: Se detect$\xF3 una instalaci$\xF3n de Cimiento 32-bit en este equipo.$\n$\n\
Este instalador es la versi$\xF3n 64-bit y NO es compatible con la instalaci$\xF3n actual.$\n$\n\
Si us$\xF3 la versi$\xF3n 32-bit por compatibilidad del equipo, CANCELE y use el instalador 32-bit correcto.$\n$\n\
$\xBFDesea instalar la versi$\xF3n 64-bit de todas formas?" \
      IDOK done64
    Quit
  ${EndIf}
  done64:
!macroend
