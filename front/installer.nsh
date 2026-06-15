; Custom NSIS script for SuperLink installer
; Preserves user data directories (assets, llm, database) during upgrades
; Uses register variables $R0 (backup dir) and $R1 (has backup flag) to avoid
; NSIS warning 6001 about unused global variables in uninstaller build

; preInit runs before the installer UI shows - read previous install dir from registry
!macro preInit
  ReadRegStr $R0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "InstallLocation"
  ${If} $R0 != ""
    StrCpy $INSTDIR $R0
  ${EndIf}
!macroend

!macro customInit
  ; $R0 = backup directory path
  ; $R1 = has backup flag ("1" or "0")
  StrCpy $R1 "0"
  StrCpy $R0 "$TEMP\SuperLink_upgrade_backup"

  ; Clean up any previous backup attempt
  RMDir /r "$R0"

  ; Check if target directory has user data (indicating an upgrade/overwrite)
  ${If} ${FileExists} "$INSTDIR\database\*.*"
  ${OrIf} ${FileExists} "$INSTDIR\assets\*.*"
  ${OrIf} ${FileExists} "$INSTDIR\llm\*.*"
    StrCpy $R1 "1"
    CreateDirectory "$R0"

    ; Back up database directory ($INSTDIR/database/)
    ${If} ${FileExists} "$INSTDIR\database\*.*"
      CreateDirectory "$R0\database"
      CopyFiles /SILENT "$INSTDIR\database\*" "$R0\database"
    ${EndIf}

    ; Back up assets directory ($INSTDIR/assets/)
    ; Assets has year-month subdirectories like assets/202601/uuid.jpg
    ${If} ${FileExists} "$INSTDIR\assets\*.*"
      CreateDirectory "$R0\assets"
      CopyFiles /SILENT "$INSTDIR\assets\*" "$R0\assets"
    ${EndIf}

    ; Back up llm directory ($INSTDIR/llm/)
    ; LLM has subdirectories like llm/copywriting/companyId/sessionId/
    ${If} ${FileExists} "$INSTDIR\llm\*.*"
      CreateDirectory "$R0\llm"
      CopyFiles /SILENT "$INSTDIR\llm\*" "$R0\llm"
    ${EndIf}
  ${EndIf}
!macroend

!macro customInstall
  ; $R0 = backup directory path (set in customInit)
  ; $R1 = has backup flag (set in customInit)
  ; Note: register variables persist across macros within the same installer execution

  StrCpy $R0 "$TEMP\SuperLink_upgrade_backup"

  ; Restore user data directories after installation completes
  ${If} ${FileExists} "$R0\*.*"
    ; Restore database directory
    ${If} ${FileExists} "$R0\database\*.*"
      CreateDirectory "$INSTDIR\database"
      CopyFiles /SILENT "$R0\database\*" "$INSTDIR\database"
    ${EndIf}

    ; Restore assets directory (with all subdirectories)
    ${If} ${FileExists} "$R0\assets\*.*"
      CreateDirectory "$INSTDIR\assets"
      CopyFiles /SILENT "$R0\assets\*" "$INSTDIR\assets"
    ${EndIf}

    ; Restore llm directory (with all subdirectories)
    ${If} ${FileExists} "$R0\llm\*.*"
      CreateDirectory "$INSTDIR\llm"
      CopyFiles /SILENT "$R0\llm\*" "$INSTDIR\llm"
    ${EndIf}

    ; Clean up temp backup
    RMDir /r "$R0"
  ${EndIf}
!macroend

!macro customUnInstall
  ; On uninstall, preserve user data directories
  ; database, assets, llm will remain in the install directory
!macroend
