FROM node:18-alpine

WORKDIR /app

# 安装根目录运行依赖
COPY package*.json ./
RUN npm install --production

# 复制已构建的静态资源与服务端文件
COPY server.js server_storage.js index.html ./
COPY dist/ ./dist/
COPY assets/ ./assets/

# 数据存储目录（持久化数据挂载点）
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 8080

ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "server.js"]