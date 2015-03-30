xrandr --newmode "1366x768" 85.25 1368 1440 1576 1784 768 771 781 798 
-hsync +vsync
xrandr --addmode VGA1 1366x768
xrandr --output VGA1 --mode 1366x768

numlockx &
xset s off
xset -dpms
matchbox-window-manager -use_titlebar no &
xmodmap -e "pointer = 1 2 99"
xmodmap -e "keycode 135 = 0x0000" # Disable menu key
while true; do
	chromium-browser \
		--no-first-run \
		--disable-translate \
		--disable-infobars \
		--disable-suggestion-service \
		--disable-save-password-bubble \
		--kiosk http://10.10.10.1:8081
done
