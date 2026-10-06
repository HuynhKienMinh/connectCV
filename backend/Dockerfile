FROM node:20-alpine
WORKDIR /app

# Cài đặt Chromium và bộ font Unicode đầy đủ (Noto, DejaVu, Emoji) phục vụ xuất PDF Vector A4 chuẩn ATS
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto \
    font-noto-extra \
    font-noto-emoji \
    font-dejavu

ENV CHROMIUM_PATH=/usr/bin/chromium-browser
# Thư mục mẫu CV được bundle vào image (hỗ trợ deploy Koyeb/cloud không cần volume mount)
ENV TEMPLATES_DIR=/app/mau_CV

COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 5000
CMD ["node", "server.js"]
