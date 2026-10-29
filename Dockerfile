# Build stage
FROM node:22-alpine AS build-stage

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# The manifest exists for scripts/check-initial-js.mjs (CI's size check) only; nginx must not serve /.vite/manifest.json.
RUN npm run build-only && rm -rf dist/.vite

# Production stage
FROM nginx:stable-alpine AS production-stage

# The base image can lag Alpine's fixes: CI's Trivy gate fails on a CRITICAL that has one (brotli-libs 1.2.0-r1, CVE-2026-111497, fixed in
# 1.2.1-r0). Upgrading the one package keeps the gate honest without pinning; a no-op once the base image has it.
RUN apk upgrade --no-cache brotli-libs

COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

# Non-root (sp12): the image's own nginx user (uid 101); nginx.conf keeps its pid file and temp paths under /tmp.
USER 101

CMD ["nginx", "-g", "daemon off;"]
