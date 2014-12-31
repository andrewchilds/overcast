# Upgrading

```
npm -g update overcast
```

# Change Log

**0.6.3** (Dec 31, 2014)

- Rewrite `digitalocean` commands to use new standard provider API. Command options have been simplified, and allow for fuzzy matching of regions, images, and sizes based on ID, name, or slug.
- Add `digitalocean sync` command.
- Display raw rsync/scp commands before spawning processes in `push` and `pull` commands.

**0.6.2** (Dec 13, 2014)

- Rewrite every command except providers using new compact declarative syntax. Fixes #24. Providers are next.
- Improve `ssh` command to behave exactly like standalone SSH, by inheriting the existing terminal stdio.
- Change `import` command signature to expect an [ip] argument.
- Change `ping` command to only return the average response time from each instance.

**0.6.1** (Dec 2, 2014)

- Improve module loading routine. 1.5x speed improvement.
- Fix issue where tab/up/down/ctrl characters aren't rendered correctly in `ssh` command. Fixes #26.

**0.6.0** (Nov 9, 2014)

- Improve `reboot` command by replacing fixed wait time with real connectivity testing. Fixes #22 and #23.
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

- Fix issue around relative paths for push/pull commands. Fixes #21.
- Add `install/imagemagick` script.

**0.5.4** (Jul 7, 2014)

- Allow `--ssh-key` args in digitalocean create command. Fixes #19.

**0.5.3** (Jun 14, 2014)

- Allow programmatic usage in other node.js programs.

**0.5.2** (May 27, 2014)

- Fix issue with alternate pub keys in virtualbox create command.

**0.5.1** (May 22, 2014)

- Handle cases where SLACK_WEBHOOK_URL is missing.

**0.5.0** (May 22, 2014)

- Add `import` and `remove` alias commands.
