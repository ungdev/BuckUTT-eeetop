#! /bin/sh
# Wifi configuration is avaible in /etc/wpa_supplicant/wifi.conf
update-rc.d -f wifi remove
service wifi stop
