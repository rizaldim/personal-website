---
title: AWS SDK Authentication on application running in Azure Kubernetes Service (Part 1)
description: Story about how I run AWS SDK in AKS at work
date: 2024-04-07
draft: false
tags:
  - aws-sdk
  - azure-kubernetes-service
---

I am in the progress of moving our services from AWS ECS to Azure Kubernetes
Service (AKS). One of the problems that I encountered is how to use AWS SDK
from AKS, meaning how my services can authenticate itself to AWS. In ECS it was
done by assigning IAM role to my task in ECS service. After researching about
this, these are my options:

- using access keys
- using OpenID Connect (OIDC)
- using IAM Roles Anywhere (abbreviated to IRAw, not official abbreviation from AWS, just to save me from typing too long)

[This page in AWS SDK docs](https://docs.aws.amazon.com/sdkref/latest/guide/standardized-credentials.html)
lists AWS SDK standardized credential providers.

## Using access keys

This is probably the easiest way to set up and less hassle. But using access keys
is considered to be the least secure one out of the three. Also, the engineer
before me set up our AWS accounts so that we can't create an account with access
keys. The secure and correct way. It would be really wrong for me to undo that
policy just because I don't bother to choose better ways.

## Using OpenID Connect

Between using OIDC and IRAw, from my research I found out that IRAw is the most
recommended one. This is mentioned in [AWS IAM best
practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#bp-workloads-use-roles).
But the problem is to use this I need to set up stuffs related to certificates,
which I try to avoid. So I decided to go with OIDC.

So I did more research and found that to go this route the solution will comprise
of the combination of the followings:

- [creating OIDC provider in my AWS](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)
- [editing my services' IAM roles to trust OIDC](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html)
- [using Entra Workload ID in my AKS cluster](https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview?tabs=dotnet)
- [using workload identity in my application in AKS](https://learn.microsoft.com/en-us/azure/aks/learn/tutorial-kubernetes-workload-identity)

The last item above actually consists of:

- Creating a managed identity for each application
- Creating a service account object in kubernetes and in the service account add an annotation
 with the key `azure.workload.identity/client-id` and setting its value to the managed identity's client ID
- Creating a federated identity credential for the managed identity with the subject of
 the credential referring to the service account's name and namespace
- Configuring the pod to use the service account and adding label
 `azure.workload.identity/use` in the pod and set it to `'true'`.

It's a lot of things but I understand what I am setting up and what it's for.
Anytime I encounter an issue I will check all of those things. Also I use
Pulumi to help with creating required things on the AWS side (editing AWS IAM
roles' trust policy) and the Azure side (managed identities and federated
credentials), which makes this setup a bit easier. Also I found that there is a
limitation on using Pulumi to manage OIDC provider in AWS. Maybe I will write
about that later.

## The code

After setting all of those now anytime I run the pod, AKS will automatically
set up all required Azure credentials in my container in the environment
variables. In short the way how this all works is:

- The app in the pod get an Azure identity
- With the help of federated identity credential the app can contact AWS OpenID Connect provider
- Using that provider, the app can assume the intended AWS IAM Role that has been set up to trust it

To understand more about how it works, let's check [Azure
documentation about using workload identity in AKS](
https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview?tabs=javascript)
the page provides a sample code:

```javascript
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";

const main = async () => {
    const keyVaultUrl = process.env["KEYVAULT_URL"];
    const secretName = process.env["SECRET_NAME"];

    const credential = new DefaultAzureCredential();
    const client = new SecretClient(keyVaultUrl, credential);

    const secret = await client.getSecret(secretName);
}

main().catch((error) => {
    console.error("An error occurred:", error);
    process.exit(1);
});
```

The code shows how to get Azure credential and then use that to access secret
key in Azure Key Vault. What interests me is how to get the Azure credentials.
The main thing here is using that class, `DefaultAzureCredential`, to get
the credential. This is from [the documentation](
https://learn.microsoft.com/en-us/javascript/api/@azure/identity/defaultazurecredential?view=azure-node-latest#constructor-details):

> This credential provides a default ChainedTokenCredential configuration that should work for most applications that use the Azure SDK.
>
> The following credential types will be tried, in order:

>    - EnvironmentCredential
>    - WorkloadIdentityCredential
>    - ManagedIdentityCredential
>    - AzureCliCredential
>    - AzurePowerShellCredential
>    - AzureDeveloperCliCredential

Using Entra Workload ID in AKS will automatically configure required stuffs to use
the second item in that credential list, `WorkloadIdentityCredential`. [The documentation
for that class in the .NET AWS SDK](
https://learn.microsoft.com/en-us/dotnet/api/azure.identity.workloadidentitycredential?view=azure-dotnet#constructors)
provide me with the details that I was looking for.

> Creates a new instance of the `WorkloadIdentityCredential` with the default options.
> When no options are specified `AZURE_TENANT_ID`, `AZURE_CLIENT_ID` and
> `AZURE_FEDERATED_TOKEN_FILE` must be specified in the environment.

Then with all those things configured, by the help of `kubectl exec` I can check
the environment variable of my app's container. Sure enough I found that
`AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, and `AZURE_FEDERATED_TOKEN_FILE` environment
variables were all set up automatically. The `AZURE_FEDERATED_TOKEN_FILE` value
is a path to a file injected by AKS, which contains a token that I assume is
required to make all this works.

So how to connect all these to be able to authenticate to AWS? The `DefaultAzureCredential`
class has a method `getToken`, which I assume is for getting an OIDC token or
something along that line to authenticate to AWS. One thing to note, which I found
after some trial and errors, is that if you are using client ID to get the token,
you need to do it this way:

```javascript
const azureClientId = process.env['AZURE_CLIENT_ID'];
const credential = new DefaultAzureCredential();
const token = await credential.getToken(`${azureClientId}/.default`);
```

The key is the `/.default` part. It doesn't work without it. This token
can be used to authenticate the AWS SDK client, for example S3 client, like
this:

```javascript
import { S3Client } from '@aws-sdk/client-s3';
import { fromWebToken } from '@aws-sdk/credential-providers';

// The value for `token` is the one from the previous sample code
const client = new S3Client({
	region: process.env['AWS_REGION'],
	credentials: fromWebToken({
		roleArn: process.env['AWS_IAM_ROLE_ARN'],
		webIdentityToken: token
	})
});
```

At first we (my team and I) are quite content with this solution. We only need
to add some code to refresh the token since the token itself will expire in 24
hours. Then we were done. We implemented it to a couple of services and
deployed the services to staging environment. But then we found the problem.

## The problem with using OIDC

After implementing this new way in staging environment for a couple of services
we found that there is a big problem with this solution. The latency are worse.
More-than-few-seconds worse. There is an endpoint in one of our services that
needs to call S3 and Textract service. When deployed in ECS, this service's
latency is around 1-2 seconds. When deployed in AKS, it is now 6-8 seconds. We
found that before doing the API call to S3 and Textract, the AWS SDK calls the
AWS Security Token Service (STS). Make sense since it probably needs to do it
to verify the token. What surprised us was the latency for that STS call is
around 1.5 seconds. Multiply that by two, we got 3-4 seconds for verifying
token only. We must have missed something.

There must be a way to do this, I think. Maybe we can cache that call or something.
Or maybe there is a configuration for the SDK to bypass this or something like that.
But I couldn't find it. Or maybe I can find it if I spent more time
researching it. But I didn't because I remembered that OIDC is not the recommended
way for this. I thought, yeah, maybe this is why it's not recommended.

I propose two solutions to my coworkers. First option is we create a new
service, deployed in AWS, as some kind of gateway for all other services to
access AWS API. But this is more work for the developers. Not something that I
would like for them to do. Migration like this should be more works for the ops
team, I think. Which brings me to the second option, which is something that I avoid to
do the first place and something that's recommended by IAM best practice: using
IAM Roles Anywhere.

(To be continued in part 2)

