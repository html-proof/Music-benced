FROM node:20-alpine

WORKDIR /app

# Install system dependencies (Python is required for yt-dlp)
RUN apk add --no-cache python3 ffmpeg && \
    ln -sf python3 /usr/bin/python

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Environment variables should be passed at runtime
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
