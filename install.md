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
* git : Syncronisation avec le repo de config

```bash
aptitude update
aptitude install xorg matchbox-window-manager chromium-browser ntp openvpn dhcpcd numlockx wpasupplicant plymouth plymouth-themes-spinner ifplugd git --without-recommends
```


# Recuperation de la configuration

Executer
```bash
git clone [TODO] repo
```

# Configuration de l'espace utilisateur
Le dossier utilisateur est effacé à chaque boot (même à chaques fois que chrome est démarré). Pour cela une version du dossier utilisateur en readonly est placé en `/opt/buckutt`. Donc si une config utilisateur doit être modifié, modifiez dans /opt/buckutt. La copie du dossier utilisateur se passe dans `/opt/buckkutt/.xinitrc`.

Executer
```bash
mkdir /opt/buckutt
cp repo/config/.xinitrc /opt/buckutt/.xinitrc
cp repo/config/.profile /opt/buckutt/.profile
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
Buckutt n'est accessible que depuis l'interieur du vpn. Les bornes ayant des problèmes de pile RTC, il faut faire un ntp avant pour syncroniser l'heure.

Supprimer toute conf par défaut du vpn en executant et installer la conf vpn
```bash
rm /etc/openvpn/*
cp repo/config/vpn-buckutt.conf /etc/openvpn/buckutt.conf

```

Ajouter les certificats `ca.crt`, `ta.key`, `buckutt.crt`, `buckutt.key` dans `/etc/openvpn/`. Si vous avez à décompresser un `tar.gz`
```
tar -zxvmf file.tar.gz # l'option -m permet d'ignorer le fait que l'eeetop n'est sans doute pas à l'heure
```

Set les droits
```bash
chown root:root /etc/openvpn/*
chmod a=,u=r  /etc/openvpn/*
```

Créer le fichier `/etc/init.d/buckutt` en executant
```bash
cp repo/config/buckutt /etc/init.d/buckutt
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

créer `/etc/wpa_supplicant/wifi.conf` en executant

```bash
cp repo/config/wifi.conf /etc/wpa_supplicant/wifi.conf
nano /etc/wpa_supplicant/wifi.conf # Remplacer le mot de passe au bon endroit
```

Executer
```bash
chown root:root /etc/wpa_supplicant/wifi.conf
chmod a=,u=r /etc/wpa_supplicant/wifi.conf
```

Créer le fichier `/etc/init.d/wifi` en executant
```
cp repo/config/wifi /etc/init.d/wifi
chmod +x /etc/init.d/wifi
```

# Creation des scripts

```
cp repo/scripts/* /root/
chmod +x /root/*.sh
```

# Supression du repo
Après l'install, le repo n'est plus utile
```
rm -r repo
aptitude remove git
```

# Desinstallation du ssh
Si vous avez installez le ssh, executez
```
aptitude remove openssh-server
```
