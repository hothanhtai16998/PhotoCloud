# Build from the repository root: docker build -f backend/Dockerfile .
FROM node:22-alpine AS backend-deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
COPY shared/ /app/shared/
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production PORT=3000
WORKDIR /app/backend
COPY --from=backend-deps /app/backend/node_modules ./node_modules
COPY backend/package.json ./
COPY backend/src/ ./src/
COPY shared/ /app/shared/
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "const r=require('http').get({host:'127.0.0.1',port:process.env.PORT||3000,path:'/api/health'},s=>{s.resume();process.exit(s.statusCode===200?0:1)});r.setTimeout(4000,()=>{r.destroy();process.exit(1)});r.on('error',()=>process.exit(1))"
CMD ["node", "--no-deprecation", "src/server.js"]
