# ![Overcast Logo](http://i.imgur.com/eCBl2NI.png)

Overcast is a simple command line program designed to make it easy to spin up, configure and manage clusters of machines, without the learning curve or complexity of existing server management tools.

![Screenshot](http://i.imgur.com/5x1gKVC.png)

## Concepts

- **Instances** are any machine you can SSH into.
- **Clusters** are sets of instances.

## Features

Create, reboot and destroy instances across DigitalOcean, Linode and Amazon, or locally using Vagrant + Virtualbox:

```sh
# Spin up a new Ubuntu 14.04 instance on DigitalOcean:
$ overcast digitalocean create db-01

# Spin up a new Ubuntu 14.04 instance on Linode:
$ overcast linode create db-02

# Spin up a new Ubuntu 14.04 instance on EC2:
$ overcast aws create db-03 --user ubuntu
$ overcast run db-03 allow_root_access_on_ec2
$ overcast instance update db-03 --user root

# Spin up a new locally-running Ubuntu 14.04 Virtualbox instance:
$ overcast virtualbox create db-04

# Upgrade and install Redis across all of those instances in parallel:
$ overcast run db-* install/core install/redis --parallel
```

Import your already-running machines, wherever they are, using `overcast import` or by editing [`~/.overcast/clusters.json`](https://github.com/andrewchilds/overcast/tree/master/fixtures/example.clusters.json):

```sh
$ overcast import app-01 --ip 1.1.1.1 --ssh-key ~/.ssh/id_rsa
$ overcast import app-02 --ip 2.2.2.2 --ssh-key ~/.ssh/id_rsa
```

Run multiple commands or multiple scripts on any or all of your instances at once, over SSH. Commands can be run sequentially or in parallel using the `--parallel` flag.

```sh
# Run bundled scripts:
$ overcast run db install/core install/apache install/mysql install/php
# Run scripts relative to the current working directory or using absolute path:
$ overcast run app-cluster ./recipes/my-app/install /path/to/script
# Run sequences of commands and scripts across multiple machines in parallel:
$ overcast run db ./script.sh uptime "free -m" "df -h" --parallel
```

Quickly SSH in to any instance by name.

```sh
$ overcast ssh app-01
```

Push and pull files between your local machine and any or all of your instances at once. Dynamically rewrite file paths to include the instance name using `{instance}` in either source or destination.

```sh
$ overcast push app nginx/myapp.conf /etc/nginx/sites-enabled/myapp.conf
$ overcast pull all /etc/nginx/sites-enabled/myapp.conf nginx/{instance}.myapp.conf
```

Overcast is a thin wrapper around your native SSH client, and doesn't install or leave anything on the servers you communicate with, so Overcast itself has no real attack surface.

A [script library](https://github.com/andrewchilds/overcast/tree/master/scripts) and [recipe library](https://github.com/andrewchilds/overcast/tree/master/recipes) are included to make it trivial to deploy common software stacks and applications. The libraries were written for and tested against Ubuntu/Debian systems, but you can just as easily run your own custom scripts as well:

```sh
$ overcast run all /absolute/path/to/script ./relative/path/to/other/script
```

## Installation (OS X/Linux)

1. Install [Node.js](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager) if not already installed.

2. Install Overcast using npm.

    ```sh
    $ npm -g install overcast
    ```

3. You can now use Overcast from any directory. Running any overcast command from anywhere will create the `~/.overcast` config directory if it doesn't already exist. Add your API keys to `~/.overcast/variables.json` to use their respective commands, either manually or using the `var` command:

    ```sh
    $ overcast var set AWS_KEY my_aws_key
    $ overcast var set AWS_SECRET my_aws_secret
    $ overcast var set DIGITALOCEAN_CLIENT_ID abc123
    $ overcast var set DIGITALOCEAN_API_KEY abc123
    $ overcast var set LINODE_API_KEY abc123
    ```

4. To make working with Overcast easier, you can add tab completion and SSH aliases to quickly SSH in to any of your instances, by adding the following to your `.bash_profile`:

    ```sh
    # Overcast SSH aliases
    overcast aliases > $HOME/.overcast_aliases
    source $HOME/.overcast_aliases

    # Overcast Tab completion
    _overcast_completions() {
      local cur=${COMP_WORDS[COMP_CWORD]}
      COMPREPLY=($(compgen -W "`overcast completions`" -- "$cur"))
      return 0
    }
    complete -F _overcast_completions overcast
    ```

## Installation (Windows)

Using Overcast on Windows is possible, but **unsupported**. Instructions TBD.

## Uninstallation

Since Overcast is just a wrapper around SSH, there is nothing on your remote machines to uninstall. To uninstall Overcast from your local machine:

```sh
# To remove the Overcast package:
$ npm -g remove overcast
# Optionally delete your Overcast SSH keys and configuration files:
$ rm -rf ~/.overcast
```

## Configuration

Overcast looks for an `.overcast` directory in the current directory, a parent directory, or `~/.overcast`, in that order. This means you can have multiple configurations and treat your server infrastructure like source code.

The command `overcast init` will create a new configuration in the current directory. The config directory looks like this:

```sh
/.overcast
  /files            # Files to be pushed to / pulled from instances
  /keys             # SSH keys, can be your own or auto-generated by overcast
    overcast.key
    overcast.key.pub
  /scripts          # Scripts to be run on instances
  clusters.json     # Cluster/instance definitions (see example.clusters.json)
  variables.json    # API keys, etc (see example.variables.json)
```

## Design Goals &amp; Motivation

There are many server management frameworks out there already, but they generally involve a complex server-client implementation, a steep learning curve, or a giant, monolithic conceptual framework that requires taking a course to understand.

I wanted something that had little to no learning curve, that did only what you asked it to do on the remote machines and nothing more, that just focused on multi-server provisioning and communication and leaves problems like process/state management and system monitoring to tools designed specifically for those problems.

## Example App Deployment Recipes

  - [Discourse](https://github.com/andrewchilds/overcast/blob/master/recipes/discourse)
  - [Ubuntu 14.04 LAMP server](https://github.com/andrewchilds/overcast/blob/master/recipes/lamp-server)
  - [Overcast Charts](https://github.com/andrewchilds/overcast-charts)

## Command Reference

### overcast aliases

```
Usage:
  overcast aliases

Description:
  Return a list of bash aliases for SSHing to your instances.

  To use, add this to your .bash_profile:
    test -f $HOME/.overcast_aliases && source $HOME/.overcast_aliases

  And then create the .overcast_aliases file:
    overcast aliases > $HOME/.overcast_aliases

  Or to automatically refresh aliases in every new terminal window
  (which will add a couple hundred milliseconds to your startup time),
  add this to your .bash_profile:
    overcast aliases > $HOME/.overcast_aliases
    source $HOME/.overcast_aliases
```

### overcast aws

```
  These commands require the following values set in .overcast/variables.json:
    AWS_KEY
    AWS_SECRET

  overcast aws create [name] [options...]
    Creates a new EC2 instance.

      Option                   | Default
      --cluster CLUSTER        | default
      --ami NAME               | ami-018c9568 (Ubuntu 14.04 LTS, 64bit, EBS)
      --size NAME              | t1.micro
      --monitoring BOOLEAN     | false
      --user NAME              | root
      --ssh-key KEY_PATH       | overcast.key
      --ssh-pub-key KEY_PATH   | overcast.key.pub

    Example:
    $ overcast aws create db.01 --cluster db --size m1.small --user ubuntu

  overcast aws destroy [name]
    Destroys an EC2 instance.

      Option                   | Default
      --force                  | false

    Example:
    $ overcast aws destroy db.01

  overcast aws reboot [name]
    Reboots an EC2 instance.

    Example:
    $ overcast aws reboot db.01

  overcast aws start [name]
    Starts an EC2 instance.

    Example:
    $ overcast aws start db.01

  overcast aws stop [name]
    Stop an EC2 instance.

    Example:
    $ overcast aws stop db.01
```

### overcast cluster count

```
Usage:
  overcast cluster count [name]

Description:
  Return the number of instances in a cluster.

Examples:
  $ overcast cluster count db
  > 0
  $ overcast instance create db.01 --cluster db
  > ...
  $ overcast cluster count db
  > 1
```

### overcast cluster create

```
Usage:
  overcast cluster create [name]

Description:
  Creates a new cluster.

Examples:
  $ overcast cluster create db
```

### overcast cluster rename

```
Usage:
  overcast cluster rename [name] [new-name]

Description:
  Renames a cluster.

Examples:
  $ overcast cluster rename app-cluster app-cluster-renamed
```

### overcast cluster remove

```
Usage:
  overcast cluster remove [name]

Description:
  Removes a cluster from the index. If the cluster has any instances
  attached to it, they will be moved to the "orphaned" cluster.

Examples:
  $ overcast cluster remove db
```

### overcast completions

```
Usage:
  overcast completions

Description:
  Return an array of commands, cluster names, and instance names for use
  in bash tab completion.

  To enable tab completion in bash, add this to your .bash_profile:

  _overcast_completions() {
    local cur=${COMP_WORDS[COMP_CWORD]}
    COMPREPLY=($(compgen -W "`overcast completions`" -- "$cur"))
    return 0
  }
  complete -F _overcast_completions overcast
```

### overcast destroy

```
  overcast destroy [instance]
    Destroy an instance using the provider API.

      Option      | Default
      --force     | false

    Example:
    $ overcast destroy app-01
```

### overcast digitalocean boot

```
Usage:
  overcast digitalocean boot [name]

Description:
  Boot up an instance if powered off, otherwise do nothing.
```

### overcast digitalocean create

```
Usage:
  overcast digitalocean create [name] [options...]

Description:
  Creates a new instance on DigitalOcean.

Options:                  Defaults:
  --cluster CLUSTER       default
  --ssh-port PORT         22
  --ssh-key PATH          overcast.key
  --ssh-pub-key PATH      overcast.key.pub
  --region REGION         nyc3
  --image IMAGE           ubuntu-14-04-x64
  --size SIZE             512mb
  --backups-enabled       false
  --private-networking    false

Examples:
  # Match using slugs:
  $ overcast digitalocean create vm-01 --size 2gb --region sfo1

  # Match using IDs or names:
  $ overcast digitalocean create vm-02 --region "London 1" --image 6374128
```

### overcast digitalocean destroy

```
Usage:
  overcast digitalocean destroy [name] [options...]

Description:
  Destroys a DigitalOcean droplet and removes it from your account.
  Using --force overrides the confirm dialog.

Options:     Defaults:
  --force    false

Examples:
  $ overcast digitalocean destroy vm-01
```

### overcast digitalocean images

```
Usage:
  overcast digitalocean images

Description:
  List all images, including snapshots.
```

### overcast digitalocean instances

```
Usage:
  overcast digitalocean instances

Description:
  List all instances in your account.
```

### overcast digitalocean reboot

```
Usage:
  overcast digitalocean reboot [name]

Description:
  Reboot an instance using the provider API.
```

### overcast digitalocean regions

```
Usage:
  overcast digitalocean regions

Description:
  List all available regions.
```

### overcast digitalocean rebuild

```
Usage:
  overcast digitalocean rebuild [name] [image]

Description:
  Rebuilds an existing instance on DigitalOcean, preserving the IP address.
  [image] can be image ID, name or slug.

Examples:
  # Rebuild an instance using a readymade image:
  $ overcast digitalocean rebuild vm-01 ubuntu-14-04-x64

  # Rebuild an instance using a snapshot:
  $ overcast digitalocean rebuild vm-01 "vm-01 backup"
```

### overcast digitalocean resize

```
Usage:
  overcast digitalocean resize [name] [size] [options...]

Description:
  Shutdown, resize, and reboot a DigitalOcean instance.
  [size] can be a size ID, name or slug.
  If the --skip-boot flag is used, the instance will stay powered off.

Options:         Defaults:
  --skip-boot    false

Examples:
  # Resize an instance to 2gb:
  $ overcast digitalocean resize vm-01 2gb
```

### overcast digitalocean snapshot

```
Usage:
  overcast digitalocean snapshot [name] [snapshot-name]

Description:
  Creates a named snapshot of a droplet. This will reboot the instance.

Examples:
  $ overcast digitalocean snapshot vm-01 vm-01-snapshot
```

### overcast digitalocean snapshots

```
Usage:
  overcast digitalocean snapshots

Description:
  List all available snapshots in your account.
```

### overcast digitalocean shutdown

```
Usage:
  overcast digitalocean shutdown [name]

Description:
  Shut down an instance using the provider API.
```

### overcast digitalocean sizes

```
Usage:
  overcast digitalocean sizes

Description:
  List all available instance sizes.
```

### overcast digitalocean sync

```
Usage:
  overcast digitalocean sync [name]

Description:
  Fetch and update instance metadata.
```

### overcast expose

```
Usage:
  overcast expose [instance|cluster|all] [port...] [options]

Description:
  Reset the exposed ports on the instance or cluster using iptables.
  This will fail if you don't include the current SSH port.
  Specifying --whitelist will restrict all ports to the specified address(es).
  These can be individual IPs or CIDR ranges, such as "192.168.0.0/24".

  Expects an Ubuntu server, untested on other distributions.

Options:
  --user NAME
  --whitelist "IP|RANGE"
  --whitelist-PORT "IP|RANGE"

Examples:
  Allow SSH, HTTP and HTTPS connections from anywhere:
  $ overcast expose app 22 80 443

  Allow SSH from anywhere, only allow Redis connections from 1.2.3.4:
  $ overcast expose redis 22 6379 --whitelist-6379 "1.2.3.4"

  Only allow SSH and MySQL connections from 1.2.3.4 or from 5.6.7.xxx:
  $ overcast expose mysql 22 3306 --whitelist "1.2.3.4 5.6.7.0/24"
```

### overcast exposed

```
Usage:
  overcast exposed [instance|cluster|all]

Description:
  List the exposed ports on the instance or cluster.
  Expects an Ubuntu server, untested on other distributions.

Options:
  --user NAME
  --machine-readable, --mr
```

### overcast health

```
Usage:
  overcast health [instance|cluster|all]

Description:
  Outputs common health statistics in JSON format.
  Expects an Ubuntu or Debian server.

Examples:
  Example JSON response:
  {
    "my_instance_name": {
      "cpu_1min": 0.53,
      "cpu_5min": 0.05,
      "cpu_15min": 0.10,
      "disk_total": 19592,     // in MB
      "disk_used": 13445,      // in MB
      "disk_free": 5339,       // in MB
      "mem_total": 1000,       // in MB
      "mem_used": 904,         // in MB
      "mem_free": 96,          // in MB
      "cache_used": 589,       // in MB
      "cache_free": 410,       // in MB
      "swap_total": 255,       // in MB
      "swap_used": 124,        // in MB
      "swap_free": 131,        // in MB
      "tcp": 152,              // open TCP connections
      "rx_bytes": 196396703,   // total bytes received
      "tx_bytes": 47183785,    // total bytes transmitted
      "io_reads": 1871210,     // total bytes read
      "io_writes": 6446448,    // total bytes written
      "processes": [
        {
          "user": "root",
          "pid": 1,
          "cpu%": 0,
          "mem%": 0,
          "time": "0:01",
          "command": "/sbin/init"
        }
      ]
    }
  }
```

### overcast help

```
  Overcast v0.6.3

  Source code, issues, pull requests:
    https://github.com/andrewchilds/overcast

  Usage:
    overcast [command] [options...]

  Help:
    overcast help
    overcast help [command]
    overcast [command] help

  Commands:
    aliases aws cluster completions destroy digitalocean expose exposed
    health import info init instance key linode list ping port pull push
    reboot remove run scriptvar slack ssh tunnel var virtualbox wait

  Config directory:
    /path/to/.overcast
```

### overcast import

```
Usage:
  overcast import [name] [ip] [options...]

Description:
  Imports an existing instance to a cluster.

Options:               Defaults:
  --cluster CLUSTER    default
  --ssh-port PORT      22
  --ssh-key PATH       overcast.key
  --user USERNAME      root
```

### overcast info

```
Usage:
  overcast info
  overcast info [name]

Description:
  Pretty-prints the complete clusters.json file, stored here:
  /path/to/.overcast/clusters.json
  Optionally display only instances matching [name].
```

### overcast init

```
Usage:
  overcast init

Description:
  Create an .overcast config directory in the current working directory.
  No action taken if one already exists.
```

### overcast instance get

```
Usage:
  overcast instance get [instance|cluster|all] [attr...]

Description:
  Returns the attribute(s) for the instance or cluster, one per line.

Examples:
  $ overcast instance get app-01 ssh-port
  22

  $ overcast instance get app-cluster ip
  127.0.0.1
  127.0.0.2
  127.0.0.3
```

### overcast instance import

```
Usage:
  overcast instance import [name] [ip] [options...]

Description:
  Imports an existing instance to a cluster.

Options:               Defaults:
  --cluster CLUSTER    default
  --ssh-port PORT      22
  --ssh-key PATH       overcast.key
  --user USERNAME      root

Examples:
  $ overcast instance import app.01 127.0.0.1 --cluster app \
      --ssh-port 22222 --ssh-key $HOME/.ssh/id_rsa
```

### overcast instance list

```
Usage:
  overcast instance list [cluster...]

Description:
  Returns all instance names, one per line.
  Optionally limit to one or more clusters.

Examples:
  $ overcast instance list
  $ overcast instance list app-cluster db-cluster
```

### overcast instance remove

```
Usage:
  overcast instance remove [name]

Description:
  Removes an instance from the index.
  The server itself is not affected by this action.

Examples:
  $ overcast instance remove app-01
```

### overcast instance update

```
Usage:
  overcast instance update [name] [options...]

Description:
  Update any instance property. Specifying --cluster will move the instance
  to that cluster. Specifying --name will rename the instance.

Options:
  --name NAME
  --cluster CLUSTER
  --ip IP
  --ssh-port PORT
  --ssh-key PATH
  --user USERNAME

Examples:
  $ overcast instance update app.01 --user myuser --ssh-key /path/to/key
```

### overcast key create

```
Usage:
  overcast key create [name]

Description:
  Creates a new SSH key in the current .overcast config.

Examples:
  $ overcast key create myKeyName
  New SSH key "myKeyName" created.
   - /path/to/.overcast/keys/myKeyName.key
   - /path/to/.overcast/keys/myKeyName.key.pub
```

### overcast key delete

```
Usage:
  overcast key delete [name]

Description:
  Deletes SSH public/private key files from the current .overcast config.

Examples:
  $ overcast key delete myKeyName
  SSH key "myKeyName" deleted.
```

### overcast key get

```
Usage:
  overcast key get [name] [option]

Description:
  Display the requested SSH key data or path from the current .overcast config.
  Defaults to displaying the public key data if no option found.

Options:
  --public-data
  --private-data
  --public-path
  --private-path

Examples:
  $ overcast key get myKeyName
  [public key data]
  $ overcast key get myKeyName --private-data
  [private key data]
```

### overcast key list

```
Usage:
  overcast key list

Description:
  List the found SSH key names in the current .overcast config.

Examples:
  $ overcast key list
  myKeyName
  overcast
```

### overcast linode

```
  These functions require the LINODE_API_KEY variable to be set.
  Your API keys can be found at https://manager.linode.com/profile/api

  overcast linode boot [name]
    Boot a powered off linode.

  overcast linode create [name] [options]
    Creates a new Linode.

      Option                    | Default
      --cluster CLUSTER         | default
      --datacenter-slug NAME    | newark
      --datacenter-id ID        |
      --distribution-slug NAME  | ubuntu-14-04-lts
      --distribution-id ID      |
      --kernel-id ID            |
      --kernel-name NAME        | Latest 64 bit
      --payment-term ID         | 1 (monthly, if not metered)
      --plan-id ID              |
      --plan-slug NAME          | 2048
      --password PASSWORD       | autogenerated
      --ssh-key KEY_PATH        | overcast.key
      --ssh-pub-key KEY_PATH    | overcast.key.pub

    Example:
    $ overcast linode create db.01 --cluster db --datacenter-slug london

  overcast linode datacenters
    List available Linode datacenters.

  overcast linode destroy [name]
    Destroys a linode and removes it from your account.
    Using --force overrides the confirm dialog. This is irreversible.

      Option                    | Default
      --force                   | false

  overcast linode distributions
    List available Linode distributions.

  overcast linode kernels
    List available Linode kernels.

  overcast linode linodes
    List all linodes in your account.

  overcast linode plans
    List available Linode plans.

  overcast linode reboot [name]
    Reboots a linode.

  overcast linode resize [name] [options]
    Resizes a linode to the specified plan.
    This will immediately shutdown and migrate your linode.

      Option                    | Default
      --plan-id ID              |
      --plan-slug NAME          |

  overcast linode shutdown [name]
    Shut down a linode.
```

### overcast list

```
Usage:
  overcast list

Description:
  List your cluster and instance definitions.
```

### overcast ping

```
Usage:
  overcast ping [instance|cluster|all] [options]

Description:
  Display the average ping time for an instance or cluster.

Options:             Defaults:
  --count N, -c N    3

Examples:
  $ overcast ping app-01
  $ overcast ping db --count 5
```

### overcast port

```
Usage:
  overcast port [instance|cluster|all] [port]

Description:
  Change the SSH port for an instance or a cluster.
  This command will fail if the new port is not opened by iptables.

Examples:
  $ overcast port app-01 22222
  $ overcast port db 22222
```

### overcast pull

```
Usage:
  overcast pull [instance|cluster|all] [source] [dest] [options...]

Description:
  Pull a file or directory from an instance or cluster using scp by default,
  or using rsync if the --rsync flag is used. Source is absolute or relative
  to the home directory. Destination can be absolute or relative to the
  .overcast/files directory. Any reference to {instance} in the destination
  will be replaced with the instance name.

Options:         Defaults:
  --rsync        false
  --user NAME

Examples:
  Assuming instances "app.01" and "app.02", this will expand to:
    - .overcast/files/app.01.bashrc
    - .overcast/files/app.02.bashrc
  $ overcast pull app .bashrc {instance}.bashrc
```

### overcast push

```
Usage:
  overcast push [instance|cluster|all] [source] [dest] [options...]

Description:
  Push a file or directory to an instance or cluster using scp by default,
  or rsync if the --rsync flag is used. Source can be absolute or relative
  to the .overcast/files directory. Destination can be absolute or relative
  to the home directory. Any reference to {instance} in the source will be
  replaced with the instance name.

Options:         Defaults:
  --rsync        false
  --user NAME

Examples:
  Assuming instances "app.01" and "app.02", this will expand to:
    - .overcast/files/app.01.bashrc
    - .overcast/files/app.02.bashrc
  $ overcast push app {instance}.bashrc .bashrc
```

### overcast reboot

```
  overcast reboot [instance|cluster|all]
    Reboot an instance or cluster.

    If the instance was created using AWS, DigitalOcean or Linode,
    this will use the provider API. Otherwise this will execute the "reboot"
    command on the server and then wait until the server is responsive.
```

### overcast remove

```
Usage:
  overcast remove [name]

Description:
  Removes an instance from the index.
  The server itself is not affected by this action.

Examples:
  $ overcast instance remove app-01
```

### overcast run

```
Usage:
  overcast run [instance|cluster|all] [command|file...]

Description:
  Execute commands or script files on an instance or cluster over SSH.
  Commands will execute sequentially unless the --parallel flag is used.
  An error will stop execution unless the --continueOnError flag is used.
  Script files can be either absolute or relative path.

Options:                         Defaults:
  --env "KEY=VAL KEY='1 2 3'"
  --user NAME
  --ssh-key PATH
  --ssh-args ARGS
  --continueOnError              false
  --machine-readable, --mr       false
  --parallel, -p                 false
  --shell-command "COMMAND"      bash -s

Examples:
  # Run arbirary commands and files in sequence across all instances:
  $ overcast run all uptime "free -m" "df -h" /path/to/my/script

  # Setting environment variables:
  $ overcast run app --env "foo='bar bar' testing=123" env

  # Use machine-readable output (no server prefix):
  $ overcast run app-01 uptime --mr

  # Run bundled and custom scripts in sequence:
  $ overcast run db-* install/core install/redis ./my/install/script

  # Pass along arbitrary SSH arguments, for example to force a pseudo-tty:
  $ overcast run all /my/install/script --ssh-args "-tt"
```

### overcast scriptvar

```
Usage:
  overcast scriptvar [instance|cluster|all] [filename] [key] [value]

Description:
  Set a named variable in a remote file on an instance or cluster.
  Expects a shell variable format, for example MY_VAR_NAME="my_value"

Options:                      Defaults:
  --user NAME
  --continueOnError           false
  --machine-readable, --mr    false
  --parallel, -p              false

Examples:
  $ overcast scriptvar app-01 /path/to/file.sh MY_API_TOKEN abc123
```

### overcast slack

```
Usage:
  overcast slack [message] [options...]

Description:
  Sends a message to a Slack channel.
  Requires a SLACK_WEBHOOK_URL property to be set in variables.json.
  You can set that with the following command:
  overcast var set SLACK_WEBHOOK_URL https://foo.slack.com/blah

Options:                Defaults:
  --channel NAME        #alerts
  --icon-emoji EMOJI    :cloud:
  --icon-url URL
  --user NAME           Overcast
  --KEY VALUE

Examples:
  $ overcast slack "Deploy completed." --icon-emoji ":satelite:"
  $ overcast slack "Server stats" --channel "#general" --cpu "0.54 0.14 0.09"
```

### overcast ssh

```
Usage:
  overcast ssh [instance] [options...]

Description:
  Opens an interactive SSH connection to an instance.

Options:
  --user NAME
  --ssh-key PATH
```

### overcast tunnel

```
Usage:
  overcast tunnel [instance] [local-port((:hostname):remote-port)...]

Description:
  Opens an SSH tunnel to the port(s) specified.
  If only one port is specified, assume the same port for local/remote.
  If no remote host is specified, assume the remote host itself (127.0.0.1).
  Multiple tunnels can be opened over a single connection.

Options:
  --user NAME
  --ssh-key PATH

Examples:
  # Tunnel local 5984 to remote 5984
  $ overcast tunnel app-01 5984

  # Tunnel local 8000 to remote 5984, local 8001 to remote 3000
  $ overcast tunnel app-01 8000:5984 8001:3000

  # Tunnel local 3000 to otherhost.com:4000
  $ overcast tunnel app-01 3000:otherhost.com:4000
```

### overcast var list

```
Usage:
  overcast var list

Description:
  List variables in /path/to/.overcast/variables.json.
```

### overcast var set

```
Usage:
  overcast var set [name] [value]

Description:
  Set a variable in /path/to/.overcast/variables.json.

Examples:
  $ overcast var set AWS_KEY myawskey12345
  $ overcast var set MY_CUSTOM_VARIABLE_NAME foo
```

### overcast var get

```
Usage:
  overcast var get [name]

Description:
  Get a variable from /path/to/.overcast/variables.json.

Examples:
  $ overcast var get AWS_KEY
  > myawskey12345

  $ overcast var get MY_CUSTOM_VARIABLE_NAME
  > foo
```

### overcast var delete

```
Usage:
  overcast var delete [name]

Description:
  Delete a variable from /path/to/.overcast/variables.json.

Examples:
  $ overcast var delete MY_CUSTOM_VARIABLE_NAME
```

### overcast virtualbox

```
  These commands require Vagrant to be installed on your local machine.
  See http://www.vagrantup.com/downloads, or install on OS X using homebrew-cask:
    $ brew tap caskroom/cask
    $ brew install brew-cask
    $ brew cask install vagrant

  overcast virtualbox create [name] [options...]
    Creates a new local Virtualbox instance using Vagrant.

    If --ip is not specified, the next available IP after 192.168.22.10 will
    be automatically assigned. User is root by default. Vagrant files are stored
    in the ~/.overcast-vagrant directory. Image names "trusty64" (Ubuntu 14.04)
    and "precise64" (Ubuntu 12.04) are downloaded automatically from Ubuntu
    servers the first time they are used.

    Other image names will need to be added using:
    $ vagrant box add --name [name] [image-url]

      Option                   | Default
      --cluster CLUSTER        | default
      --image NAME             | trusty64
      --ram MB                 | 512
      --cpus COUNT             | 1
      --ip ADDRESS             | 192.168.22.10
      --ssh-key KEY_PATH       | overcast.key
      --ssh-pub-key KEY_PATH   | overcast.key.pub

    Examples:
    $ overcast virtualbox create local.vm.01
    $ overcast virtualbox create local.vm.02 --ram 1024 --image precise64

  overcast virtualbox destroy [name]
    Destroys a virtualbox instance.

      Option                   | Default
      --force                  | false

    Example:
    $ overcast virtualbox destroy local.01

  overcast virtualbox reboot [name]
    Reboots a virtualbox instance.

    Example:
    $ overcast virtualbox reboot local.01

  overcast virtualbox start [name]
    Starts a virtualbox instance.

    Example:
    $ overcast virtualbox start local.01

  overcast virtualbox stop [name]
    Stop a virtualbox instance.

    Example:
    $ overcast virtualbox stop local.01
```

### overcast wait

```
Usage:
  overcast wait [seconds]

Description:
  Show a progress bar for a specified number of seconds.

Examples:
  $ overcast wait 30
```

## Running the Tests

[![Build Status](https://travis-ci.org/andrewchilds/overcast.svg?branch=master)](https://travis-ci.org/andrewchilds/overcast)

```sh
git clone https://github.com/andrewchilds/overcast.git
cd overcast
npm test
```

## Upgrading Overcast

```sh
npm -g update overcast
```

Configuration files are left alone during an upgrade.

## Contributing

Contributions are welcome. If you've got an idea for a feature or found a bug, please [open an issue](https://github.com/andrewchilds/overcast/issues). If you're a developer and want to help improve Overcast, [open a pull request](https://github.com/andrewchilds/overcast/pulls) with your changes.

## Roadmap

- Tagging
- Events
- Google Compute Engine support
- [pkgcloud.compute](https://github.com/pkgcloud/pkgcloud#compute) integration (for Joyent, Openstack, Rackspace support)
- More comprehensive script/recipe library
- More test coverage

## License

MIT. Copyright &copy; 2014 [Andrew Childs](http://twitter.com/andrewchilds).
