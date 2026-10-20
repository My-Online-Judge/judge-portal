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

COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

# Non-root (sp12): the image's own nginx user (uid 101); nginx.conf keeps its pid file and temp paths under /tmp.
USER 101

CMD ["nginx", "-g", "daemon off;"]
