# Creating a Private Git Server

A private git server is a nice and easy way to securely work with sensitive data. You directly control who has access to the server, and there is no giant web application to install and maintain and worry about. SSH passwords are disabled by default (using the `harden_ssh` script), iptables is configured to only allow connections on port 22, and all repos are owned by the `git` user.

## Instructions

Spin up and configure your git server on DigitalOcean. This uses a Ubuntu 14.04 image on a 512mb machine in the nyc2 region with backups enabled. The instance will be named `git-001`.

```sh
./deploy-digitalocean
```

To create a new git repo:

```sh
overcast run git-001 "git init --bare my-repo-name.git"
```

Since you're using Overcast's SSH key to connect to the server, you need to add an entry in your `~/.ssh/config` file to allow git to connect:

```
Host git.mydomain.com
  HostName [your assigned IP address]
  IdentityFile /path/to/your/overcast.key
  Port 22
  User git
```

To work with the new repo on your local machine:

```sh
cd /path/to/my/project
git init
git remote add origin git.mydomain.com:my-repo-name.git
git add .
git commit "First commit"
git push origin master
```

To give repo access to additional users, add their public SSH key to `/home/git/.ssh/authorized_keys`:

```sh
overcast run git-001 "echo [pub-key-data] >> ~/.ssh/authorized_keys"
```
