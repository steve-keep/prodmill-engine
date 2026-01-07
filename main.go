package main

import (
	"fmt"
	"os"

	"github.com/steve-keep/prodmill-engine/internal"
)

func main() {
	mode := os.Getenv("INPUT_MODE")
	if mode == "" {
		fmt.Println("::error title=Missing Input::Missing required 'mode' input.")
		os.Exit(1)
	}

	fmt.Printf("Prod-Mill Engine started in %s mode.\n", mode)

	var err error
	switch mode {
	case "create-spec":
		err = internal.RunCreateSpec()
	case "create-plan":
		err = internal.RunCreatePlan()
	case "create-tasks":
		err = internal.RunCreateTasks()
	case "update-constitution":
		err = internal.RunUpdateConstitution()
	case "next-task":
		err = internal.RunNextTask()
	case "update-spec-list":
		err = internal.RunUpdateSpecList()
	default:
		fmt.Printf("::error title=Invalid Mode::Invalid mode: %s\n", mode)
		os.Exit(1)
	}

	if err != nil {
		fmt.Printf("::error title=Action Failed in %s mode::%v\n", mode, err)
		os.Exit(1)
	}
}
