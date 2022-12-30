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
    org.opencontainers.image.description="This is a Kubescape Extension that secures your Kubernetes cluster." \
    org.opencontainers.image.vendor="Docker" \
    org.opencontainers.image.licenses="Apache-2.0" \
    com.docker.desktop.extension.icon="" \
    com.docker.desktop.extension.api.version=">= 0.2.3" \
    com.docker.extension.screenshots="" \
    com.docker.extension.detailed-description="" \
    com.docker.extension.publisher-url="" \
    com.docker.extension.additional-urls="" \
    com.docker.extension.changelog=""

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
