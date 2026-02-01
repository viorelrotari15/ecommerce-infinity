FROM grafana/xk6:latest AS builder
RUN xk6 build --with github.com/szkiba/xk6-prometheus@latest

FROM alpine:3.19
RUN adduser -D -u 10001 k6
COPY --from=builder /xk6/k6 /usr/bin/k6
USER k6
ENTRYPOINT ["k6"]
