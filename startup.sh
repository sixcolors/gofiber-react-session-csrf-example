#!/usr/bin/bash
/usr/share/nginx/html/api&
# cd /app/react-app 
# npm start&
nginx -g "daemon off;" -c "/etc/nginx/nginx.conf"
