# Stage 1: Build the React Application
FROM node:20-alpine as build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Accept API Key as a build argument
ARG VITE_GOOGLE_MAPS_API_KEY
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

# Build the application
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:alpine

# Copy the build artifacts from the previous stage
COPY --from=build /app/dist /usr/share/nginx/html

# Overwrite the default Nginx configuration with a SPA-friendly one
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 or the PORT environment variable expected by Cloud Run
EXPOSE 8080

# Modify nginx configuration to listen on port 8080 (Cloud Run default)
RUN sed -i 's/listen  *80;/listen 8080;/g' /etc/nginx/conf.d/default.conf

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
