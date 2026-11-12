#!/bin/sh
# Respaldo programado en el servidor. Se instala con cron (crontab -e):
#
#   0 22 * * *  /srv/focus-power-fit/deploy/respaldo.sh crear
#   30 22 * * 0 /srv/focus-power-fit/deploy/respaldo.sh probar
#
# Registra fecha, totales y resultado en REGISTRO, sin datos de clientes.
# Una línea FALLO se trata como incidente: avisar al responsable y revisar el respaldo.

set -u
accion="${1:-crear}"
REGISTRO="${REGISTRO:-/var/log/focus-power-fit-respaldos.log}"

case "$accion" in
  crear|probar) ;;
  *) echo "Uso: $0 crear|probar" >&2; exit 2 ;;
esac

cd "$(dirname "$0")" || exit 1

registrar() {
  while IFS= read -r linea; do
    printf '%s [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$accion" "$linea"
  done >> "$REGISTRO"
}

# sh no tiene pipefail: se guarda la salida para conservar el código de Docker.
salida=$(docker compose --profile respaldos run --rm -T respaldos "$accion" 2>&1)
codigo=$?
printf '%s\n' "$salida" | registrar

if [ "$codigo" -eq 0 ]; then
  echo "Correcto" | registrar
else
  echo "FALLO (codigo $codigo)" | registrar
fi

exit "$codigo"
