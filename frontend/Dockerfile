# Imagen del frontend (Next.js). Se usa desde deploy/docker-compose.yml.
# NEXT_PUBLIC_API_URL se fija al compilar: es la dirección pública del sitio,
# por ejemplo https://focuspowerfit.cl, y también entra en la política de
# contenido (CSP) de next.config.ts.

FROM node:24-bookworm-slim AS dependencias
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ------------------------------------------------------------------
FROM node:24-bookworm-slim AS compilacion
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_TELEMETRY_DISABLED=1
RUN test -n "$NEXT_PUBLIC_API_URL" || (echo "Falta NEXT_PUBLIC_API_URL" && exit 1)
WORKDIR /app
COPY --from=dependencias /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ------------------------------------------------------------------
FROM node:24-bookworm-slim AS web
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TZ=America/Santiago
WORKDIR /app
COPY --from=compilacion --chown=node:node /app/.next/standalone ./
COPY --from=compilacion --chown=node:node /app/.next/static ./.next/static
COPY --from=compilacion --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
