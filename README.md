Tutoriel d'installation des bornes buckutt
==========================================

Les bornes BuckUTT ont une architecture assez proche entre elles, mais manifestement pas suffisament car une image système pré-conçue a tendance à avoir des incompatibiltés en fonction la machine.
De plus l'image système est plus difficile à mettre à jour. Un script d'installation est aussi difficile à maintenir car en cas d'erreur, le script srarrète et il est difficile de reprendre au milieu.

C'est ce qui justifie ce document. Il devra être mis à jour en cas de modification du système afin de pouvoir réinstaller des bornes à partir de zéro en moins de 2h.

Dernière mise à jour : juin 2016 (ne prends plus la gestion des Pertelian en compte)

# Installation de l'OS
On utilise une Debian 8 stable i386 en netinstall (non graphique). L'ethernet doit être connecté. Pendant le menu, il y aura plusieurs choix, voici ce qu'il faudra répondre.

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
 * Nom de machine : eeetop\[N\] (Remplacer \[N\] par le numéro de l'eeetop marqué dessus au marker)
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

Pour faciliter la configuration, on peut installer ssh (et install multiple via ClusterSSH), mais il faudra le désinstaller à la fin du processus.

```bash
aptitude install openssh-server

```
# Installation des paquets
Paquets installés

* xorg : Manager d'affichage,
* matchbox-window-manager : Gestionnaire de fenêtre spécial pour kiosk,
* chromium : Navigateur utilisé pour afficher buckutt,
* ntp : Syncronisation du temps,
* openvpn : Connexion au réseau privé virtuel,
* dhcpcd : Recupération d'IP,
* numlockx : Activation du numlock au démarrage pour les badgeuses,
* wpasupplicant : Gestion du wifi,
* plymouth : Splashscreen,
* plymouth-themes-spinner : Theme de splashscreen,
* ifplugd : Configuration auto de la connexion ethernet à chaque fois que le cable est branché,
* git : Syncronisation avec le repo de config.
* lcdproc : Interface avec les écrans pertelian
* libpcsclite1, libpcsclite-dev, pcscd, ccid : Gestion des badgeuses NFC
* nodejs : NodeJS pour le serveur local

```bash
aptitude update
aptitude install xorg matchbox-window-manager chromium ntp openvpn dhcpcd numlockx wpasupplicant plymouth plymouth-themes-spinner ifplugd git lcdproc python3 libpcsclite1 libpcsclite-dev pcscd make curl build-essential --without-recommends
curl -sL https://deb.nodesource.com/setup_6.x |bash -
aptitude install nodejs
```

# Recuperation de la configuration

Exécuter :

```bash
git clone https://github.com/buckutt/BuckUTT-eeetop repo
```

# Configuration de l'espace utilisateur
Le dossier utilisateur est effacé à chaque boot (et même à chaque fois que chrome est démarré). À ces fins, une version du dossier utilisateur en readonly est placé en `/opt/buckutt`. **Si une config utilisateur doit être modifiée, il faut la changer dans /opt/buckutt**. La copie du dossier utilisateur se passe dans `/opt/buckkutt/.xinitrc`.

Exécuter :
```bash
mkdir /opt/buckutt
cp repo/config/.xinitrc /opt/buckutt/.xinitrc
chown -R root:root /opt/buckutt/
chmod -R a=r /opt/buckutt/
chmod a+x /opt/buckutt/.xinitrc
```

## Copie des services (espace utilisateur, serveur local et Autologin+startx) et initialisation
Exécuter :
```bash
cp repo/config/systemd/* /etc/systemd/system/
systemctl enable buckutt.service
systemctl enable bucknfc.service
systemctl enable startx@buckutt.service
```

## Autoriser l'utilisateur buckutt à lancer le serveur X
Editer `/etc/X11/Xwrapper.config` et remplacer :
```bash
allowed_users=console
```
Par :
```bash
allowed_users=anybody
```

## Grub et Splashscreen
Le menu grub ne doit pas être affiché et un splashcreen est affiché au démarrage :

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

Exécuter ensuite les commandes suivantes :
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

Activer le service OpenVPN en executant:
```bash
systemctl enable openvpn@buckutt.service
```

Activer le service PCSCd en executant:
```bash
systemctl enable pcscd.service
```

# Configuration de ntp
Modifier `/etc/ntp.conf` et ajouter au dessus du bloc de la liste des serveurs
```bash
server buck.utt.fr
server pluton.utt.fr
```

# Configuration wifi (déprécié)
installer les firmware en modifiant `/etc/apt/sources.list` et ajouter `non-free` après chaque `main`

Puis exécutez :

```bash
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

Créer le fichier `/etc/init.d/wifi` en exécutant
```bash
cp repo/config/wifi /etc/init.d/wifi
chmod +x /etc/init.d/wifi
```

# Configuration des Pertelian

```bash
cp ./repo/config/LCDd.conf /etc/LCDd.conf
```

# Création des scripts

```bash
cp repo/scripts/* /root/
chmod +x /root/*.sh
```

# Installation des dépendances pour le script local

```bash
cd /root/local
npm install
cd /root
```

# Supression du dépôt
Après l'installation, le dossier « repo » n'est plus utile.

```bash
rm -r repo
aptitude remove git
```

# Désinstallation du ssh
Si vous avez installé le ssh, exécutez

```bash
aptitude remove openssh-server
```
