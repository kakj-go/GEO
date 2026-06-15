# Step 1: Modules caching
FROM golang:1.25-alpine3.21 AS modules

COPY go.mod go.sum /modules/

WORKDIR /modules

RUN go mod download

# Step 2: Builder
FROM golang:1.25-alpine3.21 AS builder

COPY --from=modules /go/pkg /go/pkg
COPY . /app

WORKDIR /app

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -o /bin/app ./cmd/app

# Step 3: Final
FROM alpine:3.21

# 安装时区数据和 CA 证书
RUN apk add --no-cache ca-certificates tzdata \
    && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone

# 创建非 root 用户
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# 创建应用目录和素材库存储目录
RUN mkdir -p /app/data && chown -R appuser:appgroup /app

COPY --from=builder /app/config /config
COPY --from=builder /app/migrations /migrations
COPY --from=builder /bin/app /app/superlink

# 确保素材库目录权限正确
RUN chown -R appuser:appgroup /app

USER appuser

WORKDIR /app

EXPOSE 8080

CMD ["/app/superlink"]
