---
title: Replacing brew with nix
date: 2024-07-15
description: |
  Trying out nix and my experiment on using it to replace homebrew on MacOS
tags:
  - nix
  - package-manager
---

I've been meaning to try [nix][1] for a while now. I forgot when is the exact
time that I read about it for the first time but after reading a bit about it I
have this idea of using nix to replace Ansible for managing servers. In the
sense that configuring the server in a deterministic way.

So last weekend I tried it out. A couple reading materials that I use as the
guidance:

- [The tutorial from nix.dev](https://nix.dev/tutorials/first-steps/)
- [Zero to nix](https://zero-to-nix.com/)
- [Julia Evans' posts about nix](https://jvns.ca/categories/nix/)

Julia Evans' posts really help a lot. She wrote it in the perspective of a new
user. I can understand a few early pages in the tutorial on nix.dev and zero-to-nix
but after that I kind of get lost. Like it got complicated fast.

So I decided to take it easy. For now I am just using it to replace homebrew
as my machine's package manager. Two concerns that I have with installing packages
using nix:

- Is it safe?
- Does nix have all the packages that I need now and later on in the future?

For the first question I think, from the perspective of someone like me who
more often than not just blindly run `brew install a-package` up until now, it's
as safe as using brew. One thing that's neat with the nix package in nixos.org
is that there is a link to the source.

For example, the neovim package. At the time that I write this the source is
defined by [the package.nix file in nixpkgs repository in GitHub][2]. Granted that
currently I don't fully understand the file right now, but the more I learn nix
the more I can make sense of what makes a package as defined in the package.nix
file.

For the second question, so far I think nix have all the packages that I need.

So for now, anytime I want to install a package I just run `nix profile install`.


[1]: https://nixos.org/
[2]: https://github.com/NixOS/nixpkgs/blob/nixos-24.05/pkgs/by-name/ne/neovim-unwrapped/package.nix#L189

