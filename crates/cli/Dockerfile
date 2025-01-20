# Build CLI tool
FROM rust:1-alpine3.21 as builder
RUN apk --no-cache add musl-dev perl make libconfig-dev openssl-dev yarn wasm-pack binaryen
WORKDIR /landscape2
COPY crates crates
COPY ui ui
COPY Cargo.* ./
WORKDIR /landscape2/crates/cli
RUN cargo build --release

# Final stage
FROM alpine:3.21.2
RUN addgroup -S landscape2 && adduser -S landscape2 -G landscape2
RUN apk --no-cache add bash chromium font-ubuntu
USER landscape2
WORKDIR /home/landscape2
COPY --from=builder /landscape2/target/release/landscape2 /usr/local/bin
COPY scripts/landscape2-validate.sh /
