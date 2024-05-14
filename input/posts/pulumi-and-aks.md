---
title: Pulumi and AKS
description: Post about getting started with Pulumi and AKS
date: 2024-03-16
draft: true
tags:
  - pulumi
  - azure-kubernetes-service
---

Pulumi can help us to understand what resources are created in our Azure
subscription when we create a kubernetes cluster using Azure Kubernetes Service.

Let's create a kubernetes cluster using azure cli. I will follow [the tutorial in
AKS documentations](https://learn.microsoft.com/en-us/azure/aks/learn/quick-kubernetes-deploy-cli).

First create the resource group.

```bash
az group create --name rg-1 --location southeastasia
```

Then create the cluster.

```bash
az aks create --resource-group rg-1 \
  --name cluster-1 \
  --enable-managed-identity \
  --node-count 1 \
  --generate-ssh-keys
```

After a few minutes a cluster named `cluster-1` will be created.

To make sure that the cluster is created run the following command:

```bash
 az aks list -g rg-1 | jq '.[].name'
 ```

The output should show that there is a cluster named `cluster-1`.

Now I will create a new Pulumi project and import the cluster. I am using Python
as my programming language in Pulumi.

```bash
cd ~/repo
mkdir pulumi-aks && cd pulumi-aks
pulumi new azure-python -y
```

Pulumi will create a python program, yaml files for the stack and project
configuration, the dependecies list, and the virtual environment.

Next thing to do is to import the newly created cluster so that it can be managed by
pulumi. Check [the docs for ManagedCluster resource in Pulumi registry](https://www.pulumi.com/registry/packages/azure-native/api-docs/containerservice/managedcluster/).
In the import section there is a sample command to do the import.

```bash
pulumi import azure-native:containerservice:ManagedCluster clustername1 /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContainerService/managedClusters/{resourceName}
```

The information that we need are:
- `subscriptionId`
- `resourceGroupName`
- `resourceName`

Get the subscription Id using azure cli.

```bash
subscriptionId=$(az account show | jq -r '.id' )
```

Then run the import command.

```bash
pulumi import --out __main__.py \
  azure-native:containerservice:ManagedCluster \
  cluster-1 \
  "/subscriptions/$subscriptionId/resourceGroups/rg-1/providers/Microsoft.ContainerService/managedClusters/cluster-1"
```

Now file **__main__.py** contains the Pulumi code for the newly created cluster.

