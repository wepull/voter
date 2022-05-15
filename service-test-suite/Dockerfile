FROM golang:alpine as builder
LABEL maintainer="mgdevstack" \
    vendor="Zettabytes" \
    owner="zbio"
ADD main.go  .
COPY common /usr/local/go/src/github.com/roost-io/roost-example/voting_app/service-test-suite/common
COPY ballot /usr/local/go/src/github.com/roost-io/roost-example/voting_app/service-test-suite/ballot
RUN GO111MODULE=off CGO_ENABLED=0 GOFLAGS=-mod=vendor  GOPATH=/usr/local/go/src/ GOARCH=amd64 GOOS=linux go build -o app

FROM alpine
LABEL maintainer="mgdevstack" \
    vendor="Zettabytes" \
    owner="zbio"
COPY --from=builder /go/app /app
ENTRYPOINT ["/app"]
