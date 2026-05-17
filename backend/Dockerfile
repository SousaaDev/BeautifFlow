# Builder stage: install full deps and compile TypeScript
FROM node:18-bullseye-slim AS builder
WORKDIR /usr/src/app

# Avoid Puppeteer downloading Chromium during build (we'll provide system Chromium at runtime)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Copy manifests and install all deps (including devDependencies) for building
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Runtime stage: smaller image with system Chromium and production deps only
FROM node:18-bullseye-slim AS runtime

# Install dependencies required by Chromium/Puppeteer at runtime
RUN apt-get update && apt-get install -y \
  ca-certificates wget fonts-liberation libappindicator3-1 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 \
  libexpat1 libfontconfig1 libgbm1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 \
  libnspr4 libnss3 libpango-1.0-0 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 \
  libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 libasound2 --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

# Install Chromium from distro packages
RUN apt-get update && apt-get install -y chromium --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Configure Puppeteer to use the system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /usr/src/app

# Install production dependencies only
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy build output from builder
COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/index.js"]
