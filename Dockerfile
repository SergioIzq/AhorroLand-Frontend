# ============================================
# ETAPA 1: BUILDER - Compilar la aplicación Angular
# ============================================
FROM node:22-alpine AS builder

# Establecer el directorio de trabajo
WORKDIR /app

# OPTIMIZACIÓN 1: Copiar archivos de configuración
# Nota: He eliminado 'extra-webpack.config.js' ya que Angular 20+ usa esbuild
COPY package*.json angular.json tsconfig*.json ./
COPY generate-sitemap.js ./

# OPTIMIZACIÓN 2: Instalar dependencias
RUN npm ci --legacy-peer-deps --prefer-offline --no-audit --no-fund

# OPTIMIZACIÓN 3: Copiar código fuente
COPY src ./src
COPY public ./public
# Nota: Si tienes carpeta 'public' (nueva en Angular 18+) descomenta la línea de arriba, 
# si sigues usando 'assets' dentro de 'src', la línea de 'src' es suficiente.

# OPTIMIZACIÓN 4: Build actualizado para Angular 20+ (Application Builder)
# Se han eliminado flags obsoletos de Webpack (--vendor-chunk, --common-chunk, --build-optimizer).
# esbuild realiza estas optimizaciones automáticamente.
RUN npm run build -- \
    --output-path=./dist/out \
    --configuration=production \
    --source-map=false

# ============================================
# ETAPA 2: PRODUCTION - Servir con Nginx Alpine
# ============================================
FROM nginx:alpine AS final

# Metadatos
LABEL maintainer="sergioizqdev"
LABEL description="AhorroLand Frontend - Angular Application"

# OPTIMIZACIÓN CRÍTICA PARA ANGULAR 17+:
# El nuevo 'application builder' suele crear una subcarpeta 'browser' dentro del output.
# Si al desplegar te da error 404/403, verifica si tu carpeta dist tiene la estructura dist/out/browser/
# Si usas el builder clásico, quita el '/browser' del final de la ruta de origen.
COPY --from=builder /app/dist/out/browser /usr/share/nginx/html

# Si tu Angular NO genera la carpeta 'browser' (builder antiguo), usa esta línea en su lugar:
# COPY --from=builder /app/dist/out /usr/share/nginx/html

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Crear usuario no-root para nginx (Seguridad)
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chmod -R 755 /usr/share/nginx/html

# Cambiar permisos del directorio temporal de nginx
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Cambiar al usuario no-root
USER nginx

# Exponer puerto 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Comando para iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]