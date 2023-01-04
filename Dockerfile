FROM --platform=$BUILDPLATFORM node:18.3.0-alpine3.16 AS client-builder

WORKDIR /ui

# cache packages in layer
COPY ui/package.json /ui/package.json
COPY ui/package-lock.json /ui/package-lock.json

RUN --mount=type=cache,target=/usr/src/app/.npm \
    npm set cache /usr/src/app/.npm && \
    npm ci

# install
COPY ui /ui
RUN npm run build

FROM alpine
LABEL org.opencontainers.image.title="Kubescape" \
    org.opencontainers.image.description="Secure your Kubernetes cluster and gain insight into your cluster’s security status via an easy-to-use online dashboard." \
    org.opencontainers.image.vendor="Kubescape" \
    org.opencontainers.image.licenses="Apache-2.0" \
    com.docker.desktop.extension.icon="https://raw.githubusercontent.com/cncf/artwork/ec3936fa0256c768b538247d20f130d293a9faed/projects/kubescape/stacked/color/kubescape-stacked-color.svg" \
    com.docker.desktop.extension.api.version=">= 0.2.3" \
    com.docker.extension.screenshots="[ { \"alt\": \"Kubescape Extension for Docker Desktop, initial screen\", \"url\": \"https://raw.githubusercontent.com/kubescape/docker-desktop-extension/main/docs/screenshots/dark-01.png\" }, { \"alt\": \"Kubescape Extension for Docker Desktop, Secure Your Cluster screen\", \"url\": \"https://raw.githubusercontent.com/kubescape/docker-desktop-extension/main/docs/screenshots/dark-02.png\" }, { \"alt\": \"Kubescape Extension for Docker Desktop, Cluster Secured screen\", \"url\": \"https://raw.githubusercontent.com/kubescape/docker-desktop-extension/main/docs/screenshots/dark-03.png\" } ]" \
    com.docker.extension.detailed-description="<h1>Kubescape Extension for Docker Desktop</h1> <p> Kubescape helps elevate the security of your Kubernetes clusters by providing insight into your cluster’s security, running regular configuration and image scans, visualizing your RBAC rules and suggesting automatic fixes where applicable. </p> <p> The Kubescape Extension for Docker Desktop works by installing the Kubescape in-cluster components, connecting them to its cloud offering — ARMO Platform — and providing insights into the Kubernetes cluster deployed by Docker Desktop via the online dashboard. </p> <h2>Key Features</h2> The Kubescape platform: <ol> <li>Scans Kubernetes resources in the cluster according to frameworks like NSA-CISA, MITRE ATT&CK etc.</li> <li>Scans images deployed in the cluster for vulnerabilities</li> <li>Visualizes RBAC rules</li> <li>Calculates the Risk Score for clusters</li> <li>Shows risk trends over time</li> <ol>" \
    com.docker.extension.publisher-url="https://cloud.armosec.io/" \
    com.docker.extension.additional-urls="" \
    com.docker.extension.changelog="" \
    com.docker.extension.account-info="required" \
    com.docker.extension.categories="kubernetes"

RUN apk add curl

# Install Helm
RUN curl -L -o "helm-linux.tgz" "https://get.helm.sh/helm-v3.10.3-linux-amd64.tar.gz" \
    && mkdir -p /linux \
    && ls . \
    # Extract only the executable file to CWD without any directory structures
    && tar xzf "helm-linux.tgz" --strip-components=1 linux-amd64/helm \
    && chmod +x ./helm && mv ./helm /linux \
    && ls .

RUN curl -L -o "helm-darwin.tgz" "https://get.helm.sh/helm-v3.10.3-darwin-amd64.tar.gz" \
    && mkdir -p /darwin \
    && tar xzf "helm-darwin.tgz" --strip-components=1 darwin-amd64/helm \
    && chmod +x ./helm && mv ./helm /darwin

RUN curl -L -o "helm-windows.tgz" "https://get.helm.sh/helm-v3.10.3-windows-amd64.tar.gz" \
    && mkdir -p /windows \
    && tar xzf "helm-windows.tgz" --strip-components=1 windows-amd64/helm.exe \
    && chmod +x ./helm.exe && mv ./helm.exe /windows

COPY metadata.json .
COPY kubescape-logo.svg .
COPY --from=client-builder /ui/build ui
