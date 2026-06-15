package main

import (
	"fmt"
	"log"

	"github.com/joho/godotenv"
	"github.com/kakj-go/llm_reference_matrix/config"
	"github.com/kakj-go/llm_reference_matrix/internal/app"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		fmt.Println("Error loading .env file")
	}

	// Configuration
	cfg, err := config.NewConfig()
	if err != nil {
		log.Fatalf("Config error: %s", err)
	}

	// Run
	app.Run(cfg)
}
