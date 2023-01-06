#syntax=docker/dockerfile:1.3-labs

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

# Download binaries for supported platforms and architectures
FROM alpine as binary-downloader
ARG TARGETARCH

RUN apk add curl

# Install Helm
RUN curl -L -o "helm-linux.tgz" "https://get.helm.sh/helm-v3.10.3-linux-${TARGETARCH}.tar.gz" \
    && mkdir -p /host-binaries/linux \
    && ls . \
    # Extract only the executable file to CWD without any directory structures
    && tar xzf "helm-linux.tgz" --strip-components=1 linux-${TARGETARCH}/helm \
    && chmod +x ./helm \
    && mv ./helm /host-binaries/linux \
    && ls .

RUN curl -L -o "helm-darwin.tgz" "https://get.helm.sh/helm-v3.10.3-darwin-${TARGETARCH}.tar.gz" \
    && mkdir -p /host-binaries/darwin \
    && tar xzf "helm-darwin.tgz" --strip-components=1 darwin-${TARGETARCH}/helm \
    && chmod +x ./helm \
    && mv ./helm /host-binaries/darwin

# Since Windows binaries are only available on `amd64`, download them only if
# `TARGETARCH` is `amd64`
RUN <<EOT ash
    if [ "amd64" = "$TARGETARCH" ]; then
      curl -L -o "helm-windows.tgz" "https://get.helm.sh/helm-v3.10.3-windows-${TARGETARCH}.tar.gz"
      mkdir -p /host-binaries/windows
      tar xzf "helm-windows.tgz" --strip-components=1 windows-${TARGETARCH}/helm.exe
      chmod +x ./helm.exe
      mv ./helm.exe /host-binaries/windows
    fi
EOT

FROM alpine
LABEL org.opencontainers.image.title="Kubescape" \
    org.opencontainers.image.description="Secure your Kubernetes cluster and gain insight into your cluster’s security posture via an easy-to-use online dashboard." \
    org.opencontainers.image.vendor="Kubescape" \
    org.opencontainers.image.licenses="Apache-2.0" \
    com.docker.desktop.extension.icon="https://raw.githubusercontent.com/cncf/artwork/ec3936fa0256c768b538247d20f130d293a9faed/projects/kubescape/stacked/color/kubescape-stacked-color.svg" \
    com.docker.desktop.extension.api.version=">= 0.2.3" \
    com.docker.extension.screenshots="[ { \"alt\": \"Kubescape Extension for Docker Desktop, initial screen\", \"url\": \"https://raw.githubusercontent.com/kubescape/docker-desktop-extension/main/docs/screenshots/dark-01.png\" }, { \"alt\": \"Kubescape Extension for Docker Desktop, Secure Your Cluster screen\", \"url\": \"https://raw.githubusercontent.com/kubescape/docker-desktop-extension/main/docs/screenshots/dark-02.png\" }, { \"alt\": \"Kubescape Extension for Docker Desktop, Cluster Secured screen\", \"url\": \"https://raw.githubusercontent.com/kubescape/docker-desktop-extension/main/docs/screenshots/dark-03.png\" } ]" \
    com.docker.extension.detailed-description="<h1>Kubescape Extension for Docker Desktop</h1> <p>Kubescape helps harden your Kubernetes cluster by providing insight into your cluster's security posture. Some of the features that help you achieve this are - regular configuration and image scans, visualizing your RBAC rules and suggesting automatic fixes where applicable. </p> <p> The Kubescape Extension for Docker Desktop works by installing the Kubescape in-cluster components, connecting them to ARMO Platform and providing insights into the Kubernetes cluster deployed by Docker Desktop via th dashboard on ARMO Platform." \
    com.docker.extension.publisher-url="https://cloud.armosec.io/" \
    com.docker.extension.additional-urls="" \
    com.docker.extension.changelog="" \
    com.docker.extension.account-info="required" \
    com.docker.extension.categories="kubernetes"

COPY metadata.json .
COPY kubescape-logo.svg .
COPY --from=client-builder /ui/build ui
COPY --from=binary-downloader /host-binaries/ /
