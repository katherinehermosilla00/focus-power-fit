# Programa los respaldos automaticos en el Programador de tareas de Windows,
# para el usuario actual (no requiere administrador):
#   - Respaldo cifrado todos los dias.
#   - Prueba de restauracion una vez por semana.
# Si el computador esta apagado a esa hora, la tarea corre al encenderlo.
#
# Instalar:  powershell -ExecutionPolicy Bypass -File scripts\programar-respaldos.ps1
# Cambiar la hora:  ... -Hora 21:00
# Quitar:    powershell -ExecutionPolicy Bypass -File scripts\programar-respaldos.ps1 -Quitar

param(
  [string]$Hora = "22:00",
  [string]$HoraPrueba = "22:30",
  [string]$Base = "focus_power_fit",
  [switch]$Quitar
)

$ErrorActionPreference = "Stop"
$carpetaTareas = "\FocusPowerFit\"
$tareas = @{
  "Respaldo diario"          = "crear"
  "Prueba semanal de respaldo" = "probar"
}

if ($Quitar) {
  foreach ($nombre in $tareas.Keys) {
    Unregister-ScheduledTask -TaskPath $carpetaTareas -TaskName $nombre -Confirm:$false -ErrorAction SilentlyContinue
  }
  "Tareas de respaldo eliminadas."
  return
}

$node = (Get-Command node -ErrorAction Stop).Source
$script = Join-Path $PSScriptRoot "respaldo-programado.ps1"
$usuario = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

$ajustes = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
  -MultipleInstances IgnoreNew

$principal = New-ScheduledTaskPrincipal -UserId $usuario -LogonType Interactive -RunLevel Limited

$disparadores = @{
  "crear"  = New-ScheduledTaskTrigger -Daily -At $Hora
  "probar" = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At $HoraPrueba
}

foreach ($nombre in $tareas.Keys) {
  $accion = $tareas[$nombre]
  $argumentos = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`" -Accion $accion -Base $Base -Node `"$node`""
  $ejecutar = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $argumentos

  Register-ScheduledTask `
    -TaskPath $carpetaTareas `
    -TaskName $nombre `
    -Action $ejecutar `
    -Trigger $disparadores[$accion] `
    -Settings $ajustes `
    -Principal $principal `
    -Description "Focus Power Fit: $accion respaldo de $Base. Registro en RESPALDOS_DIR\registro-respaldos.log" `
    -Force | Out-Null
}

Get-ScheduledTask -TaskPath $carpetaTareas |
  Select-Object TaskName, State, @{ n = "Proxima ejecucion"; e = { (Get-ScheduledTaskInfo $_).NextRunTime } } |
  Format-Table -AutoSize
