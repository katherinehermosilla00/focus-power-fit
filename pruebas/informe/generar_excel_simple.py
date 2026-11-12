"""Excel simple de una hoja, con las pruebas agrupadas.

    python informe/generar_excel_simple.py <carpeta-de-pruebas>

Lee el Excel detallado (Pruebas_y_evidencias_Focus_Power_Fit_detallado.xlsx),
que genera generar_excel.py, y agrupa sus casos. Así los números de ambos
archivos siempre coinciden.
"""

import re
import sys
from pathlib import Path

from openpyxl import Workbook, load_workbook
from openpyxl.formatting.rule import CellIsRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

RAIZ = Path(sys.argv[1]).resolve()
DETALLADO = RAIZ / "Pruebas_y_evidencias_Focus_Power_Fit_detallado.xlsx"
SALIDA = Path(sys.argv[2]) if len(sys.argv) > 2 else RAIZ / "Pruebas_y_evidencias_Focus_Power_Fit.xlsx"

def respuesta_limpia(texto):
    """Respuesta de FitBot sin emojis, enlaces ni tiempos, fácil de leer."""
    texto = texto or ""
    partes = re.match(r"HTTP \d+ en \d+ ms\. Respondió: (.*)", texto, re.S)
    if not partes:
        return texto
    original = partes.group(1)
    limpio = re.sub(r"https?://\S+", "", original)
    limpio = re.sub(r"(\d)\ufe0f?\u20e3", r"\1)", limpio)
    limpio = re.sub(r"[\U0001F000-\U0001FAFF\u2600-\u27BF\u2B00-\u2BFF\ufe0f\u200d]+", " · ", limpio)
    limpio = re.sub(r"\s+", " ", limpio)
    limpio = re.sub(r"(\s*·\s*)+", " · ", limpio).strip(" ·")
    # El registro corta en 130 unidades de JavaScript (un emoji cuenta como 2).
    if len(original.encode("utf-16-le")) // 2 >= 130:
        ultimo = original.strip().split(" ")[-1]
        if re.fullmatch(r"https?://\S*|[\U0001F000-\U0001FAFF☀-➿⬀-⯿️⃣\d]+", ultimo):
            # El corte cayó en un enlace o un emoji: el texto visible está completo.
            limpio += "…"
        else:
            limpio = limpio.rsplit(" ", 1)[0].rstrip(",.;:·- ") + "…"
    return f"Respondió: {limpio}"


def legible(texto):
    """Quita la notación técnica de los patrones de FitBot."""
    texto = texto or ""
    negacion = re.search(r"\^\(\?!\[…\]\*(.*?)\)", texto)
    if negacion:
        return f"HTTP 200 y una respuesta que no diga: {negacion.group(1)}"
    return texto.replace("[…]*", " … ")


# --------------------------------------------------------- casos detallados
fuente = load_workbook(DETALLADO)
casos = {}
for fila in fuente["Casos de prueba"].iter_rows(min_row=2):
    id_caso = fila[0].value
    casos[id_caso] = {
        "herramienta": fila[1].value,
        "tipo": fila[3].value,
        "caso": fila[4].value,
        "esperado": legible(fila[6].value),
        "estado": fila[8].value,
        "evidencia": fila[9].hyperlink.target if fila[9].hyperlink else "",
        "obtenido": respuesta_limpia(fila[7].value),
        "observaciones": fila[10].value or "",
    }
defectos = [
    fila for fila in fuente["Defectos"].iter_rows(min_row=2, values_only=True) if fila[0]
]
fecha = fuente["Casos de prueba"]["L2"].value
responsable = fuente["Casos de prueba"]["M2"].value

# ------------------------------------------------------------------ grupos
# (herramienta, qué se probó, resultado esperado, patrón de ID, ID de la evidencia, tipo, nota)
GRUPOS = [
    ("n8n", "El flujo de FitBot está publicado y activo", "Flujo publicado con sus reglas y su IA local", r"N8N-01$", "N8N-01", "Funcional", ""),
    ("n8n", "FitBot responde las preguntas frecuentes, encadena conversaciones y limita la IA", "Responde cada mensaje con el texto correcto", r"FIT-\d+$", "FIT-01", "Funcional", "17 respuestas no están en la versión actual de FitBot (DEF-05)"),
    ("n8n", "Las conversaciones quedan registradas en n8n", "Todas las ejecuciones terminan bien", r"N8N-02$", "N8N-02", "Funcional", ""),
    ("Postman", "Salud del servidor y datos públicos", "Servidor y base de datos responden", r"API-0[12]$", "API-01", "Funcional", ""),
    ("Postman", "Inicio de sesión y protección con token", "Entra solo con datos correctos; sin token responde 401", r"API-0[3-8]$", "API-03", "Seguridad", ""),
    ("Postman", "Permisos por rol (cliente no entra a lo de administrador)", "Responde 403 al cliente", r"API-(09|10|37)$", "API-09", "Seguridad", ""),
    ("Postman", "Planes, profesores y horarios", "Crea, edita y rechaza datos inválidos", r"API-1[1-6]$", "API-11", "Funcional", ""),
    ("Postman", "Clientes", "Crea y rechaza duplicados o datos incompletos", r"API-1[7-9]$", "API-17", "Funcional", ""),
    ("Postman", "Asignaciones y asistencia", "Asigna plan y horario; no permite asistencia futura ni duplicada", r"API-2[0-4]$", "API-20", "Funcional", ""),
    ("Postman", "Pagos", "Registra pagos válidos y rechaza montos inválidos", r"API-2[56]$", "API-25", "Funcional", ""),
    ("Postman", "Mi cuenta y cancelación de clases (regla de 6 horas)", "Muestra la próxima clase; cancela una sola vez", r"API-(2[7-9]|30)$", "API-27", "Funcional", "DEF-01 encontrado y corregido"),
    ("Postman", "FitBot desde la API", "Responde y rechaza mensajes inválidos", r"API-3[1-3]$", "API-31", "Funcional", ""),
    ("Postman", "Seguridad: cabeceras, archivos privados, inyección SQL y bloqueo por intentos", "Cabeceras seguras; sin acceso ni inyección; bloquea tras 10 intentos", r"API-(3[4-6]|38)$", "API-34", "Seguridad", ""),
    ("Chrome DevTools", "Lighthouse en celular (5 páginas)", "Puntaje 90 o más en cada categoría", r"LH-(01|03|05|07|09)$", "LH-01", "Rendimiento", "Portada 83/100: era 71 (DEF-02 corregido)"),
    ("Chrome DevTools", "Lighthouse en escritorio (5 páginas)", "Puntaje 90 o más en cada categoría", r"LH-(02|04|06|08|10)$", "LH-02", "Rendimiento", ""),
    ("Chrome DevTools", "Consola, red y HTTPS en 7 páginas", "Sin errores de consola ni de red; TLS activo", r"DT-0[1-7]$", "DT-01", "Calidad técnica", ""),
    ("Chrome DevTools", "Tráfico de red de la portada (HAR)", "Todas las peticiones sin error", r"DT-08$", "DT-08", "Calidad técnica", ""),
    ("Playwright", "Sitio público, FitBot y protección del panel", "Todo carga y responde; el panel pide sesión", r"E2E-0[1-6]$", "E2E-01", "Funcional", ""),
    ("Playwright", "Inicio de sesión y panel del administrador", "Entra y ve los indicadores", r"E2E-0[78]$", "E2E-07", "Funcional", ""),
    ("Playwright", "Los 12 módulos del panel cargan sin errores", "Cada módulo abre sin errores", r"E2E-09\.\d+$", "E2E-09.01", "Funcional", ""),
    ("Playwright", "Crear un plan desde el formulario", "El plan aparece en la lista", r"E2E-10$", "E2E-10", "Funcional", ""),
    ("Playwright", "Mi cuenta: plan, próxima clase, cancelar clase y cerrar sesión", "El cliente ve su plan y cancela a tiempo", r"E2E-1[1-4]$", "E2E-12", "Funcional", ""),
    ("Playwright", "Vista en celular (9 pantallas)", "Sin desplazamiento horizontal", r"E2E-15\.\d+$", "E2E-15.01", "Usabilidad", ""),
    ("OWASP ZAP", "Escaneo pasivo de seguridad", "Sin alertas altas", r"ZAP-01$", "ZAP-01", "Seguridad", "Encontró DEF-03 y DEF-04"),
    ("OWASP ZAP", "Escaneo activo: ataques de inyección SQL, XSS y otros", "Sin alertas altas ni vulnerabilidades", r"ZAP-02$", "ZAP-02", "Seguridad", "0 vulnerabilidades graves"),
    ("OWASP ZAP", "Re-prueba de seguridad después de corregir", "Los defectos ya no aparecen", r"ZAP-03$", "ZAP-03", "Seguridad", "DEF-03 y DEF-04 corregidos"),
]

filas = []
usados = set()
for herramienta, que, esperado, patron, id_evidencia, tipo, nota in GRUPOS:
    ids = [i for i in casos if re.fullmatch(patron, i)]
    usados.update(ids)
    estados = [casos[i]["estado"] for i in ids]
    aprobadas = estados.count("Aprobado")
    if "Fallido" in estados:
        estado = "Fallido"
    elif "Observación" in estados:
        estado = "Observación"
    else:
        estado = "Aprobado"
    if herramienta == "OWASP ZAP":
        resultado = casos[ids[0]]["obtenido"].replace(" Detalle en la hoja «Hallazgos ZAP».", "").rstrip(".")
    else:
        resultado = f"{aprobadas} de {len(ids)} aprobadas"
    if nota:
        resultado = f"{resultado}. {nota}"
    filas.append((herramienta, que, esperado, resultado, len(ids), aprobadas, estado, tipo,
                  casos[id_evidencia]["evidencia"]))

faltan = set(casos) - usados
if faltan:
    raise SystemExit(f"Casos sin grupo: {sorted(faltan)}")

# ------------------------------------------------------------------ estilos
F = "Arial"
NEGRO = PatternFill("solid", fgColor="000000")
MENTA = PatternFill("solid", fgColor="C6F1E0")
fino = Side(style="thin", color="000000")
BORDE = Border(left=fino, right=fino, top=fino, bottom=fino)
CENTRO = Alignment(horizontal="center", vertical="center", wrap_text=True)
IZQUIERDA = Alignment(horizontal="left", vertical="center", wrap_text=True)

libro = Workbook()
hoja = libro.active
hoja.title = "Resumen"
hoja.sheet_view.showGridLines = False

anchos = [5, 16, 46, 38, 38, 9, 11, 14, 15, 30]
for col, ancho in enumerate(anchos, start=1):
    hoja.column_dimensions[chr(64 + col)].width = ancho

# Título
hoja.merge_cells("A1:J1")
hoja["A1"] = "Seguimiento de Pruebas de QA — Focus Power Fit CRM"
hoja["A1"].font = Font(name=F, size=14, bold=True, color="FFFFFF")
hoja["A1"].fill = NEGRO
hoja["A1"].alignment = CENTRO
hoja.row_dimensions[1].height = 26

# Bloque de datos (etiqueta en verde, valor al lado)
INICIO_TABLA = 8
fin_tabla = INICIO_TABLA + len(filas)
rango_pruebas = f"F{INICIO_TABLA + 1}:F{fin_tabla}"
rango_aprob = f"G{INICIO_TABLA + 1}:G{fin_tabla}"
rango_estado = f"H{INICIO_TABLA + 1}:H{fin_tabla}"
inicio_def = fin_tabla + 3
fin_def = inicio_def + len(defectos)

datos = [
    [("Fecha", fecha), ("Total de pruebas", f"=SUM({rango_pruebas})"), ("Defectos encontrados", f'=COUNTIF(B{inicio_def + 1}:B{fin_def},"DEF-*")')],
    [("Entorno", "Docker QA"), ("Aprobadas", f"=SUM({rango_aprob})"), ("Defectos corregidos", f'=COUNTIF(F{inicio_def + 1}:F{fin_def},"Corregido*")')],
    [("Responsable", responsable), ("% de aprobación", f"=IF(SUM({rango_pruebas})=0,0,SUM({rango_aprob})/SUM({rango_pruebas}))"), ("Defectos abiertos", f'=COUNTIF(F{inicio_def + 1}:F{fin_def},"Abierto*")')],
    [("Alertas graves (ZAP)", 0), ("Grupos con observación", f'=COUNTIF({rango_estado},"Observación")'), ("Defectos aceptados", f'=COUNTIF(F{inicio_def + 1}:F{fin_def},"Aceptado*")')],
]
for n, fila_datos in enumerate(datos, start=3):
    for (etiqueta, valor), (col_e, col_v) in zip(fila_datos, (("B", "C"), ("D", "E"), ("F", "H"))):
        celda = hoja[f"{col_e}{n}"]
        celda.value = etiqueta
        celda.font = Font(name=F, size=10)
        celda.fill = MENTA
        celda.border = BORDE
        celda.alignment = IZQUIERDA
        if col_e == "F":
            hoja.merge_cells(f"F{n}:G{n}")
            hoja[f"G{n}"].border = BORDE
        valor_celda = hoja[f"{col_v}{n}"]
        valor_celda.value = valor
        valor_celda.font = Font(name=F, size=10, bold=True)
        valor_celda.border = BORDE
        valor_celda.alignment = CENTRO
        if etiqueta == "% de aprobación":
            valor_celda.number_format = "0.0%"
    hoja.row_dimensions[n].height = 18

# Tabla de pruebas
encabezados = ["N.º", "Herramienta", "Qué se probó", "Resultado esperado", "Resultado obtenido",
               "Pruebas", "Aprobadas", "Estado", "Tipo", "Evidencia"]
for col, texto in enumerate(encabezados, start=1):
    celda = hoja.cell(row=INICIO_TABLA, column=col, value=texto)
    celda.font = Font(name=F, size=10, bold=True, color="FFFFFF")
    celda.fill = NEGRO
    celda.alignment = CENTRO
    celda.border = BORDE
hoja.row_dimensions[INICIO_TABLA].height = 22

for n, (herramienta, que, esperado, resultado, total, aprobadas, estado, tipo, evidencia) in enumerate(filas, start=1):
    fila = INICIO_TABLA + n
    valores = [n, herramienta, que, esperado, resultado, total, aprobadas, estado, tipo, Path(evidencia).name]
    for col, valor in enumerate(valores, start=1):
        celda = hoja.cell(row=fila, column=col, value=valor)
        celda.font = Font(name=F, size=10)
        celda.border = BORDE
        celda.alignment = IZQUIERDA if col in (2, 3, 4, 5, 10) else CENTRO
    enlace = hoja.cell(row=fila, column=10)
    enlace.hyperlink = evidencia
    enlace.font = Font(name=F, size=10, color="1D4ED8", underline="single")

# Colores como en el modelo: verde bien, amarillo atención, rojo mal.
COLORES_ESTADO = {
    "Aprobado": ("C6EFCE", "006100"),
    "Observación": ("FFEB9C", "9C5700"),
    "Fallido": ("FFC7CE", "9C0006"),
}
for texto, (fondo, letra) in COLORES_ESTADO.items():
    hoja.conditional_formatting.add(
        rango_estado,
        CellIsRule(operator="equal", formula=[f'"{texto}"'],
                   fill=PatternFill("solid", fgColor=fondo), font=Font(color=letra, bold=True)),
    )
COLORES_TIPO = {
    "Funcional": ("DBEAFE", "1E3A8A"),
    "Seguridad": ("EDE9FE", "5B21B6"),
    "Rendimiento": ("FFEB9C", "9C5700"),
    "Calidad técnica": ("E0F2FE", "075985"),
    "Usabilidad": ("CCFBF1", "115E59"),
}
for texto, (fondo, letra) in COLORES_TIPO.items():
    hoja.conditional_formatting.add(
        f"I{INICIO_TABLA + 1}:I{fin_tabla}",
        CellIsRule(operator="equal", formula=[f'"{texto}"'],
                   fill=PatternFill("solid", fgColor=fondo), font=Font(color=letra)),
    )

# Defectos (en la misma hoja)
hoja.merge_cells(f"B{inicio_def - 1}:H{inicio_def - 1}")
titulo_def = hoja[f"B{inicio_def - 1}"]
titulo_def.value = "Defectos encontrados y corregidos"
titulo_def.font = Font(name=F, size=12, bold=True, color="FFFFFF")
titulo_def.fill = NEGRO
titulo_def.alignment = CENTRO

for col, texto in ((2, "ID"), (3, "Problema"), (4, "Detectado con"), (5, "Corrección"), (6, "Estado")):
    celda = hoja.cell(row=inicio_def, column=col, value=texto)
    celda.font = Font(name=F, size=10, bold=True)
    celda.fill = MENTA
    celda.alignment = CENTRO
    celda.border = BORDE
hoja.merge_cells(f"F{inicio_def}:H{inicio_def}")

CORRECCIONES = {
    "DEF-01": "La API revisa antes de guardar, y se creó el índice en la base real (con respaldo previo).",
    "DEF-02": "Imagen de la portada en WebP: de 2,4 MB a 154 KB. Carga en celular de 14,9 s a 2,0 s.",
    "DEF-03": "Los 5 formularios con contraseña ahora usan method=\"post\".",
    "DEF-04": "Se desactivó la cabecera X-Powered-By del sitio.",
    "DEF-05": "Se mantiene la versión del equipo; la versión completa (52 de 52) quedó respaldada.",
    "OBS-01": "Mejora futura: enviar menos JavaScript en la portada.",
}
for n, (id_def, titulo, _sev, detectado, _desc, _accion, estado, _ev) in enumerate(defectos, start=1):
    fila = inicio_def + n
    estado_corto = "Corregido" if estado.startswith("Corregido") else estado
    for col, valor in ((2, id_def), (3, titulo), (4, detectado), (5, CORRECCIONES.get(id_def, "")), (6, estado_corto)):
        celda = hoja.cell(row=fila, column=col, value=valor)
        celda.font = Font(name=F, size=10)
        celda.border = BORDE
        celda.alignment = CENTRO if col in (2, 6) else IZQUIERDA
    hoja.merge_cells(f"F{fila}:H{fila}")
    for col in (7, 8):
        hoja.cell(row=fila, column=col).border = BORDE
for texto, (fondo, letra) in (("Corregido", ("C6EFCE", "006100")), ("Mejora futura", ("FFEB9C", "9C5700")), ("Aceptado por el equipo", ("FFEB9C", "9C5700")), ("Abierto", ("FFC7CE", "9C0006"))):
    hoja.conditional_formatting.add(
        f"F{inicio_def + 1}:F{fin_def}",
        CellIsRule(operator="equal", formula=[f'"{texto}"'],
                   fill=PatternFill("solid", fgColor=fondo), font=Font(color=letra, bold=True)),
    )

nota = fin_def + 2
hoja.merge_cells(f"B{nota}:J{nota}")
hoja[f"B{nota}"] = ("La columna Evidencia abre la captura, el informe o el registro de cada prueba (carpeta «evidencias»). "
                    "El detalle de cada una de las pruebas está en la hoja «General».")
hoja[f"B{nota}"].font = Font(name=F, size=9, italic=True, color="555555")
hoja[f"B{nota}"].alignment = IZQUIERDA
hoja.row_dimensions[nota].height = 28

hoja.freeze_panes = f"A{INICIO_TABLA + 1}"
hoja.page_setup.orientation = "landscape"
hoja.page_setup.fitToWidth = 1
hoja.page_setup.fitToHeight = 1
hoja.sheet_properties.pageSetUpPr.fitToPage = True

# ---------------------------------------------------------- Hoja General
# Todas las pruebas, una por fila, con el mismo estilo.
TIPO_SIMPLE = {
    "Funcional (chatbot)": "Funcional", "Funcional (API)": "Funcional", "Funcional (E2E)": "Funcional",
    "Integración": "Funcional", "Rendimiento y accesibilidad": "Rendimiento",
    "Usabilidad (celular)": "Usabilidad",
}
general = libro.create_sheet("General")
general.sheet_view.showGridLines = False
anchos_general = [6, 11, 16, 46, 40, 44, 14, 15, 30, 40]
for col, ancho in enumerate(anchos_general, start=1):
    general.column_dimensions[chr(64 + col)].width = ancho

general.merge_cells("A1:J1")
general["A1"] = f"Detalle de las {len(casos)} pruebas — Focus Power Fit CRM"
general["A1"].font = Font(name=F, size=14, bold=True, color="FFFFFF")
general["A1"].fill = NEGRO
general["A1"].alignment = CENTRO
general.row_dimensions[1].height = 26

encabezados_general = ["N.º", "ID", "Herramienta", "Qué se probó", "Resultado esperado",
                       "Resultado obtenido", "Estado", "Tipo", "Evidencia", "Observaciones"]
for col, texto in enumerate(encabezados_general, start=1):
    celda = general.cell(row=3, column=col, value=texto)
    celda.font = Font(name=F, size=10, bold=True, color="FFFFFF")
    celda.fill = NEGRO
    celda.alignment = CENTRO
    celda.border = BORDE
general.row_dimensions[3].height = 22

for n, (id_caso, caso) in enumerate(casos.items(), start=1):
    fila = 3 + n
    valores = [n, id_caso, caso["herramienta"], caso["caso"], caso["esperado"], caso["obtenido"],
               caso["estado"], TIPO_SIMPLE.get(caso["tipo"], caso["tipo"]), Path(caso["evidencia"]).name,
               caso["observaciones"]]
    for col, valor in enumerate(valores, start=1):
        celda = general.cell(row=fila, column=col, value=valor)
        celda.font = Font(name=F, size=10)
        celda.border = BORDE
        celda.alignment = CENTRO if col in (1, 2, 7, 8) else IZQUIERDA
    enlace = general.cell(row=fila, column=9)
    if caso["evidencia"]:
        enlace.hyperlink = caso["evidencia"]
        enlace.font = Font(name=F, size=10, color="1D4ED8", underline="single")

fin_general = 3 + len(casos)
for texto, (fondo, letra) in COLORES_ESTADO.items():
    general.conditional_formatting.add(
        f"G4:G{fin_general}",
        CellIsRule(operator="equal", formula=[f'"{texto}"'],
                   fill=PatternFill("solid", fgColor=fondo), font=Font(color=letra, bold=True)),
    )
for texto, (fondo, letra) in COLORES_TIPO.items():
    general.conditional_formatting.add(
        f"H4:H{fin_general}",
        CellIsRule(operator="equal", formula=[f'"{texto}"'],
                   fill=PatternFill("solid", fgColor=fondo), font=Font(color=letra)),
    )
general.freeze_panes = "A4"
general.auto_filter.ref = f"A3:J{fin_general}"
general.page_setup.orientation = "landscape"
general.page_setup.fitToWidth = 1
general.page_setup.fitToHeight = 0
general.sheet_properties.pageSetUpPr.fitToPage = True

libro.active = 0
libro.save(SALIDA)
print(f"Excel simple: {SALIDA.name} ({len(filas)} grupos, {sum(f[4] for f in filas)} pruebas)")
