#!/usr/bin/bash
/usr/share/nginx/html/api&
nginx -g "daemon off;" -c "/etc/nginx/nginx.conf"
