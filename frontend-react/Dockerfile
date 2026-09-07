# Stage 1: Build the React application
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies first (better caching)
COPY frontend-react/package.json frontend-react/package-lock.json* ./
RUN npm install --legacy-peer-deps && \
    npm install --legacy-peer-deps ajv@^8 ajv-keywords@^5

# Copy source and build
COPY frontend-react/ .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Remove default nginx static assets
RUN rm -rf ./*

# Copy built app from build stage
COPY --from=build /app/build .

# Copy nginx configuration
COPY frontend-react/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
ENTRYPOINT ["nginx", "-g", "daemon off;"]
