# Use a lightweight Nginx image to serve the web application
FROM nginx:alpine

# Remove default Nginx welcome page assets
RUN rm -rf /usr/share/nginx/html/*

# Copy web directory contents into Nginx's HTML directory
COPY . /usr/share/nginx/html/

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 for web traffic
EXPOSE 80

# Run Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
