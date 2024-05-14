---
title: Using Pulumi with multiple AWS accounts and S3 backend
date: 2023-12-24
tags:
  - pulumi
---

The way I usually use [Terraform][terraform] is by storing each environment's state
in different buckets. So the state for my development environment will be stored
in an S3 bucket in the AWS account for development and the state for my staging
environment will be stored in an S3 bucket in the staging account. The same thing
with my production environment.

I just started using [Pulumi][pulumi] for about 3 weeks now and I tried to do
the same thing. I got confused trying to figure out how to do it the same way I
do it with Terraform. So, I searched online on how to do that and I found [an
issue in GitHub][github-issue-1]. [A Pulumi engineer suggested the
OP][github-comment-1] to use environment variable to switch between backends.

I think it is feasible to do that. Anytime you want to change stack, for example
to production stack, you then need to do:

```bash
export PULUMI_BACKEND_URL="s3://bucket-for-pulumi-production"
pulumi stack select production
```

I might also create a function to do that, add it into my bash profile, so that
instead of running 2 commands I can just run the function.

But then I thought "Why not just use the same backend for all stacks?". I think
it's simpler. I only then need to find a way to tell Pulumi to which AWS account
a stack refers to, since my resources are separated into different AWS accounts
based on the environment.

So I have `~/.aws/config` file like this:

```toml
[profile org-dev]
...

[profile org-staging]
...

[profile org-production]
...

```

with **org-dev**, **org-staging**, and **org-production** as AWS profiles for your
work's development, staging, and production environments respectively. I need
to define this AWS profile as a config for my Pulumi stack. We can do this
using `pulumi config` command ([docs][pulumi-config]).

So, for example I have a stack named **development**, then I run:

```bash
pulumi stack select development
pulumi config set aws:profile org-dev
```

This way, anytime I am using **development** stack, Pulumi knows that I am
managing resources in **org-dev** AWS profile.

Also to tell Pulumi that I want to have my backend in a bucket in my production
AWS account I need to add this line in `Pulumi.yaml` file:

```yaml
....
backend:
  url: s3://bucket-for-pulumi-state?region=my-region&awssdk=v2&profile=org-production
....
```

That's it. Pulumi now knows where I store the state and using which AWS account.
Also it knows a stack refers to resources in which AWS account.

[terraform]: https://www.terraform.io/
[pulumi]: https://pulumi.com
[pulumi-stack]: https://www.pulumi.com/docs/concepts/stack/
[pulumi-config]: https://www.pulumi.com/docs/cli/commands/pulumi_config/
[github-issue-1]: https://github.com/pulumi/pulumi/issues/3567
[github-comment-1]: https://github.com/pulumi/pulumi/issues/11182#issuecomment-1297367585
