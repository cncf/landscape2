# Build CLI tool
FROM rust:1-alpine3.18 as builder
RUN apk --no-cache add musl-dev perl make libconfig-dev openssl-dev yarn
WORKDIR /landscape2
COPY embed embed
COPY src src
COPY templates templates
COPY web web
COPY build.rs ./
COPY askama.toml ./
COPY Cargo.* ./
WORKDIR /landscape2/src
RUN cargo build --release

# Final stage
FROM alpine:3.18.4
RUN addgroup -S landscape2 && adduser -S landscape2 -G landscape2
RUN apk --no-cache add bash chromium font-ubuntu
USER landscape2
WORKDIR /home/landscape2
COPY --from=builder /landscape2/target/release/landscape2 /usr/local/bin
COPY scripts/landscape2-validate.sh /
