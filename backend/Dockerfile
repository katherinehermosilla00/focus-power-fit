# Imágenes del backend. Se usan desde deploy/docker-compose.yml.
#   api:        la API de Express.
#   respaldos:  la tarea de respaldos cifrados (crear, probar, restaurar).
#
# El código queda en /app/backend para que la carpeta de respaldos (/respaldos)
# quede fuera del proyecto, como exige el script de respaldos.

FROM node:24-bookworm-slim AS dependencias
WORKDIR /app/backend
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ------------------------------------------------------------------
FROM node:24-bookworm-slim AS api
ENV NODE_ENV=production \
    TZ=America/Santiago
WORKDIR /app/backend
COPY --from=dependencias /app/backend/node_modules ./node_modules
COPY package.json crear-admin.mjs ./
COPY src ./src
# Contratos e imágenes subidas: se montan en un volumen.
RUN mkdir -p uploads && chown node:node uploads
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/index.js"]

# ------------------------------------------------------------------
# Los respaldos usan mysqldump y mysql oficiales: el cliente de MariaDB que
# traen otras imágenes no acepta todas las opciones. Por eso parte de MySQL
# y se le agrega Node.
FROM mysql:8.0 AS respaldos
ENV NODE_ENV=production \
    TZ=America/Santiago
RUN microdnf module enable -y nodejs:22 \
 && microdnf install -y nodejs \
 && microdnf clean all
WORKDIR /app/backend
COPY --from=dependencias /app/backend/node_modules ./node_modules
COPY package.json ./
COPY src ./src
ENTRYPOINT ["node", "src/scripts/respaldos.js"]
CMD ["crear"]
