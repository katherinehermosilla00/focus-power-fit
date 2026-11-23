
import type { NextConfig } from "next";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const esDesarrollo = process.env.NODE_ENV === "development";

// SALIDA=estatica genera el sitio como archivos en la carpeta out/, para
// subirlo a un hosting compartido (public_html del cPanel). Ahí las cabeceras
// de seguridad las pone el archivo .htaccess (ver deploy/cpanel).
const esEstatico = process.env.SALIDA === "estatica";

// Next.js necesita scripts en línea sin nonce, por eso se permite 'unsafe-inline'.
// 'unsafe-eval' y ws: se usan solo durante el desarrollo.
const politicaContenido = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${esDesarrollo ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${apiUrl}`,
  "font-src 'self'",
  `connect-src 'self' ${apiUrl}${esDesarrollo ? " ws:" : ""}`,
  "frame-src https://www.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  devIndicators: false,
  // No informar la tecnología del sitio en la cabecera X-Powered-By.
  poweredByHeader: false,
  // Docker: servidor mínimo (ver Dockerfile). Hosting compartido: solo archivos.
  output: esEstatico ? "export" : "standalone",

  ...(esEstatico
    ? {
        // Los archivos quedan en frontend/sitio-cpanel (y no en out/), carpeta
        // que solo usa deploy/cpanel/empaquetar.mjs.
        distDir: "sitio-cpanel",
        // Cada página queda como carpeta/index.html, que Apache entrega sin reglas extra.
        trailingSlash: true,
        // Sin servidor de Next.js no hay optimización de imágenes.
        images: { unoptimized: true },
      }
    : {
        async headers() {
          return [
            {
              source: "/:path*",
              headers: [
                { key: "Content-Security-Policy", value: politicaContenido },
                { key: "X-Content-Type-Options", value: "nosniff" },
                { key: "X-Frame-Options", value: "DENY" },
                { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                {
                  key: "Permissions-Policy",
                  value: "camera=(), microphone=(), geolocation=()",
                },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;
