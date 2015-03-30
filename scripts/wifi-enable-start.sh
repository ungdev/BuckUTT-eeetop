#! /bin/sh
# Wifi configuration is avaible in /etc/wpa_supplicant/wifi.conf
update-rc.d wifi defaults 99
service wifi restart
