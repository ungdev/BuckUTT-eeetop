#! /bin/sh
# Restart ntp and vpn and clean user session
systemctl restart ntp.service
systemctl restart openvpn@buckutt.service
killall chromium