FROM node:18-alpine as frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM node:18-alpine
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist ../frontend/dist

# Install Docker CLI to allow backup script execution
RUN apk add --no-cache docker-cli

# Create data directory for SQLite
RUN mkdir -p /data

EXPOSE 3000
CMD ["node", "server.js"]
