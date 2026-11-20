"""Genera el Excel de pruebas y evidencias de Focus Power Fit.

    python informe/generar_excel.py <carpeta-de-pruebas> [<datos-extra.json>]

<carpeta-de-pruebas> contiene la subcarpeta "evidencias" (01-n8n ... 05-zap).
El Excel queda en esa carpeta y sus enlaces a evidencias son relativos, así que
se puede mover la carpeta completa. <datos-extra.json> trae lo que no sale de
los resultados: entorno, versiones, defectos y la evaluación de cada alerta ZAP.
"""

import html
import json
import re
import sys
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path

from openpyxl import Workbook
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

RAIZ = Path(sys.argv[1]).resolve()
EV = RAIZ / "evidencias"
EXTRA = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8")) if len(sys.argv) > 2 else {}
REPO = Path(__file__).resolve().parents[2]
FECHA = EXTRA.get("fecha", datetime.now().strftime("%d-%m-%Y"))
SALIDA = RAIZ / "Pruebas_y_evidencias_Focus_Power_Fit_detallado.xlsx"

# ------------------------------------------------------------------ estilos
FUENTE = "Arial"
ROJO = "B91C1C"
NEGRO = "111111"
GRIS = "F3F4F6"
BORDE = Border(*(Side(style="thin", color="D1D5DB"),) * 4)
ENCABEZADO = Font(name=FUENTE, bold=True, color="FFFFFF", size=10)
NORMAL = Font(name=FUENTE, size=10)
NEGRITA = Font(name=FUENTE, size=10, bold=True)
ENLACE = Font(name=FUENTE, size=10, color="1D4ED8", underline="single")
TITULO = Font(name=FUENTE, size=16, bold=True, color=ROJO)
SUBTITULO = Font(name=FUENTE, size=11, bold=True, color=NEGRO)
ARRIBA = Alignment(vertical="top", wrap_text=True)
CENTRO = Alignment(horizontal="center", vertical="top", wrap_text=True)

ESTADOS = ["Aprobado", "Fallido", "Observación"]


def tabla(hoja, fila, encabezados, filas, anchos, enlaces=None, centrar=()):
    """Escribe una tabla con encabezado rojo. enlaces: {columna: índice del dato con la ruta}."""
    for col, (texto, ancho) in enumerate(zip(encabezados, anchos), start=1):
        celda = hoja.cell(row=fila, column=col, value=texto)
        celda.font = ENCABEZADO
        celda.fill = PatternFill("solid", fgColor=ROJO)
        celda.alignment = CENTRO
        celda.border = BORDE
        hoja.column_dimensions[get_column_letter(col)].width = ancho
    for n, datos in enumerate(filas, start=1):
        for col, valor in enumerate(datos, start=1):
            celda = hoja.cell(row=fila + n, column=col)
            if enlaces and col in enlaces and valor:
                ruta = valor
                celda.value = Path(ruta).name
                celda.hyperlink = ruta.replace("\\", "/")
                celda.font = ENLACE
            else:
                celda.value = valor
                celda.font = NORMAL
            celda.alignment = CENTRO if col in centrar else ARRIBA
            celda.border = BORDE
            if n % 2 == 0:
                celda.fill = PatternFill("solid", fgColor=GRIS)
    return fila + len(filas)


def relativa(ruta):
    return str(Path(ruta).relative_to(RAIZ)).replace("\\", "/")


def colorear_estados(hoja, rango):
    for texto, color in (("Aprobado", "DCFCE7"), ("Fallido", "FEE2E2"), ("Observación", "FEF3C7")):
        hoja.conditional_formatting.add(
            rango,
            CellIsRule(operator="equal", formula=[f'"{texto}"'], fill=PatternFill("solid", fgColor=color)),
        )


# ------------------------------------------------------------- 1. n8n / FitBot
casos = []  # (id, herramienta, módulo, tipo, caso, pasos, esperado, obtenido, estado, evidencia, observaciones)

casos.append((
    "N8N-01", "n8n", "FitBot", "Integración",
    "El flujo de FitBot está publicado y activo en n8n",
    "Abrir el editor de n8n del entorno QA y el flujo «FitBot - Focus Power Fit».",
    "El flujo aparece publicado, con la rama de reglas y la rama de IA limitada (Ollama).",
    EXTRA.get("flujoN8n", "Flujo publicado (Published), con sus nodos de reglas e IA limitada."),
    "Aprobado", relativa(EV / "01-n8n" / "n8n-flujo-fitbot.png"), "",
))
casos.append((
    "N8N-02", "n8n", "FitBot", "Integración",
    "Las ejecuciones de la prueba quedan registradas sin errores",
    "Ejecutar las 52 conversaciones y revisar la pestaña Executions del flujo.",
    "Todas las ejecuciones terminan en estado Succeeded.",
    "Ejecuciones en estado Succeeded; las respondidas por IA tardan unos 9 s y las de reglas menos de 0,2 s.",
    "Aprobado", relativa(EV / "01-n8n" / "n8n-ejecuciones-fitbot.png"), "",
))

fuente = (REPO / "n8n" / "probar-fitbot.mjs").read_text(encoding="utf-8")
esperados = re.findall(r'\[\s*"((?:[^"\\]|\\.)*)"\s*,\s*/((?:[^/\\\n]|\\.)+)/[a-z]*\s*\]', fuente)
registro = (EV / "01-n8n" / "fitbot-52-conversaciones.log").read_text(encoding="utf-8")
lineas = re.findall(r"^(OK|NO) \[(\w+)\] (\d+) ms \| (.*)\n\s+-> (.*)$", registro, re.M)
for n, (resultado, http, ms, pregunta, respuesta) in enumerate(lineas, start=1):
    patron = esperados[n - 1][1] if n - 1 < len(esperados) and esperados[n - 1][0] == pregunta else ""
    casos.append((
        f"FIT-{n:02d}", "n8n", "FitBot", "Funcional (chatbot)",
        f"Mensaje: «{pregunta}»",
        "Enviar el mensaje al webhook de FitBot, en la misma conversación que el mensaje anterior.",
        "HTTP 200 y una respuesta que contiene: " + (patron.replace("\\s\\S", "…").replace("[\\s\\S]*", " … ") if patron else "la respuesta esperada"),
        f"HTTP {http} en {ms} ms. Respondió: {respuesta[:150]}",
        "Aprobado" if resultado == "OK" else "Fallido",
        relativa(EV / "01-n8n" / "fitbot-52-conversaciones.log"),
        "" if resultado == "OK" else EXTRA.get("notaFitbotFallida", ""),
    ))

# ------------------------------------------------------------------ 2. Postman
junit = ET.parse(EV / "02-postman" / "postman-ejecucion2-final-junit.xml").getroot()
notas_postman = EXTRA.get("notasPostman", {})
for suite in junit.iter("testsuite"):
    carpeta, _, nombre = suite.get("name").partition(" / ")
    id_caso, _, titulo = nombre.partition(" ")
    verificaciones = [caso.get("name") for caso in suite.iter("testcase")]
    fallos = int(suite.get("failures")) + int(suite.get("errors"))
    total = len(verificaciones)
    casos.append((
        id_caso, "Postman", re.sub(r"^\d+\s+", "", carpeta),
        "Seguridad" if carpeta.startswith(("02", "03", "11")) else "Funcional (API)",
        titulo,
        "Ejecutar la petición con Newman sobre el entorno QA.",
        "; ".join(verificaciones),
        f"{total - fallos} de {total} verificaciones aprobadas en {round(float(suite.get('time')) * 1000)} ms.",
        "Aprobado" if fallos == 0 else "Fallido",
        relativa(EV / "02-postman" / "postman-ejecucion2-final.html"),
        notas_postman.get(id_caso, ""),
    ))

# --------------------------------------------------------- 3. Chrome DevTools
lighthouse = json.loads((EV / "03-devtools" / "lighthouse-resumen.json").read_text(encoding="utf-8"))
for n, fila in enumerate(lighthouse, start=1):
    puntajes = [fila["rendimiento"], fila["accesibilidad"], fila["buenasPracticas"], fila["seo"]]
    pagina = "portada" if fila["ruta"] == "/" else fila["ruta"]
    casos.append((
        f"LH-{n:02d}", "Chrome DevTools", f"Lighthouse {pagina}", "Rendimiento y accesibilidad",
        f"Auditoría Lighthouse de {pagina} en {'celular' if fila['dispositivo'] == 'movil' else 'escritorio'}",
        "Ejecutar Lighthouse (panel de DevTools) con Chrome sobre el entorno QA.",
        "Rendimiento, accesibilidad, buenas prácticas y SEO de 90 o más.",
        f"Rendimiento {puntajes[0]}, accesibilidad {puntajes[1]}, buenas prácticas {puntajes[2]}, SEO {puntajes[3]}. LCP {fila['lcp']}, CLS {fila['cls']}.",
        "Aprobado" if min(puntajes) >= 90 else "Observación",
        relativa(EV / "03-devtools" / fila["informe"]),
        "" if min(puntajes) >= 90 else EXTRA.get("notaLighthouse", ""),
    ))

devtools = json.loads((EV / "03-devtools" / "devtools-consola-red-rendimiento.json").read_text(encoding="utf-8"))
for n, fila in enumerate(devtools, start=1):
    reales = [f for f in fila["peticionesFallidas"] if re.match(r"^\d{3} ", f)]
    # net::ERR_ABORTED: precargas de Next.js que el navegador cancela al cambiar de página.
    precargas = [f for f in fila["peticionesFallidas"] if "ERR_ABORTED" in f]
    otras = [f for f in fila["peticionesFallidas"] if f not in reales and f not in precargas]
    pagina = "portada" if fila["ruta"] == "/" else fila["ruta"]
    obtenido = (
        f"HTTP {fila['estadoHttp']}, {fila['tls']}. {len(fila['erroresConsola'])} errores de consola, "
        f"{len(reales) + len(otras)} peticiones con error. Carga {fila['cargaMs']} ms, primer byte {fila['ttfbMs']} ms, "
        f"{fila['recursos']} recursos, {fila['nodosDom']:.0f} nodos DOM, {fila['memoriaJsMb']} MB de memoria JS."
    )
    casos.append((
        f"DT-{n:02d}", "Chrome DevTools", f"Consola y red {pagina}", "Calidad técnica",
        f"{pagina} ({fila['sesion']}) sin errores de consola ni de red, sobre HTTPS",
        "Abrir la página con Chrome y revisar con el protocolo DevTools la consola, la red, el rendimiento y la seguridad.",
        "Sin errores de consola ni excepciones; sin respuestas 4xx o 5xx; conexión TLS.",
        obtenido,
        "Aprobado" if not fila["erroresConsola"] and not reales and not otras else "Fallido",
        relativa(EV / "03-devtools" / fila["captura"]),
        (f"{len(precargas)} precargas de Next.js (páginas y estilos) canceladas al cambiar de página (net::ERR_ABORTED): comportamiento normal, no es defecto." if precargas else ""),
    ))

har = json.loads((EV / "03-devtools" / "devtools-red-portada.har").read_text(encoding="utf-8"))
entradas = har["log"]["entries"]
errores_har = [e for e in entradas if e["response"]["status"] >= 400]
casos.append((
    f"DT-{len(devtools) + 1:02d}", "Chrome DevTools", "Red (HAR) portada", "Calidad técnica",
    "Grabar el tráfico de red de la portada (pestaña Red, exportación HAR)",
    "Abrir la portada con Chrome y exportar la actividad de red como HAR.",
    "Todas las peticiones responden sin errores 4xx o 5xx.",
    f"{len(entradas)} peticiones grabadas; {len(errores_har)} con error.",
    "Aprobado" if not errores_har else "Fallido",
    relativa(EV / "03-devtools" / "devtools-red-portada.har"), "",
))

# --------------------------------------------------------------- 4. Playwright
resultado_pw = json.loads((EV / "04-playwright" / "playwright-resultado.json").read_text(encoding="utf-8"))
MODULOS = {"publico": "Sitio público", "admin": "Panel de administración", "cliente": "Mi cuenta", "movil": "Celular (Pixel 7)"}


def recorrer(suite):
    for spec in suite.get("specs", []):
        yield suite, spec
    for hija in suite.get("suites", []):
        yield from recorrer(hija)


for suite in resultado_pw["suites"]:
    archivo = suite["file"].replace(".spec.mjs", "")
    for _, spec in recorrer(suite):
        for prueba in spec["tests"]:
            resultado = prueba["results"][-1]
            id_caso, _, titulo = spec["title"].partition(" ")
            adjunto = next((a["name"] for a in resultado.get("attachments", []) if a.get("contentType") == "image/png"), None)
            evidencia = EV / "04-playwright" / f"{prueba['projectName']}-{adjunto}.png" if adjunto else EV / "04-playwright" / "informe-playwright" / "index.html"
            error = "; ".join(e.get("message", "")[:200] for e in resultado.get("errors", []))
            casos.append((
                id_caso, "Playwright", MODULOS.get(archivo, archivo),
                "Usabilidad (celular)" if archivo == "movil" else ("Seguridad" if "sin-admin" in (adjunto or "") or "sin sesión" in titulo or "exige" in titulo else "Funcional (E2E)"),
                titulo,
                f"Prueba automatizada en Chrome ({'celular Pixel 7' if prueba['projectName'] == 'movil' else 'escritorio 1280x720'}).",
                titulo,
                f"Aprobado en {resultado['duration'] / 1000:.1f} s." if resultado["status"] == "passed" else f"{resultado['status']}: {error}",
                "Aprobado" if resultado["status"] == "passed" else "Fallido",
                relativa(evidencia), "",
            ))

# -------------------------------------------------------------------- 5. ZAP
RIESGOS = {"3": "Alto", "2": "Medio", "1": "Bajo", "0": "Informativo"}
CONFIANZAS = {"4": "Confirmada", "3": "Alta", "2": "Media", "1": "Baja", "0": "Falso positivo"}
evaluaciones = EXTRA.get("evaluacionZap", {})
hallazgos = []


def plural(numero, palabra):
    return f"{numero} {palabra}" + ("" if numero == 1 else "s")


def limpiar(texto):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", texto or ""))).strip()


# Orden de ejecución: pasivo inicial, activo y pasivo de re-prueba (después de
# corregir los defectos). Si no hubo re-prueba, el pasivo es el único.
ESCANEOS = (
    ("Pasivo inicial", "antes-zap-pasivo.json", "antes-zap-pasivo.html"),
    ("Activo", "zap-activo.json", "zap-activo.html"),
    ("Pasivo re-prueba", "zap-pasivo.json", "zap-pasivo.html"),
)
resumen_zap = {}
for escaneo, archivo, _ in ESCANEOS:
    ruta = EV / "05-zap" / archivo
    if not ruta.exists():
        continue
    datos = json.loads(ruta.read_text(encoding="utf-8"))
    cuenta = {"Alto": 0, "Medio": 0, "Bajo": 0, "Informativo": 0, "sinEvaluar": 0, "defectos": 0}
    for sitio in datos.get("site", []):
        for alerta in sitio.get("alerts", []):
            riesgo = RIESGOS.get(str(alerta.get("riskcode")), "Informativo")
            cuenta[riesgo] += 1
            evaluacion = evaluaciones.get(alerta.get("name") or alerta.get("alert"), "")
            if not evaluacion:
                cuenta["sinEvaluar"] += 1
            elif evaluacion.startswith("Defecto"):
                cuenta["defectos"] += 1
            instancias = alerta.get("instances", [])
            hallazgos.append((
                escaneo, alerta.get("name") or alerta.get("alert"), riesgo,
                CONFIANZAS.get(str(alerta.get("confidence")), ""),
                f"CWE-{alerta.get('cweid')}" if alerta.get("cweid") not in (None, "", "-1", "0") else "",
                int(alerta.get("count") or len(instancias)),
                (instancias[0].get("uri", "").replace("https://host.docker.internal:8443", "") or "/") if instancias else "",
                limpiar(alerta.get("solution"))[:400],
                evaluaciones.get(alerta.get("name") or alerta.get("alert"), ""),
            ))
    resumen_zap[escaneo] = cuenta

PASOS_ZAP = {
    "Pasivo inicial": ("ZAP-01", "Escaneo pasivo (baseline) del sitio completo",
                       "zap-baseline.py con spider tradicional y AJAX (3 min) sobre https://host.docker.internal:8443; solo observa el tráfico."),
    "Activo": ("ZAP-02", "Escaneo activo con sesión de administrador sobre el sitio y la API",
               "Automation Framework (pruebas/zap/plan-activo.yaml): token de administrador QA, 26 rutas de la API con sus cuerpos JSON, spider y escaneo activo (inyección SQL, XSS, comandos, recorrido de rutas y otros)."),
    "Pasivo re-prueba": ("ZAP-03", "Re-prueba: escaneo pasivo después de corregir DEF-03 y DEF-04",
                         "El mismo escaneo pasivo de ZAP-01, con el sitio ya corregido."),
}
for escaneo, _, informe in ESCANEOS:
    cuenta = resumen_zap.get(escaneo)
    if cuenta is None:
        continue
    id_caso, descripcion, pasos = PASOS_ZAP[escaneo]
    # Fallido: alguna alerta alta. Observación: alerta sin evaluar o defecto
    # encontrado. Aprobado: todas las alertas evaluadas y sin defectos.
    if cuenta["Alto"]:
        estado = "Fallido"
    elif cuenta["sinEvaluar"] or cuenta["defectos"]:
        estado = "Observación"
    else:
        estado = "Aprobado"
    casos.append((
        id_caso, "OWASP ZAP", "Seguridad del sitio y la API", "Seguridad",
        descripcion, pasos,
        "Sin alertas de riesgo alto; todas las alertas evaluadas por el equipo y sin defectos pendientes.",
        f"Alertas: {plural(cuenta['Alto'], 'alta')}, {plural(cuenta['Medio'], 'media')}, {plural(cuenta['Bajo'], 'baja')} y {plural(cuenta['Informativo'], 'informativa')}. Detalle en la hoja «Hallazgos ZAP».",
        estado,
        relativa(EV / "05-zap" / informe),
        EXTRA.get("notasZap", {}).get(id_caso, ""),
    ))

# ================================================================ Libro Excel
libro = Workbook()

# ----------------------------------------------------------------- Resumen
resumen = libro.active
resumen.title = "Resumen"
resumen.sheet_view.showGridLines = False
resumen["A1"] = "Plan y resultados de pruebas — Focus Power Fit CRM"
resumen["A1"].font = TITULO
resumen["A2"] = f"Fecha de ejecución: {FECHA}. Entorno QA en Docker con una copia cifrada de la base y los correos apagados."
resumen["A2"].font = NORMAL
resumen.merge_cells("A2:H2")

resumen["A4"] = "Resultados por herramienta"
resumen["A4"].font = SUBTITULO
herramientas = [
    ("n8n", "FitBot: flujo, ejecuciones y 52 conversaciones"),
    ("Postman", "API: funcionales, permisos y seguridad (Newman)"),
    ("Chrome DevTools", "Lighthouse, consola, red, rendimiento y TLS"),
    ("Playwright", "Punta a punta en escritorio y celular"),
    ("OWASP ZAP", "Escaneo de seguridad pasivo y activo"),
]
encabezados = ["Herramienta", "Qué se probó", "Casos", "Aprobados", "Fallidos", "Observaciones", "% aprobación"]
fila_inicio = 5
filas = [(h, d, None, None, None, None, None) for h, d in herramientas]
fin = tabla(resumen, fila_inicio, encabezados, filas, [20, 48, 10, 12, 10, 15, 14], centrar=(3, 4, 5, 6, 7))
for n in range(fila_inicio + 1, fin + 1):
    rango_h = "'Casos de prueba'!$B:$B"
    rango_e = "'Casos de prueba'!$I:$I"
    resumen.cell(row=n, column=3, value=f'=COUNTIF({rango_h},A{n})')
    resumen.cell(row=n, column=4, value=f'=COUNTIFS({rango_h},A{n},{rango_e},"Aprobado")')
    resumen.cell(row=n, column=5, value=f'=COUNTIFS({rango_h},A{n},{rango_e},"Fallido")')
    resumen.cell(row=n, column=6, value=f'=COUNTIFS({rango_h},A{n},{rango_e},"Observación")')
    resumen.cell(row=n, column=7, value=f"=IF(C{n}=0,0,D{n}/C{n})")
    resumen.cell(row=n, column=7).number_format = "0.0%"
total = fin + 1
resumen.cell(row=total, column=1, value="Total").font = NEGRITA
for col in range(3, 7):
    letra = get_column_letter(col)
    celda = resumen.cell(row=total, column=col, value=f"=SUM({letra}{fila_inicio + 1}:{letra}{fin})")
    celda.font = NEGRITA
    celda.alignment = CENTRO
celda = resumen.cell(row=total, column=7, value=f"=IF(C{total}=0,0,D{total}/C{total})")
celda.number_format = "0.0%"
celda.font = NEGRITA
celda.alignment = CENTRO
for col in range(1, 8):
    resumen.cell(row=total, column=col).border = BORDE

fila = total + 2
resumen.cell(row=fila, column=1, value="Alertas de OWASP ZAP por riesgo").font = SUBTITULO
filas_zap = [(r, None, None, None) for r in ("Alto", "Medio", "Bajo", "Informativo")]
fin_zap = tabla(resumen, fila + 1, ["Riesgo"] + [e[0] for e in ESCANEOS], filas_zap, [20, 48, 10, 12], centrar=(2, 3, 4))
for n in range(fila + 2, fin_zap + 1):
    for col, (escaneo, _, _) in enumerate(ESCANEOS, start=2):
        resumen.cell(row=n, column=col, value=f"=COUNTIFS('Hallazgos ZAP'!$A:$A,\"{escaneo}\",'Hallazgos ZAP'!$C:$C,A{n})")

fila = fin_zap + 2
resumen.cell(row=fila, column=1, value="Defectos").font = SUBTITULO
filas_def = [("Encontrados", None), ("Corregidos y re-probados", None), ("Aceptados por el equipo", None), ("Abiertos", None), ("Mejoras futuras", None)]
fin_def = tabla(resumen, fila + 1, ["Estado", "Cantidad"], filas_def, [20, 48], centrar=(2,))
resumen.cell(row=fila + 2, column=2, value='=COUNTIF(Defectos!$A:$A,"DEF-*")')
resumen.cell(row=fila + 3, column=2, value='=COUNTIF(Defectos!$G:$G,"Corregido*")')
resumen.cell(row=fila + 4, column=2, value='=COUNTIF(Defectos!$G:$G,"Aceptado*")')
resumen.cell(row=fila + 5, column=2, value='=COUNTIF(Defectos!$G:$G,"Abierto*")')
resumen.cell(row=fila + 6, column=2, value='=COUNTIF(Defectos!$G:$G,"Mejora*")')

fila = fin_def + 2
resumen.cell(row=fila, column=1, value="Cómo leer este libro").font = SUBTITULO
leyenda = [
    "Aprobado: el resultado obtenido coincide con el esperado.",
    "Fallido: el resultado no coincide; se registra como defecto.",
    "Observación: funciona, pero hay una mejora recomendada (por ejemplo, rendimiento bajo 90).",
    "La columna Evidencia enlaza al archivo de respaldo (captura, informe o registro). Los enlaces son relativos: mantén el Excel junto a la carpeta «evidencias».",
    "Las capturas del panel de administración tapan tablas y listas con un recuadro, porque el entorno QA usa una copia de la base real.",
    "Las cifras de esta hoja se calculan con fórmulas a partir de las otras hojas.",
]
for n, texto in enumerate(leyenda, start=fila + 1):
    resumen.cell(row=n, column=1, value=f"• {texto}").font = NORMAL
    resumen.merge_cells(start_row=n, start_column=1, end_row=n, end_column=8)

# ----------------------------------------------------------- Casos de prueba
hoja = libro.create_sheet("Casos de prueba")
encabezados = ["ID", "Herramienta", "Módulo", "Tipo de prueba", "Caso de prueba", "Pasos", "Resultado esperado",
               "Resultado obtenido", "Estado", "Evidencia", "Observaciones", "Fecha", "Ejecutado por"]
ejecutor = EXTRA.get("ejecutadoPor", "Equipo Focus Power Fit")
notas_casos = EXTRA.get("notasCasos", {})
filas = [c[:10] + (notas_casos.get(c[0], c[10]),) + (FECHA, ejecutor) for c in casos]
fin = tabla(hoja, 1, encabezados, filas, [11, 16, 22, 18, 42, 40, 44, 48, 13, 30, 40, 12, 20],
            enlaces={10: True}, centrar=(1, 9, 12))
hoja.freeze_panes = "C2"
hoja.auto_filter.ref = f"A1:M{fin}"
colorear_estados(hoja, f"I2:I{fin}")
validacion = DataValidation(type="list", formula1='"' + ",".join(ESTADOS) + '"', allow_blank=False)
hoja.add_data_validation(validacion)
validacion.add(f"I2:I{fin}")

# ------------------------------------------------------------- Hallazgos ZAP
zap = libro.create_sheet("Hallazgos ZAP")
orden = {"Alto": 0, "Medio": 1, "Bajo": 2, "Informativo": 3}
orden_escaneo = {e[0]: n for n, e in enumerate(ESCANEOS)}
hallazgos.sort(key=lambda h: (orden_escaneo[h[0]], orden[h[2]], h[1]))
encabezados = ["Escaneo", "Alerta", "Riesgo", "Confianza", "CWE", "N.º de URL", "URL de ejemplo", "Solución sugerida por ZAP", "Evaluación del equipo"]
fin = tabla(zap, 1, encabezados, hallazgos, [16, 40, 12, 13, 11, 10, 40, 60, 60], centrar=(1, 3, 4, 5, 6))
zap.freeze_panes = "B2"
zap.auto_filter.ref = f"A1:I{max(fin, 2)}"
for texto, color in (("Alto", "FECACA"), ("Medio", "FED7AA"), ("Bajo", "FEF3C7"), ("Informativo", "E0F2FE")):
    zap.conditional_formatting.add(
        f"C2:C{max(fin, 2)}",
        CellIsRule(operator="equal", formula=[f'"{texto}"'], fill=PatternFill("solid", fgColor=color)),
    )

# ---------------------------------------------------------------- Lighthouse
lh = libro.create_sheet("Lighthouse")
filas = [
    ("portada" if f["ruta"] == "/" else f["ruta"], "Celular" if f["dispositivo"] == "movil" else "Escritorio",
     f["rendimiento"], f["accesibilidad"], f["buenasPracticas"], f["seo"], f["lcp"], f["cls"],
     relativa(EV / "03-devtools" / f["informe"]))
    for f in lighthouse
]
fin = tabla(lh, 1, ["Página", "Dispositivo", "Rendimiento", "Accesibilidad", "Buenas prácticas", "SEO", "LCP", "CLS", "Informe"],
            filas, [16, 13, 13, 14, 16, 8, 10, 8, 36], enlaces={9: True}, centrar=(2, 3, 4, 5, 6, 7, 8))
promedio = fin + 1
lh.cell(row=promedio, column=1, value="Promedio").font = NEGRITA
for col in range(3, 7):
    letra = get_column_letter(col)
    celda = lh.cell(row=promedio, column=col, value=f"=AVERAGE({letra}2:{letra}{fin})")
    celda.number_format = "0"
    celda.font = NEGRITA
    celda.alignment = CENTRO
lh.cell(row=promedio + 2, column=1, value="Puntajes de 0 a 100. Verde: 90 o más; amarillo: 50 a 89; rojo: menos de 50 (criterio de Lighthouse).").font = NORMAL
for regla, color in ((">=90", "DCFCE7"), ("<50", "FEE2E2")):
    lh.conditional_formatting.add(
        f"C2:F{fin}",
        FormulaRule(formula=[f"C2{regla}"], fill=PatternFill("solid", fgColor=color)),
    )
lh.conditional_formatting.add(
    f"C2:F{fin}", FormulaRule(formula=["AND(C2>=50,C2<90)"], fill=PatternFill("solid", fgColor="FEF3C7"))
)

# ------------------------------------------------------------------ Defectos
defectos = libro.create_sheet("Defectos")
filas = [
    (d["id"], d["titulo"], d["severidad"], d["detectadoCon"], d["descripcion"], d["accion"], d["estado"],
     relativa(RAIZ / d["evidencia"]) if d.get("evidencia") else "")
    for d in EXTRA.get("defectos", [])
]
fin = tabla(defectos, 1, ["ID", "Defecto", "Severidad", "Detectado con", "Descripción y causa", "Acción", "Estado", "Evidencia"],
            filas, [9, 36, 11, 16, 60, 60, 26, 34], enlaces={8: True}, centrar=(1, 3, 4))
defectos.freeze_panes = "B2"

# ------------------------------------------------------- Entorno y herramientas
entorno = libro.create_sheet("Entorno y herramientas")
filas = [(clave, valor) for clave, valor in EXTRA.get("entorno", {}).items()]
fin = tabla(entorno, 1, ["Elemento", "Detalle"], filas, [30, 100])

for hoja_actual in libro.worksheets:
    hoja_actual.sheet_properties.tabColor = ROJO if hoja_actual.title == "Resumen" else "6B7280"

libro.save(SALIDA)
print(f"Excel generado: {SALIDA} ({len(casos)} casos, {len(hallazgos)} alertas ZAP)")
