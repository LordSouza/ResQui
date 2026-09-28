# Stage 1: build Vite
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY blog/package*.json ./blog/
RUN npm ci --prefix blog
COPY . .
RUN npm run build && npm run build --prefix blog

# Stage 2: serve with nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /app/blog/dist /usr/share/nginx/html/blog
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
