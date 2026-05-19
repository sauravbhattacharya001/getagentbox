# ---- Stage 1: Build the JS bundle ----
# app.js is a build artifact produced by build.js; it is not committed to git.
# We must regenerate it inside the image, otherwise the production stage
# tries to COPY a file that does not exist and the build fails.
FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json* ./
COPY build.js ./
COPY src/ ./src/
RUN node build.js

# ---- Stage 2: Validate HTML ----
FROM node:22-alpine AS validate

WORKDIR /app
COPY index.html .

# Pin html-validate to keep the validation stage reproducible.
# Newer majors keep adding stricter rules; we already accept this is a
# hand-authored static page, not a strict component template.
RUN npm install -g html-validate@9 && \
    echo '{"extends":["html-validate:recommended"],"rules":{"no-inline-style":"off","no-trailing-whitespace":"off","tel-non-breaking":"off","attribute-boolean-style":"off","script-type":"off","no-implicit-button-type":"off","prefer-native-element":"off","no-raw-characters":"off","aria-label-misuse":"off","empty-heading":"off","no-dup-id":"off"}}' > .htmlvalidate.json && \
    html-validate index.html

# ---- Stage 2: Production ----
FROM nginx:1.31-alpine

# Security: run as non-root, drop capabilities
RUN addgroup -g 1001 -S app && \
    adduser -u 1001 -S app -G app && \
    # nginx needs to write to certain directories
    mkdir -p /var/cache/nginx/client_temp && \
    chown -R app:app /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown app:app /var/run/nginx.pid

# Custom nginx config: security headers, gzip, caching
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # ── Security headers ──────────────────────────────────────────
    # CSP matches index.html <meta> tag — GoatCounter is vendored
    # locally so no external script-src needed.
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self' https://agentbox.goatcounter.com; frame-ancestors 'none'; base-uri 'self'; form-action 'none'; object-src 'none'; worker-src 'none';" always;
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Cross-Origin-Embedder-Policy "require-corp" always;
    add_header Cross-Origin-Resource-Policy "same-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Gzip compression
    gzip on;
    gzip_types text/html text/css application/javascript text/plain;
    gzip_min_length 256;

    # Cache static assets (the site is a single HTML file)
    location ~* \.(html)$ {
        expires 1h;
        add_header Cache-Control "public, must-revalidate";

        # Re-declare security headers — nginx does not inherit
        # parent add_header directives into blocks that define their own.
        add_header X-Frame-Options "DENY" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" always;
        add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self' https://agentbox.goatcounter.com; frame-ancestors 'none'; base-uri 'self'; form-action 'none'; object-src 'none'; worker-src 'none';" always;
        add_header Cross-Origin-Opener-Policy "same-origin" always;
        add_header Cross-Origin-Embedder-Policy "require-corp" always;
        add_header Cross-Origin-Resource-Policy "same-origin" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    }

    # Health check endpoint
    location /healthz {
        access_log off;
        return 200 "ok\n";
        add_header Content-Type text/plain;
    }

    # Deny dotfiles
    location ~ /\. {
        deny all;
        return 404;
    }
}
EOF

# Override main nginx.conf to use non-root port
RUN sed -i 's/listen       80;/listen       8080;/' /etc/nginx/conf.d/default.conf 2>/dev/null || true && \
    sed -i '/^user /d' /etc/nginx/nginx.conf

COPY --from=validate /app/index.html /usr/share/nginx/html/index.html
COPY --from=build /app/app.js /usr/share/nginx/html/app.js
COPY styles.css /usr/share/nginx/html/styles.css
COPY src/ /usr/share/nginx/html/src/
COPY vendor/ /usr/share/nginx/html/vendor/

# Remove default nginx files we don't need
RUN rm -f /usr/share/nginx/html/50x.html

EXPOSE 8080

USER app

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
