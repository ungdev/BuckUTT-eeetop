Tutoriel d'installation des bornes buckutt
==========================================
Les bornes buckutt ont une architecture assez proche entre-elles, mais manifestement pas suffisament car une image system a tendance à avoir des incompatibiltés  selon la machine. De plus l'image système est plus difficile à mettre à jour. Un script d'installation est aussi difficile à maintenir car en cas d'erreur, le script srarrète et il est difficile de reprendre au milieu.

C'est donc pour cela que le format de tutoriel d'installation a été choisis. Il devra être mis à jour en cas de modification du système pur que si une borne crash, elle soit réinstallable en moins de 2 heures.

Dernière mise à jour : mars 2015

# Installation de l'OS
On utilise une Debian stable i386 en netinstall (non graphique). L'ethernet doit être connecté. Pendant le menu, il y aura plusieurs choix, voici ce qu'il faudra répondre.

* Choix de la langue : 
 * French
* Choix de votre situation géographique : 
 * France
* Configurer le clavier : 
 * Français
* Détecter le materiel réseau (N'arrive pas toujours)
 * Charger le microcode manquant depuis un support amovible : Non
* Configurer le réseau : 
 * Interface réseeau principale : eth0
 * Nom de machine : eeetop[N] (Remplacer [N] par le numéro de l'eeetop marqué dessus au marker)
 * Domaine : [Valeur par défaut]
* Créer les utilisateurs
 * [Mdp root]
 * [Mdp root]
 * Buckutt
 * buckutt
 * [Même mdp root]
 * [Même mdp root]
* Partitionner les disques
 * Assisté - utiliser un disque entier
 * 160.0 GB ATA ST...
 * Tout dans une seule partition
 * Terminer le partitionnement et appliquer les changements
 * Oui (appliquer les changements)
* Configurer l'outil de gestion des paquets
 * France
 * debian.univ-reims.fr
 * [défaut]
* Configuration de popularity-contest
 * Non
* Selection des logiciels
 * Décocher tout (avec espace) puis appuyer sur entrer
* Installer le programme de démarrage GRUB sur un disque dur
 * Oui
* Terminer l'installation
 * Continuer

# SSH ?
Pour la config, on peut installer ssh (et install multiple via ClusterSSH), mais il fadura le désinstaller à la fin l'installation.

```bash
aptitude install openssh-server

```
# Installation des paquets
Paquets installés 

* xorg : Manager d'affichage
* matchbox-window-manager : Gestionnaire de fenêtre spécial pour kiosk
* chromium-brower : Navigateur utilisé pour afficher buckutt
* ntp : Syncronisation du temps
* openvpn : Connexion au réseau privé virtuel
* dhcpcd : Recupération d'IP
* numlockx : Activation du numlock au démarrage pour les badgeuses
* wpasupplicant : Gestion du wifi
* plymouth : Splashscreen
* plymouth-themes-spinner : Theme de splashscreen
* ifplugd : Configuration auto de la connexion ethernet à chaque fois que le cable est branché

```bash
aptitude update
aptitude install xorg matchbox-window-manager chromium-browser ntp openvpn dhcpcd numlockx wpasupplicant plymouth plymouth-themes-spinner ifplugd --without-recommends
```

# Configuration de l'espace utilisateur
Le dossier utilisateur est effacé à chaque boot (même à chaques fois que chrome est démarré). Pour cela une version du dossier utilisateur en readonly est placé en `/opt/buckutt`. Donc si une config utilisateur doit être modifié, modifiez dans /opt/buckutt. La copie du dossier utilisateur se passe dans `/opt/buckkutt/.xinitrc`.

```bash
mkdir /opt/buckutt
```
Créer le fichier `/opt/buckutt/.xinitrc` et le remplir par

```bash
xrandr --newmode "1366x768" 85.25 1368 1440 1576 1784 768 771 781 798 -hsync +vsync
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
```
Créer le fichier `/opt/buckutt/.profile` et le remplir par
```bash
startx
```
Créer ensuite les derniers fichiers et régler les droits
```bash
touch /opt/buckutt/.Xauthority
chown -R root:root /opt/buckutt/
chmod -R a=r /opt/buckutt/
chmod a+x /opt/buckutt/.xinitrc
chmod a+x /opt/buckutt/.profile
chmod u+w /opt/buckutt/.Xauthority
```
## Configuration de l'autologin
Au démarrage sur `tty1`, buckutt s'autologin et lorsque buckutt se login il lance startx

Modifier `/etc/inittab` et commenter cette ligne dedans :
```bash
1:2345:respawn:/sbin/getty 38400 tty1
```
Et ajouter après la ligne commentée
```
1:2345:respawn:/bin/login -f buckutt tty1 </dev/tty1 >/dev/tty1 2>&1
```
Remplacer dans `/etc/X11/xinit/xserverrc` la ligne suivante
```
exec /usr/bin/X -nolisten tcp "$@"
```
par
```
exec /usr/bin/X -nolisten tcp "$@" vt1
```
## Grub et Splashscreen
Le menu grub ne doit pas être affiché et un splashcreen est affiché au démarrage

Ajouter à la fin ```/etc/initramfs-tools/modules```
```bash
# KMS
intel_agp
drm
i915 modeset=1
```

Modifier les variables suivantes dans `/etc/default/grub` et les décommenter
```bash
GRUB_TIMEOUT=0
GRUB_GFXMODE=1024x768
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash"
```

Executer ensuite les commandes suivantes
```bash
plymouth-set-default-theme spinner
update-grub2
update-initramfs -u
```

# Configuration du vpn
Buckutt n'est accessible que depuis l'interieur du vpn. Les bornes ayant des problème de pile RTC, il faut faire un ntp avant pour syncroniser l'heure.

Supprimer toute conf par défaut du vpn en executant
```bash
rm /etc/openvpn/*
```

Créer le ficher `/etc/openvpn/buckutt.conf`
```bash
client
dev tun
proto tcp
remote buck.utt.fr 16050
resolv-retry infinite
nobind
group nogroup
persist-key
persist-tun
ca /etc/openvpn/ca.crt
cert /etc/openvpn/buckutt.crt
key /etc/openvpn/buckutt.key
ns-cert-type server
tls-auth /etc/openvpn/ta.key 1
comp-lzo
verb 3
cipher DES-EDE3-CBC  # Triple-DES
```

Ajouter les certificats `ca.crt`, `ta.key`, `buckutt.crt`, `buckutt.key` dans `/etc/openvpn/`. Si vous avez à décompresser un `tar.gz`
```
tar -zxvmf file.tar.gz # l'option -m permet d'ignorer le fait que l'eeetop n'est sans doute pas à l'heure
```


Set les droits
```bash
chown root:root /etc/openvpn/*
chmod a=,u=r  /etc/openvpn/*
``

Créer le fichier `/etc/init.d/buckutt`
```bash
#! /bin/sh
### BEGIN INIT INFO
# Provides:          buckutt
# Required-Start:    $remote_fs $syslog
# Required-Stop:     $remote_fs $syslog
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: Init ntp and vpn and session cleaning
### END INIT INFO

case "$1" in
  start)
  	/bin/rm -rf /home/buckutt
  	/bin/cp -Rf /opt/buckutt /home/
  	/bin/chown -R buckutt:buckutt /home/buckutt
  	/bin/chmod u+wx /home/buckutt
	/usr/sbin/ntpd -ngq &
	/usr/sbin/ntpd -g
	/usr/sbin/openvpn --cd /etc/openvpn/ --config /etc/openvpn/buckutt.conf --daemon openvpn@client
	;;
  stop)
	/bin/kill `pgrep openvpn`
	/bin/kill `pgrep ntpd`
	;;
  status)
	status_of_proc "$DAEMON" "$NAME" && exit 0 || exit $?
	;;
  restart|force-reload)
	/usr/sbin/service buckutt stop
	/usr/sbin/service buckutt start
	;;
  *)
	echo "Usage: buckutt {start|stop|status|restart|force-reload}" >&2
	exit 3
	;;
esac

:
```

Executer ensuite
```
chmod +x /etc/init.d/buckutt
update-rc.d buckutt defaults 99
update-rc.d -f openvpn remove
update-rc.d -f ntp remove
```

# Configuration de ntp
Modifier `/etc/ntp.conf` et ajouter au dessus du bloc de la liste des serveurs
```bash
server buck.utt.fr
server pluton.utt.fr
```

# Configuration wifi
installer les firmware en modifiant `/etc/apt/sources.list` et ajouter `non-free` après chaque `main`

Puis executez
```
aptitude update 
aptitude install firmware-ralink
```

créer `/etc/wpa_supplicant/wifi.conf`

```bash
ctrl_interface=/var/run/wpa_supplicant
ap_scan=1

#UTT network
network={
        priority=100
        ssid="UTTetudiants"
        proto=RSN
        group=TKIP
        key_mgmt=WPA-EAP
        pairwise=CCMP
        eap=PEAP
        identity="buckutt"
        password="[MDP wifi]"
}
```

Executer
```bash
chown root:root /etc/wpa_supplicant/wifi.conf
chmod a=,u=r /etc/wpa_supplicant/wifi.conf
```

Créer le fichier `/etc/init.d/wifi`
```
#! /bin/sh
### BEGIN INIT INFO
# Provides:          wifi
# Required-Start:    $remote_fs $syslog
# Required-Stop:     $remote_fs $syslog
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: Init wifi
### END INIT INFO

INTERFACE=wlan0

case "$1" in
  start)
	/sbin/wpa_cli terminate -P /var/run/wpa_supplicant-${INTERFACE}.pid
	/sbin/ip addr flush dev ${INTERFACE}
	/sbin/wpa_supplicant -B -i ${INTERFACE} -D nl80211 -P /var/run/wpa_supplicant-${INTERFACE}.pid -c /etc/wpa_supplicant/wifi.conf
	/sbin/dhcpcd wlan0 &
	;;
  stop)
	/sbin/wpa_cli terminate -P /var/run/wpa_supplicant-${INTERFACE}.pid
	;;
  restart|force-reload)
	/usr/sbin/service wifi stop
	/usr/sbin/service wifi start
	;;
  *)
	echo "Usage: wifi {start|stop|status|restart|force-reload}" >&2
	exit 3
	;;
esac

```

Rendre le service executable
```
chmod +x /etc/init.d/wifi
```

# Creation des scripts
Creez le fichier /root/wifi-enable-start.sh
```
#! /bin/sh
# Wifi configuration is avaible in /etc/wpa_supplicant/wifi.conf
update-rc.d wifi defaults 99
service wifi restart
```

Creez le fichier /root/wifi-disable-stop.sh
```
#! /bin/sh
# Wifi configuration is avaible in /etc/wpa_supplicant/wifi.conf
update-rc.d -f wifi remove
service wifi stop
```

Creez le fichier /root/buckutt-restart.sh
```
#! /bin/sh
# Restart ntp and vpn and clean user session
service buckutt restart
```

Autorise l'execution
```
chmod +x /root/wifi-enable-start.sh
chmod +x /root/wifi-disable-stop.sh
chmod +x /root/buckutt-restart.sh
```

# Desinstallation du ssh
Si vous avez installez le ssh, executez
````
apt-get remove openssh-server

# Liste des eeetop par ref
1 - EeeTop PC ET1602C - 1366x768 - 1.6GHz Intel Atom N270 - 1GB - 160GB
2 - EeeTop PC ET1602C - 1366x768 - 1.6GHz Intel Atom N270 - 1GB - 160GB
4 - EeeTop PC ..	  - 1366x768 - 1.6GHz Intel Atom N270 - 1GB - ?
6 - EeeTop PC ET1610PT - 1366x768 - 1.66GHz Intel Atom D410 - 1GB - ?