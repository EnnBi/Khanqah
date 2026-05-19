.PHONY: run build test migrate-up migrate-down sqlc

run:
	go run ./cmd/server

build:
	go build -o bin/khanqah-api ./cmd/server

test:
	go test ./... -v

migrate-up:
	migrate -path migrations -database "$$DATABASE_URL" up

migrate-down:
	migrate -path migrations -database "$$DATABASE_URL" down 1

sqlc:
	sqlc generate -f internal/db/sqlc.yaml
