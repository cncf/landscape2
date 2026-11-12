# Build CLI tool
FROM rust:1.99.1-alpine3.24 AS builder
RUN apk --no-cache add musl-dev perl make yarn binaryen
# keep wasm-pack version in sync: ci.yml, .github/build-setup.yml, crates/cli/Dockerfile
# The checksums pin the official v0.15.1 release tarballs (upstream publishes
# no checksum file): update them together with the version
ARG WASM_PACK_VERSION=0.15.1
RUN set -eu; \
    arch="$(uname -m)"; \
    case "$arch" in \
      aarch64) sha256="7004853c7925ae1984033b5f25866ec604bbc921ef956d5e6c5595bc5af6d30c" ;; \
      x86_64) sha256="410101009739b9d01c7d5affaaad6e9c9a24b4cba6791a4805db8e89b9bf7af2" ;; \
      *) echo "unsupported architecture: $arch" >&2; exit 1 ;; \
    esac; \
    name="wasm-pack-v${WASM_PACK_VERSION}-${arch}-unknown-linux-musl"; \
    wget -q -O /tmp/wasm-pack.tar.gz "https://github.com/wasm-bindgen/wasm-pack/releases/download/v${WASM_PACK_VERSION}/${name}.tar.gz"; \
    printf '%s  %s\n' "$sha256" /tmp/wasm-pack.tar.gz > /tmp/wasm-pack.sha256; \
    sha256sum -c /tmp/wasm-pack.sha256; \
    tar -xzf /tmp/wasm-pack.tar.gz -C /tmp; \
    install -m 0755 "/tmp/${name}/wasm-pack" /usr/local/bin/wasm-pack; \
    rm -rf /tmp/wasm-pack.tar.gz /tmp/wasm-pack.sha256 "/tmp/${name}"
WORKDIR /landscape2
COPY crates crates
COPY ui ui
COPY Cargo.* ./
WORKDIR /landscape2/crates/cli
RUN cargo build --release --locked

# Final stage
FROM alpine:3.24.4
RUN addgroup -S landscape2 && adduser -S landscape2 -G landscape2
RUN apk --no-cache add bash chromium font-noto
USER landscape2
WORKDIR /home/landscape2
COPY --from=builder /landscape2/target/release/landscape2 /usr/local/bin
COPY scripts/landscape2-validate.sh /
