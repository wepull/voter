FROM golang:1.19.3-alpine3.16 as builder
LABEL maintainer="mgdevstack" \
    vendor="Zettabytes" \
    owner="zbio"
ADD main.go  .
COPY common /usr/local/go/src/github.com/roost-io/roost-example/voting_app/service-test-suite/common
COPY ballot /usr/local/go/src/github.com/roost-io/roost-example/voting_app/service-test-suite/ballot
RUN GO111MODULE=off CGO_ENABLED=0 GOFLAGS=-mod=vendor  GOPATH=/usr/local/go/src/ GOARCH=amd64 GOOS=linux go build -o app

FROM alpine:3.16
LABEL maintainer="mgdevstack" \
    vendor="Zettabytes" \
    owner="zbio"
COPY --from=builder /go/app /app
ENTRYPOINT ["/app"]
