FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="Playkora" \
      org.opencontainers.image.description="Hub arcade con Prisma Asalto, Serpiente de Poderes, Cazaluces, Mosaico Lunar y Bastión Lumen, servido con Nginx." \
      org.opencontainers.image.licenses="MIT"

RUN rm -rf /usr/share/nginx/html/*

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html serpiente-poderes.html privacidad.html cookies.html aviso-legal.html sobre-nosotros.html contacto.html recomendaciones.html novedades.html favicon.svg /usr/share/nginx/html/
COPY ads.txt robots.txt sitemap.xml /usr/share/nginx/html/
COPY css /usr/share/nginx/html/css
COPY js /usr/share/nginx/html/js
COPY games /usr/share/nginx/html/games

RUN nginx -t

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
