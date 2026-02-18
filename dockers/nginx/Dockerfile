FROM nginx:1.25-alpine

# Install apache2-utils for htpasswd command
RUN apk add --no-cache apache2-utils

# Remove default nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy nginx configuration files
COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf

# Create directory for SSL certificates (optional)
RUN mkdir -p /etc/nginx/ssl

# Create .htpasswd file will be mounted or created at runtime
# You can also build it into the image (less secure)
# RUN htpasswd -cb /etc/nginx/.htpasswd admin yourpassword

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/api/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
