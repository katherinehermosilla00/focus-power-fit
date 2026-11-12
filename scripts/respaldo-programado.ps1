# Ejecuta un respaldo o su prueba desde el Programador de tareas de Windows.
# Lo instala scripts/programar-respaldos.ps1; también se puede ejecutar a mano:
#   powershell -ExecutionPolicy Bypass -File scripts\respaldo-programado.ps1 -Accion crear
#
# Escribe solo totales en el registro, nunca datos de clientes ni la clave.

param(
  [ValidateSet("crear", "probar")]
  [string]$Accion = "crear",

  # Base que se respalda. Se fija aquí para que un cambio temporal de DB_NAME
  # en backend\.env (por ejemplo, a la copia de pruebas) no cambie el respaldo.
  [string]$Base = "focus_power_fit",

  [string]$Node = "node"
)

$ErrorActionPreference = "Stop"
$backend = Join-Path (Split-Path $PSScriptRoot -Parent) "backend"
$envArchivo = Join-Path $backend ".env"

# La carpeta de respaldos sale de backend\.env (RESPALDOS_DIR).
$carpeta = $null
if (Test-Path $envArchivo) {
  $linea = Get-Content $envArchivo | Where-Object { $_ -match '^\s*RESPALDOS_DIR\s*=' } | Select-Object -First 1
  if ($linea) { $carpeta = ($linea -split '=', 2)[1].Trim().Trim('"') }
}
if (-not $carpeta) { $carpeta = Join-Path $env:USERPROFILE "Documents\RespaldosFocus" }
New-Item -ItemType Directory -Force $carpeta | Out-Null
$registro = Join-Path $carpeta "registro-respaldos.log"

function Escribir([string]$texto) {
  $linea = "{0:yyyy-MM-dd HH:mm:ss} [{1}] {2}" -f (Get-Date), $Accion, $texto
  Add-Content -Path $registro -Value $linea -Encoding UTF8
}

$env:DB_NAME = $Base
# Node escribe en UTF-8; sin esto, los tildes quedan mal en el registro.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Set-Location $backend
Escribir "Inicio (base $Base)"

# El script de Node imprime en stderr cuando falla; se juntan ambas salidas.
$ErrorActionPreference = "Continue"
$salida = & $Node "src/scripts/respaldos.js" $Accion 2>&1
$codigo = $LASTEXITCODE
foreach ($linea in $salida) { Escribir ([string]$linea) }

if ($codigo -eq 0) {
  Escribir "Correcto"
} else {
  Escribir "FALLO (codigo $codigo)"
}

exit $codigo
