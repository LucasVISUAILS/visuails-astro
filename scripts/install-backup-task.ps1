# =============================================================================
#  VISUAILS - de wekelijkse back-up in de Taakplanner zetten
# =============================================================================
#
#  Draaien, in de projectmap:
#
#      powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-backup-task.ps1
#
#  Eén regel, geen aanhalingstekens om goed te krijgen, en hij is herhaalbaar:
#  bestaat de taak al, dan wordt hij overschreven.
#
#  ---------------------------------------------------------------------------
#  WAAROM DIT EEN SCRIPT IS EN GEEN REGEL MET schtasks
#  ---------------------------------------------------------------------------
#
#  DEPLOY.md gaf hier eerst een `schtasks /create ...` mee, over twee regels met
#  een `^` ertussen en met `\"`-escapes in de /tr-waarde. Op 12 augustus 2026 ging
#  dat mis op de enige manier die je niet ziet: `schtasks` meldde SUCCESS en zette
#  een taak neer met het pad er twee keer in. Een verkeerd ingestelde back-uptaak
#  die zegt dat hij goed staat, is erger dan geen taak - want dan kijk je er niet
#  meer naar.
#
#  Twee dingen die dit script daarom anders doet:
#
#   1  HET PAD KOMT UIT HET SCRIPT ZELF. $PSScriptRoot is de map waar dit bestand
#      staat, dus het werkt ook als je de projectmap ooit verplaatst - en er valt
#      geen pad met spaties en haakjes met de hand te quoten.
#
#   2  HET CONTROLEERT ACHTERAF. Onderaan wordt de taak teruggelezen en afgedrukt.
#      Wat er op je scherm staat, is wat er in de Taakplanner staat.
#
#  ---------------------------------------------------------------------------
#  EN HET ZET DE TWEE VINKJES DIE schtasks NIET KAN MEEGEVEN
#  ---------------------------------------------------------------------------
#
#   -StartWhenAvailable   "De taak zo snel mogelijk starten nadat een geplande
#                         start is gemist." Dit is het belangrijkste vinkje van de
#                         twee: staat de PC zondag uit, dan loopt de back-up bij je
#                         volgende aanmelding in plaats van pas de week erna.
#
#   -WakeToRun            de computer uit de slaapstand halen. Alleen nuttig als de
#                         machine slaapt in plaats van uitstaat; het kost niets als
#                         dat niet zo is.
#
#  LogonType Interactive betekent: alleen als je bent aangemeld. Dat is hier geen
#  beperking maar een eis - `wrangler` bewaart zijn inloggegevens in jouw Windows-
#  profiel, en een taak die als SYSTEM draait heeft die niet. Vandaar ook
#  zondagmiddag en niet 's nachts.
# =============================================================================

$ErrorActionPreference = 'Stop'

$naam = 'VISUAILS back-up'
$bat  = Join-Path $PSScriptRoot 'backup-weekly.bat'

if (-not (Test-Path -LiteralPath $bat)) {
  Write-Host "  x $bat bestaat niet." -ForegroundColor Red
  Write-Host "    Dit script hoort in de map scripts\ van het project te staan, naast backup-weekly.bat."
  exit 1
}

Write-Host ''
Write-Host 'VISUAILS - de wekelijkse back-up instellen'
Write-Host "  uit te voeren: $bat"
Write-Host ''

# Stond er al iets? Dan eerst laten zien WAT er stond, want als dat een kapotte
# taak is, wil je die regel een keer met eigen ogen hebben gezien.
$bestaand = Get-ScheduledTask -TaskName $naam -ErrorAction SilentlyContinue
if ($bestaand) {
  $oud = ($bestaand.Actions | ForEach-Object { "$($_.Execute) $($_.Arguments)".Trim() }) -join ' | '
  Write-Host '  er stond al een taak met deze naam; die wordt overschreven.'
  Write-Host "  wat er stond: $oud" -ForegroundColor DarkYellow
  Write-Host ''
}

$actie   = New-ScheduledTaskAction -Execute $bat -WorkingDirectory (Split-Path -Parent $PSScriptRoot)
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 13:00
$wie     = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive
$opties  = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun -ExecutionTimeLimit (New-TimeSpan -Hours 4)

Register-ScheduledTask -TaskName $naam -Action $actie -Trigger $trigger `
  -Principal $wie -Settings $opties -Force -Description `
  'Wekelijkse kopie van D1 en een inventaris van R2. Schrijft een datum in app_settings; cron/index.js mailt als die ouder dan tien dagen wordt. Zie DEPLOY.md paragraaf 7.' | Out-Null

# ---------------------------------------------------------------------------
# TERUGLEZEN. Dit is het deel dat de vorige poging miste.
# ---------------------------------------------------------------------------
$taak = Get-ScheduledTask -TaskName $naam
$info = Get-ScheduledTaskInfo -TaskName $naam
$uitvoer = ($taak.Actions | ForEach-Object { "$($_.Execute) $($_.Arguments)".Trim() }) -join ' | '

Write-Host '  v de taak staat er. Teruggelezen uit de Taakplanner:' -ForegroundColor Green
Write-Host ''
Write-Host "     naam          $($taak.TaskName)"
Write-Host "     uitvoert      $uitvoer"
Write-Host "     wanneer       $($taak.Triggers[0].StartBoundary) - wekelijks op zondag"
Write-Host "     als           $($taak.Principal.UserId) (alleen wanneer aangemeld)"
Write-Host "     inhalen       $($taak.Settings.StartWhenAvailable)"
Write-Host "     volgende keer $($info.NextRunTime)"
Write-Host ''

# De controle die het echt doet: staat er precies EEN pad, en is dat het pad van
# dit script? Zo werd de kapotte taak van 12 augustus zichtbaar - daar stond het
# pad er twee keer in.
if ($uitvoer -ne $bat) {
  Write-Host "  x wat de taak uitvoert is niet precies '$bat'." -ForegroundColor Red
  Write-Host '    Kijk in de Taakplanner naar het tabblad Acties voordat je hierop vertrouwt.'
  exit 1
}

Write-Host '  Draai hem nu een keer met de hand, dan weet je dat het werkt:'
Write-Host '      scripts\backup-weekly.bat'
Write-Host '  Daarna staat er in backups\_log\laatste.txt wat er gebeurde, en op /admin'
Write-Host '  een chip "Back-up ok" met de datum erbij.'
Write-Host ''
