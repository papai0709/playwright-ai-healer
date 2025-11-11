FROM mcr.microsoft.com/playwright:v1.48.0-jammy

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create directories
RUN mkdir -p data logs screenshots test-results

# Set environment variables
ENV NODE_ENV=production
ENV HEADLESS=true

# Run tests
CMD ["npm", "test"]
