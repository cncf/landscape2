# Build linter
FROM rust:1-alpine3.18 as builder
RUN apk --no-cache add musl-dev perl make
WORKDIR /landscape2
COPY src ./
COPY build.rs ./
COPY askama.toml ./
COPY Cargo.* ./
WORKDIR /landscape2/src
RUN cargo build --release

# Final stage
FROM alpine:3.18.3
RUN addgroup -S landscape2 && adduser -S landscape2 -G landscape2
USER landscape2
WORKDIR /home/landscape2
COPY --from=builder /landscape2/target/release/landscape2 /usr/local/bin
