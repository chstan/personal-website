# Setting up a Multi-user Server

After several frustrating near-misses with hardware failures, I set up a shared remote desktop. Our written experience of this can serve as a catalogue of failures and starting point for others taking this path in 2021.

We are each primarily Windows users with relatively heavy compute needs. These requirements, together with budget, constrained options. Your needs might be different than ours.

Caveat emptor: I am no expert in systems adminstration. If you aren't either, maybe you'll find something useful here, but exercise care and discretion before following any advice here on publicly accessible systems.

## Options for shared compute environments

**Amazon Web Services (AWS), Google Cloud Platform (GCP), Azure:** These are each great services, but they are tuned for a different kind of customer. They are painfully expensive to use for computing baseload, and in this context the flexibility to scale resources is irrelevant.

**Windows Server with RDP licenses on owned hardware:** This was an option, but $800 for a Windows Server license and further costs per user is extreme. Microsoft advertises multi-user RDP outside the Windows Server product stack only on Azure.

**Multi-user Linux with xrdp:** This works, but puts more burden on each user to install Windows on an internal VM and to configure networks.

**Run as guests in a VM or hypervisor:** This is flexible but more technically complicated than other options. Options even exist for straightforwardly spinning up under a managed distro like xcp-ng. Commercial options exist alongside the bare hypervisor and associated projects.

The remainder of the discussion focuses on the final option, using Xen. I am no expert in virtualization, but that's the point: this is a collection of the steps and advice I wished had been collected in one place when I went to set up our system.

## Setting up multiple virtual Windows workstations with Xen

In order to set up our systems, we will need to:

1. Install an operating system to serve as a Xen host domain (Dom0)
2. Setup volumes for the guest machines
3. Install Xen
4. Setup networking for the guests with a bridge on the host domain
5. Make Xen configuration files, install Windows, and install PV drivers
6. Configure host networking with reasonable security so that the virtual machines can be accessed external to LAN

This is meant to be a parametric recipe rather than an exact one: if you are more familiar with a particular distribution of Linux (or have one installed already) you can use that. Be aware that more or less salt may be needed as you modify ingredients.

This is also a straightforward recipe (more mac and cheese than cheese souffle) which aims to provide a path around stumbling blocks to a high performance, secure, and working setup. It goes into more detail than the [https://wiki.xenproject.org/wiki/Xen_Project_Beginners_Guide](https://wiki.xenproject.org/wiki/Xen_Project_Beginners_Guide) particularly as it pertains to a realistic setup with a network you might find in a home.

Configuration files and settings for Xen, Dom0, and your local area network can be found here ([https://github.com/chstan/private-cloud](https://github.com/chstan/private-cloud)). Files in this repo will be referenced throughout.

## Installing a Host Domain

I used Ubuntu 20.04 LTS because I have most experience with Debian-based systems. You can use whatever system you are most familiar with as the host domain, substituting your package manager for `apt-get` as appropriate. To be safe, check the Dom0 compatibility page [https://wiki.xenproject.org/wiki/Dom0_Kernels_for_Xen](https://wiki.xenproject.org/wiki/Dom0_Kernels_for_Xen).

Because the host domain is not going to be your daily driver, you should use a version where you will receive a longer tail of security support for convenience.

Follow the installation procedures on the getting started pages of your choice of host operating system ([https://ubuntu.com/tutorials/install-ubuntu-desktop#1-overview](https://ubuntu.com/tutorials/install-ubuntu-desktop#1-overview)). 

If you are prompted to use Logical Volume Manager (LVM), you should use it. In my case, I had to install without a keyboard because wired keyboards are increasingly uncommon, and it was necessary to reduce the logical volume using the installation media for the host partition later. A good resource on resizing, should it be necessary, can be found here ([https://askubuntu.com/questions/196125/how-can-i-resize-an-lvm-partition-i-e-physical-volume/196134#196134](https://askubuntu.com/questions/196125/how-can-i-resize-an-lvm-partition-i-e-physical-volume/196134#196134)). 

## Setting up Volumes for the Host Machine

Here we will need to setup one logical volume for each of the guest operating systems (guest domains/DomUs). You can consult the man pages if you want to customize, but an invocation like this should do:

```bash
$ schematic> sudo lvcreate -L {size} -n {volume_name} {volume_group}
$    I used> sudo lvcreate -L 400G -n conrad-windows vgubuntu
```

You can find the name and sizes of your volume groups with `sudo vgs`.

Repeat this process for each volume you would like to setup, with appropriate sizes. In order to ensure right sizing on the final volume, you can replace the explicit size `-L {size}` with `-L 100%FREE`. The name you provide on these volumes will be used in the Xen domain configuration files later.

## Install Xen

```bash
$> sudo apt-get install xen-system-amd64
```

Now, reboot your system.

```bash
$> sudo reboot
```

During powerup, you should notice that the Grub boot options have been changed. You will be prompted to boot either into `Host OS` or into `Host OS + Xen Hypervisor`. From now on, choose the option with Xen. 

We will interact with Xen through `xl`. First, we will want to get the boot time information after our first reboot

```bash
$> sudo xl dmesg > ~/first_xen_boot.txt
```

It can be useful to see how things were configured when you first install, which is why I'm suggesting making a copy into a text file. Now check that virtualization is enabled

```bash
$> cat ~/first_xen_boot.txt | grep -Ei "svm|vmx"
```

On an Intel platform, you should see `HVM: VMX Enabled`. If you do not see evidence that virtualization is enabled, reboot into BIOS (typically, Delete after the power-on self test) and enable virtualization. On Intel products, this will be listed as a `VT-d` setting.

## Setup networking for guests with a bridge on Dom0

The easiest way to do this is with Netplan.

```bash
$> sudo apt-get install bridge-utils
$> cd /etc/netplan/
$> sudo cp 01-network-manager-all.yaml 01-network-manager.yaml.bak
$> sudo cp 01-network-manager-all.yaml work.yml
```

You first need to figure out which interface is used by your system to connect to the internet. You can get this with `ip ad`

```
$> ip ad
1: lo: <LOOPBACK,UP,LOWER_UP>
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: enp4s0: <BROADCAST,MULTICAST,UP,LOWER_UP>
    link/ether 18:c0:4d:02:ef:e8 brd ff:ff:ff:ff:ff:ff

<... truncated ...>
```

I've simplified the output above. You are looking for an interface which is `<...,UP,...>` and which starts with `en`. If you are connected over Wi-Fi, this is complicated ([https://unix.stackexchange.com/questions/363332/how-do-i-configure-a-network-interface-bridge-from-wifi-to-ethernet-with-debian](https://unix.stackexchange.com/questions/363332/how-do-i-configure-a-network-interface-bridge-from-wifi-to-ethernet-with-debian)). In my case, you can see that I am looking for the interface `enp4s0`.

Now we will modify the Netplan configuration at `/etc/netplan/work.yaml`. It should look like this when you are done

```yaml
network:
  version: 2
  renderer: NetworkManager
  ethernets:
    enp4s0:
      dhcp4: no
  bridges:
    xenbr0:
      dhcp4: yes
      interfaces:
        - enp4s0
```

You should replace `enp4s0` above with the appropriate interface from your invocation of `ip ad`. 

Now we need to apply the network configuration and restart networking. Remember that modifying your network configuration can get you into trouble if you don't have physical access to the box or a second unmodified connection. You should use `netplan try` to verify the new settings if this is the case. You should have output from `sudo brctl show` characterizing the presence of the new bridge

```bash
$> sudo netplan try -c work.yml
$> sudo brctl show
...
$> # verify network still working...
```

If you are happy

```bash
$> sudo mv work.yml 01-network-manager-all.yml
$> sudo netplan apply
```

## Installing a Windows HVM

To be sanitary, we'll scope config info for each domain to its own folder.

```bash
$> cd ~

# you can customize the domain name (conrad-windows) as wanted
$> mkdir -p vms/conrad-windows

# we will need two configurations, one for install time and one
# which is run typically
$> touch install.cfg
$> touch run.cfg
```

Download an `.iso` of Windows from Microsoft at `https://microsoft.com/en-us/software-download/windows10ISO`. In order to access your computer over RDP (highly recommended) instead of VNC, you will need to license Windows 10 Pro or an enterprise grade product. This page redirects to an upgrade tool if accessed from a Windows computer, but there are other options to get install media as well.

```bash
$> mv ~/Downloads/path_to_win_10.iso ~/vms/win_10_x64.iso
```

Now let's write an appropriate config file. Edit `install.cfg` to contain (initially)

```ini
type= "hvm"
memory = "30720"
vcpus = 15
name = "conrad-windows-10"
vif = ['bridge=xenbr0']
disk = ['phy:/dev/vgubuntu/conrad-windows,hda,w','file:/home/current_user/vms/win10_x64.iso,hdc:cdrom,r']
acpi = 1
device_model_version = 'qemu-xen'
boot="d"
sdl=0
serial='pty'
vnc=1
vnclisten=""
vncpasswd=""
```

In the above, you will want to change

1. `memory = "30720"` → adjust to desired memory in MB
2. `vcpus = 15` → no more than the number of physical cores (plus HyperThreads if applicable) on your machine.
3. `name = "conrad-windows-10"` → adjust to desired machine name. This is not the same as the hostname.
4. `disk=[HDD, CDROM]`, you may need to change both devices.
    1. **HDD**: Change `/dev/vgubuntu/conrad-windows` to point to the logical volume we created for this machine previously.
    2. **CDROM:** Change `/home/current_user/vms/win10_x64.iso` to point to your `.iso` for Windows 10 installation.

That's good enough for now. We will make further adjustments when we copy the installation config to a run config.

**Booting to the installer**

```bash
$> cd ~/vms/conrad-windows
$> sudo xl create install.cfg
$> gvncviewer localhost
```

The final line above assumes you are on a GUI on Dom0. If this is not accurate, you can connect at port `5900` of Dom0. You can look at the man pages for `xl.cfg` at [https://xenbits.xen.org/docs/unstable/man/xl.cfg.5.html](https://xenbits.xen.org/docs/unstable/man/xl.cfg.5.html) for customizing VNC options.

**Installing Windows**

Install Windows as prompted through the VNC connection. When prompted to reboot, you can accept. Try to reconnect again with your VNC client until the machine is accessible.

Install updates to Windows and the Windows Defender malware definitions.

**Installing PV drivers**

There are a few drivers we need to install in order to get native performance in the guest OS, because Windows runs fully virtualized (HVM). As of 2021, the most recent drivers were the version 9.0.0 Xen project drivers at [https://xenproject.org/downloads/windows-pv-drivers/windows-pv-drivers-9-series/windows-pv-drivers-9-0-0/](https://xenproject.org/downloads/windows-pv-drivers/windows-pv-drivers-9-series/windows-pv-drivers-9-0-0/). You can download and install all 8 of the drivers.

Strangely, the drivers are distributed as `.tar` even though this is an inconvenient format on Windows. The easiest way to handle this without installing more software is with PowerShell

```bash
PS> cd Downloads
PS> tar -xzvf *.tar
PS> start .
```

You now have a set of eight folders `xen***`. Open the first, choosing the appropriate architecture, and find a file `dpinst.exe` to install the driver and follow the on-screen prompts. Repeat for each of the remaining drivers before restarting the system and reconnecting over VNC.

**Moving to `run.cfg`**

Now that we have the guest domain provisioned, we can finalize configuration. Edit `run.cfg` so that it has the contents

```ini
type = "hvm"
memory = "30720"
vcpus = 15
cpus="all,^0"
name = "conrad-windows-10"
vif = ['mac=d6-ea-ad-aa-a3-db,bridge=xenbr0']
disk = ['phy:/dev/vgubuntu/conrad-windows,hda,w']
acpi = 1
device_model_version = "qemu-xen"
boot="c"
sdl=0
serial="pty"
vnc=1
vnclisten=""
vncpasswd=""
```

The changes we've made are to

1. `cpus="all,^0"` leave CPU 0 for Dom0. Unless you are running many guest domains this is probably irrelevant. See also the notes below about choosing the vCPU allocation.
2. `vif=` We've modified the virtual network interface to use a fixed MAC address, you can generate one with any number of online tools [https://miniwebtool.com/mac-address-generator/](https://miniwebtool.com/mac-address-generator/). This will be relevant when we set a DHCP reservation on our LAN.
3. `disk = [HDD]` We've removed the specification of the CDROM drive, we don't need it anymore.
4. `boot="c"` always boot from `C:` now, we don't need installation media anymore.

**Choosing vCPU Allocation**

I had read that you should not assign more vCPUs per machine than pCPUs, which is sound advice. What I did not understand initially was that on CPUs with multiple threads per core, you should treat each thread as a pCPU. To be concrete, I have an i7-10700K which has 8 cores and 16 threads, each guest is provisioned with 15 vCPUs.

Overcommitting vCPUs across guests is fine since the Xen scheduler will ensure guests get time. To be extra safe here, we leave pCPU 0 to Dom0 because all guests are dependent on Dom0 executing certain tasks.

## Host security, Making guests available online

To access our Windows machines remotely, we can use RDP. Setting up RDP is straightforward on Windows:

1. Make sure you have a strong password set on your Windows 10 user or Microsoft account. You can remember successful logins in the client so there's no reason not to use a strong password in combination with a password manager.
2. Follow vendor documentation here [https://docs.microsoft.com/en-us/windows-server/remote/remote-desktop-services/clients/remote-desktop-allow-access](https://docs.microsoft.com/en-us/windows-server/remote/remote-desktop-services/clients/remote-desktop-allow-access)

Now, from a local area network with your machine, look at the DHCP lease list on your router (Google: admin login <my router model> or visit `192.168.0.1` or `192.168.1.1` according to your router's model). Find the IP given to your windows computer, say `192.168.0.112`. Now, open `Remote Desktop Connection` on a client computer (similar software is available on Linux, OS X, Android, and iOS to serve as a client) and enter `192.168.0.112:3389` as the URI for the remote computer. 

Verify that you can log in and do not have any issues at this stage.

### Safely providing external access

Opening an RDP port to the broader internet, while fine for LAN, could be very dangerous without using a separate gateway server. A straightforward way to improve security is to tunnel the RDP connection through SSH on Dom0 or another guest. In this case, we will configure SSH access through Dom0 permitting local forwarding of select ports for RDP.

### Modifying your SSH settings

It goes without saying, but make sure that all sudoers on Dom0 have reasonable passwords. We won't permit password login at all, but if an attacker did get in, you don't want them to have root access.

Generate a strong key pair (there are good notes about this and about public key cryptography here [https://stribika.github.io/2015/01/04/secure-secure-shell.html](https://stribika.github.io/2015/01/04/secure-secure-shell.html)) or use an existing keypair.

**Initially installing SSH**

If Dom0 does not already have an SSH server installed

```bash
$> sudo apt install openssh-server
$> sudo ufw allow ssh
```

**Install Fail2ban**

```bash
$> sudo apt install fail2ban
```

**Allow keyed login**

Modify or create `~/.ssh/authorized_keys` so that it contains the public key you will use for access. The contents should look something like this

```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDAJ1RpnUt/5VtzkKFgF3B1GNpCSB1gvbqnTyZAaA/teLGl/GtVDME9gB/3Q0QZAOMNCC/mhkeqHv/Rh4lxELlZQEaz76rNEqYQYPWSyjdhf4lbtclPNgyFuQADbaWFgiNXHz7OSMzgLHsfIF9H+0pC1iSyWgUlO8HECh5vGFJz2lp9FAf/wV47eR7gkeBlySeNI2N4NVWEYVt+dgm+Ae8RGWv27DMAaEuZwsYlUm3nxRwva1+kaupiSy8DR7pm3jomEqQy88yL59Wbop5723a8xe9ZH8ZZJ2Vz4UDbXg7DFINE/vjdsbvlJEkoAB74Ai/ptQzSjUG2Ytxa26H6JqB3 chstansbury@rescomp-14-292399.stanford.edu
```

Next, we will modify `/etc/ssh/sshd_config.`

```bash
$> sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak
```

The full contents for our modified config are available on GitHub, but the critical changes are 

```
PermitRootLogin prohibit-password

# Put your user here, i.e.
# AllowUsers ssh_user
AllowUsers {a user with a strong password, ideally only one}

MaxAuthTries 3
PasswordAuthentication no
PermitEmptyPasswords no
KerberosAuthentication no
GSAPIAuthentication no
AllowAgentForwarding no
AllowTcpForwarding yes
GatewayPorts no
X11Forwarding no
LoginGraceTime 15

# Put a minimal set of ports you need to forward here, as seen
# by Dom0. Here, we imagine providing access to two machines
# with RDP. You could also provide access to SSH on a Linux guest.
PermitOpen 192.168.0.112:3389 192.168.0.113:3389

PermitUserEnvironment no
PermitTunnel no
Banner no
```

Many of these reiterate the defaults explicitly. Most importantly, we disable any password login or alternative forms of login: only public key based methods are allowed.

Another reasonable hardening measure is to use a separate user for tunneling RDP through Dom0, but restrict this user so that they have no privileges and cannot login.

Now, restart SSH with `sudo service sshd reload`. To connect to your RDP session, first `ssh -L 13389:192.168.0.112:3389 ssh_user@dom0ipaddress` to setup the port forwarding and then connect using Remote Desktop Connection at `127.0.0.1:13389`. 

# Ergonomics

### DHCP Reservations

Currently, each machine above including Dom0 has a leased address on your local network. We assigned machines fixed MAC addresses when we changed `install.cfg -> run.cfg`, which should make setting up a DHCP reservation straightforward. The easiest way to do this is to log into your router and pin the DHCP reservation to these MAC addresses you used. Use the same ones as in the `sshd_config` so that you permit forwarding ports for the right domains.

You can setup DHCP reservations through each Domain, or through your router. Some amount of Googling is required here, but generally your router admin page will have details.

### Dynamic DNS

Having static address on your LAN means that you are fully set up for multiple virtualized workstations on your LAN, but you cannot yet access them from elsewhere.

In 2021, you will almost certainly need to set up dynamic DNS so that you can access your machine. While this can sometimes be handled from your router's admin page as well, we can configure the Dom0 `crontab` to update a dynamic DNS provider regularly.

You have many options here. To name a few:

1. No-IP
2. DuckDNS
3. Dynu
4. FreeDNS

I'll assume you choose DuckDNS but the process is similar for other providers. The idea behind dynamic DNS is that your computer will periodically tell the DNS provider your current IP so that it can provide a recent address when someone knocks at a particular URL, typically a subdomain of the dynamic DNS provider. This means you could run a web server, or SSH into, a machine by substituting `your_assigned_subdomain.duckdns.org` for the IP address. DNS is just a mechanism to resolve URIs to IPs.

1. Sign into `[duckdns.org](http://duckdns.org)` with a SSO provider.
2. From the homepage, choose and create a subdomain you will use to access your computer.
3. Visit the install tab and select your subdomain from the dropdown
4. Choose `linux cron` for the OS.
5. Follow the instructions provided to add the update script to your crontab.

### Port forwarding

Our computer still isn't accessible remotely. The dynamic DNS resolves to the IP address of our router. For security reasons, your router will drop all incoming traffic unless you tell it otherwise. In this case, we need to tell it that we should accept traffic on at least one port. Although it will not substantially improve security, you can reduce the amount of log junk created by automated SSH attacks by logging in on another port. In this case, just configure your router to forward traffic from some other port, say port 27844 to port 22 on Dom0.

To do this, log into your router and setup a rule to forward TCP traffic on external port 27844 to internal port 22 and to the IP address of your DHCP reserved Dom0.

### SSH Config Files

For convenience, you will want to modify your `~/.ssh/config` to add Hosts to access your tunnel and Dom0 for administration. Here's what that looks like, using the example values discussed above

```
Host rdp_tunnel
HostName your_assigned_subdomain.duckdns.org
User ssh_user
Port 27844
IdentityFile ~/.ssh/id_rsa
LocalForward 13389 192.168.0.112:3389
```

In this case, we can use the same host for admin and for tunneling. This may be necessary in case you need to reboot the guest domain at some point, which would require `sudo xl`.

That's all! If you've followed this far, you now have a remotely accessible private cloud.