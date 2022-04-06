# Upgrading

```
npm -g update overcast
```

# Change Log

**2.1.0** (Apr 6, 2022)

Adds:
- Add `--only-once` argument to `run` command, so the command will run only against the first matching instance.

Updates:
- Removes the `:` from the instance suffix when running commands over SSH

**2.0.10** (Apr 6, 2022)

Fixes:
- `sshkey` command would run successfully but throw an error

**2.0.9** (Apr 4, 2022)

Adds:
- Allow a DigitalOcean VPC UUID to be provided when creating a new droplet using `--vpc-uuid` (`--private-networking` is deprecated).

**2.0.8** (Apr 4, 2022)

Fixes:
- Allow snapshots to used when creating new instances, which fixes [#44](https://github.com/andrewchilds/overcast/issues/44).

**2.0.7** (Apr 4, 2022)

Updates:
- Adds Ubuntu 20.04 support to `exposed` and `expose` commands and underlying scripts

**2.0.5** (Mar 31, 2022)

Updates:
- install/core, install/nginx, install/node to work with latest versions and Ubuntu 20.04

Adds:
- install/postgres bundled install script

**2.0.4** (Mar 10, 2022)

Fixes:
- Fix `--exclude` bug in `push` command

**2.0.3** (Mar 10, 2022)

Adds:
- Add `--exclude` argument to `push` command's rsync mode

**2.0.2** (Mar 10, 2022)

Fixes:
- Fix bug that prevented quoted SSH commands from running

**2.0.1** (Mar 2, 2022)

Fixes:
- Fix overcast/bin configuration

**2.0.0** (Feb, 2022)

Codebase refactor:

- Refactor codebase to use modern ES6 + ESM syntax
- Remove `lodash`, `bluebird`, `rimraf` dependencies
- Replace `colors` dependency with `chalk`
- Upgrade all remaining dependencies to latest

Product simplification:

- Remove `health` command, which doesn't need to be part of the core app
- Remove unnecessary `get`, `import`, `destroy`, and `reboot` alias commands
- Remove AWS and Linode as providers - may revisit adding them back in if there is enough demand
- Rename `var` command to the not-reserved `vars`
- Rename the overly-general `key` command to `sshkey`
- Remove redundant `overcast help [command]` syntax
- Remove ability to store files and scripts in the `.overcast` directory, which is now focused on storing keys, variables, and cluster data
- Rename `cluster create` to `cluster add`, `instance import` to `instance add`.

Fixes:
- Removed clusters/variables caching, which fixes [#48](https://github.com/andrewchilds/overcast/issues/48).

**1.0.8** (Apr 4, 2018)

- Handle more than a single "reservation" when describing AWS instances.

**1.0.7** (Jul 24, 2017)

- Upgrade to latest `aws-sdk` package, allowing use of new AWS regions. Fixes [#46](https://github.com/andrewchilds/overcast/issues/46).

**1.0.5** (Jul 3, 2017)

- Fix package naming bug.

**1.0.4** (Jul 3, 2017)

- Temporarily use forked npm package of `do-wrapper` as `overcast-do-wrapper`, until fixes from 1.0.3 are merged into upstream.

**1.0.3** (Jul 3, 2017)

- Fix bug where some `digitalocean` commands were broken due to the DigitalOcean API adding pagination. Fixes [#54](https://github.com/andrewchilds/overcast/issues/54).
- Update npm dependencies.

**1.0.2** (Nov 7, 2015)

- Add .npmignore file.

**1.0.1** (Nov 7, 2015)

- Shrinkwrap npm dependencies.

**1.0.0** (Nov 7, 2015)

- Update DigitalOcean provider API to v2. Fixes [#40](https://github.com/andrewchilds/overcast/issues/40). DigitalOcean commands now expect a DIGITALOCEAN_API_TOKEN variable.

**0.6.12** (Jan 25, 2015)

- Add `key push` command to make it easier to automatically regenerate keys across multiple instances.
- Change `instance update` command to work across multiple instances.
- Disallow instances with the same name across different clusters. Fixes [#35](https://github.com/andrewchilds/overcast/issues/35).

**0.6.11** (Jan 23, 2015)

- Allow Availability Zone to be defined in `aws create` command.

**0.6.10** (Jan 22, 2015)

- Allow Security Groups to be defined in `aws create` command.
- Set name tag during `aws create` command.

**0.6.9** (Jan 18, 2015)

- Fix bug in port command that prevented instance config from being updated.
- Rename overcast binaries to avoid accidental $PATH collision. Fixes [#30](https://github.com/andrewchilds/overcast/issues/30)
- Adding support for password-based SSH authentication using `sshpass`. [#31](https://github.com/andrewchilds/overcast/pull/31)

**0.6.8** (Jan 14, 2015)

- Fix bug where incorrect arguments in certain cases caused clusters.json file to be wiped out. Fixes [#32](https://github.com/andrewchilds/overcast/issues/32).

**0.6.7** (Jan 5, 2015)

- Rewrite `linode` command to use standard provider API.
- To improve consistency across providers, `datacenters`, `distributions`, `linodes`, and `plans` commands are renamed to `regions`, `images`, `instances`, and `sizes`, though the original command names are still quietly supported for backward compatibility. Update `linode create` command to expect --image, --size, --region, though the original options are still supported.
- Add `linode kernels` and `linode sync` commands.
- Add --swap option to `linode create` command.

**0.6.6** (Jan 2, 2015)

- Rewrite `virtualbox` command to use standard provider API.
- To improve consistency across providers, `start` and `stop` commands are renamed to `boot` and `shutdown`, though `start` and `stop` are still quietly supported for backward compatibility.

**0.6.5** (Jan 2, 2015)

- Rewrite `aws` command to use standard provider API.
- Fix issue where EC2 instances are no longer accessible after a restart.
- Add `aws regions` and `aws instances` commands.
- To improve consistency across providers, `start` and `stop` commands are renamed to `boot` and `shutdown`, though `start` and `stop` are still quietly supported for backward compatibility.
- Add --region option to `aws create` command, standardize to expect --image, though --ami is still quietly supported for backward compatibility.

**0.6.4** (Jan 1, 2015)

- Add support for ~/ and $HOME in SSH key paths. Closes [#27](https://github.com/andrewchilds/overcast/issues/27).
- Add `get` command, which maps to `instance get`. Add "origin" attribute and --single-line option to `instance get`. Closes [#29](https://github.com/andrewchilds/overcast/issues/29).

**0.6.3** (Dec 31, 2014)

- Rewrite `digitalocean` commands to use new standard provider API. Command options have been simplified, allowing for fuzzy matching of regions, images, and sizes based on ID, name, or slug. Closes [#25](https://github.com/andrewchilds/overcast/issues/25).
- Add `digitalocean sync` command.
- Display raw rsync/scp commands before spawning processes in `push` and `pull` commands.

**0.6.2** (Dec 13, 2014)

- Rewrite every command except providers using new compact declarative syntax. Fixes [#24](https://github.com/andrewchilds/overcast/issues/24). Providers are next.
- Improve `ssh` command to behave exactly like standalone SSH, by inheriting the existing terminal stdio.
- Change `import` command signature to expect an [ip] argument.
- Change `ping` command to only return the average response time from each instance.

**0.6.1** (Dec 2, 2014)

- Improve module loading routine. 1.5x speed improvement.
- Fix issue where tab/up/down/ctrl characters aren't rendered correctly in `ssh` command. Fixes [#26](https://github.com/andrewchilds/overcast/issues/26).

**0.6.0** (Nov 9, 2014)

- Improve `reboot` command by replacing fixed wait time with real connectivity testing. Fixes [#22](https://github.com/andrewchilds/overcast/issues/22) and [#23](https://github.com/andrewchilds/overcast/issues/23).
- Add `wait` command.
- Add `destroy` command, which maps to `[provider] destroy`.

**0.5.9** (Nov 3, 2014)

- Add `scriptvar` command.

**0.5.8** (Oct 23, 2014)

- Add `--machine-readable` option to `run` command.

**0.5.7** (Oct 23, 2014)

- Add `var list` command.

**0.5.6** (Oct 23, 2014)

- Add `var` command.

**0.5.5** (Sep 16, 2014)

- Fix issue around relative paths for push/pull commands. Fixes [#21](https://github.com/andrewchilds/overcast/issues/21).
- Add `install/imagemagick` script.

**0.5.4** (Jul 7, 2014)

- Allow `--ssh-key` args in digitalocean create command. Fixes [#19](https://github.com/andrewchilds/overcast/issues/19).

**0.5.3** (Jun 14, 2014)

- Allow programmatic usage in other node.js programs.

**0.5.2** (May 27, 2014)

- Fix issue with alternate pub keys in virtualbox create command.

**0.5.1** (May 22, 2014)

- Handle cases where SLACK_WEBHOOK_URL is missing.

**0.5.0** (May 22, 2014)

- Add `import` and `remove` alias commands.
