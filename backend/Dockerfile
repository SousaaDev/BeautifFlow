FROM node:18-bullseye-slim

# Install dependencies required by Chromium/Puppeteer
RUN apt-get update && apt-get install -y \
  ca-certificates wget gnupg fonts-liberation libappindicator3-1 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 \
  libexpat1 libfontconfig1 libgbm1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 \
  libnspr4 libnss3 libpango-1.0-0 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 \
  libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 libasound2 --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

# Install Chromium from the distro packages
RUN apt-get update && apt-get install -y chromium --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer not to download Chromium (we provide system Chromium)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /usr/src/app

# Copy package manifests first to leverage Docker cache
COPY package.json package-lock.json* ./

# Install deps (production). Postinstall in package.json will be skipped for Chromium download.
RUN npm ci --only=production

# Copy source and build
COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]
