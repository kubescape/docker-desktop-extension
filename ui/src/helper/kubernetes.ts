import { v1 } from "@docker/extension-api-client-types";

export const DockerDesktop = "docker-desktop";
export const CurrentExtensionContext = "currentExtensionContext";
export const IsK8sEnabled = "isK8sEnabled";

const kubescapeReleaseName = "kubescape"

export const deployKubescapeHelm = async (ddClient: v1.DockerDesktopClient, accountID: string, accessKey: string) => {

  let output = await ddClient.extension.host?.cli.exec("helm", ["version"]);
  console.log(output);

  output = await ddClient.extension.host?.cli.exec(
    "helm", ["repo", "add", "kubescape", "https://kubescape.github.io/helm-charts/"]
  )
  console.log(output)

  output = await ddClient.extension.host?.cli.exec(
    "helm", ["repo", "update"]
  )
  console.log(output)

  output = await ddClient.extension.host?.cli.exec(
    "helm", [
    "upgrade",
    "--install", "kubescape", "kubescape/kubescape-operator",
    "-n", "kubescape",
    "--create-namespace",
    "--set", `account=${accountID}`,
    "--set", `accessKey=${accessKey}`,
    "--set", "clusterName=`kubectl config current-context`",
    "--set", "server=api.armosec.io",
  ]
  )
  console.log(output)
};

export const isKubescapeDeployed = async (ddClient: v1.DockerDesktopClient) => {
  let output = await ddClient.extension.host?.cli.exec("helm", ["list", "-q", "-n", "kubescape"]);
  console.log(output);
  return output?.stdout === kubescapeReleaseName + "\n"
};
