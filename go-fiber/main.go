package main

import (
	"errors"
	"log"
	"os"
	"sort"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/csrf"
	"github.com/gofiber/fiber/v2/middleware/session"
	"github.com/gofiber/storage/redis/v3"
)

// fake user db
type User struct {
	Username string
	Password string
	Roles    []string
}

// thingamabob db
type Thingamabob struct {
	Name string `json:"name"`
}

var (
	ErrRedisConnStr = errors.New("invalid Redis connection string")

	usersDB = map[string]User{
		"admin": {
			Password: "admin",
			Roles:    []string{"admin", "user"},
		},
		"user": {
			Password: "user",
			Roles:    []string{"user"},
		},
	}

	thingamabobDB = map[int]Thingamabob{
		1: {
			Name: "Thingamabob 1",
		},
		2: {
			Name: "Thingamabob 2",
		},
	}
)

func main() {
	app := fiber.New()

	// Create a new session manager
	var store *session.Store

	// Check for a session store env var
	sessionStoreEnv := os.Getenv("SESSION_STORE")
	if strings.HasPrefix(sessionStoreEnv, "redis://") {
		log.Println("Using Redis session store")
		// Parse the Redis connection string
		host, port, db, err := parseRedisConnStr(sessionStoreEnv)
		if err != nil {
			log.Printf("Error parsing Redis connection string: %v", err)
			return
		}

		// Create a new Redis store
		storage := redis.New(redis.Config{
			Host:     host,
			Port:     port,
			Database: db,
		})

		store = session.New(session.Config{
			Storage: storage,
		})
	} else {
		log.Println("Using in-memory session store")
		// Create a new in-memory store
		// you could use other stores as well, see the list of stores here:
		//
		// https://docs.gofiber.io/api/middleware/session#config
		//
		store = session.New()
	}

	// Create a new CSRF middleware
	csrfConfig := csrf.Config{
		CookieSameSite: "Lax",
		CookieSecure:   false, // Set to true in production
		CookieHTTPOnly: false, // To allow JS to read the CSRF cookie
		Session:        store,
	}

	app.Use(csrf.New(csrfConfig))

	app.Get("/api/" /* csrf.New(csrfConfig) */, func(c *fiber.Ctx) error {
		return c.SendString("Hello, World 👋!")
	})

	// Define a route to handle the login request
	app.Post("/api/auth/login", func(c *fiber.Ctx) error {
		// Check for a session
		sess, err := store.Get(c)
		if err != nil {
			return c.SendStatus(fiber.StatusInternalServerError)
		}

		type request struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}

		// Parse body into request struct
		var body request
		if err := c.BodyParser(&body); err != nil {
			return c.SendStatus(fiber.StatusBadRequest)
		}

		// this is just a simulated login do this securly with hashing and take measures to prevent timing attacks
		if user, ok := usersDB[body.Username]; ok {
			if user.Password == body.Password {
				// Set session values
				sess.Set("loggedIn", true)
				sess.Set("username", body.Username)
				sess.Set("roles", user.Roles)

				// Save the session
				if err := sess.Save(); err != nil {
					return c.SendStatus(fiber.StatusInternalServerError)
				}

				return c.JSON(fiber.Map{
					"loggedIn": true,
					"username": body.Username,
					"roles":    user.Roles,
				})
			}
		}

		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"loggedIn": false,
		})

	})

	// Define a route to handle the logout request
	app.Post("/api/auth/logout", func(c *fiber.Ctx) error {
		// Check for a session
		sess, err := store.Get(c)
		if err != nil {
			return c.SendStatus(fiber.StatusInternalServerError)
		}

		// Destroy the session
		if err := sess.Destroy(); err != nil {
			return c.SendStatus(fiber.StatusInternalServerError)
		}

		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"loggedIn": false,
		})
	})

	// Define a route to handle the auth status request
	app.Get("/api/auth/status", func(c *fiber.Ctx) error {
		// Check for a session
		sess, err := store.Get(c)
		if err != nil {
			return c.SendStatus(fiber.StatusInternalServerError)
		}

		// Get the session values
		if v, ok := sess.Get("loggedIn").(bool); !ok || !v {
			return c.JSON(fiber.Map{
				"loggedIn": false,
			})
		}

		username := sess.Get("username")
		roles := sess.Get("roles")

		return c.JSON(fiber.Map{
			"loggedIn": true,
			"username": username,
			"roles":    roles,
		})
	})

	app.Get("/api/thingamabob", func(c *fiber.Ctx) error {
		// Check for a session
		sess, err := store.Get(c)
		if err != nil {
			return c.SendStatus(fiber.StatusInternalServerError)
		}

		// Any logged in user can get thingamabobs
		if v, ok := sess.Get("loggedIn").(bool); !ok || !v {
			// Return a 401 status
			return c.SendStatus(fiber.StatusUnauthorized)
		}

		type response struct {
			ID   int    `json:"id"`
			Name string `json:"name"`
		}

		rows := make([]response, 0, len(thingamabobDB))
		for id, thingamabob := range thingamabobDB {
			rows = append(rows, response{
				ID:   id,
				Name: thingamabob.Name,
			})
		}

		// sort by id, ascending
		sort.Slice(rows, func(i, j int) bool {
			return rows[i].ID < rows[j].ID
		})

		return c.JSON(rows)
	})

	app.Get("/api/thingamabob/:id", func(c *fiber.Ctx) error {
		// Check for a session
		sess, err := store.Get(c)
		if err != nil {
			return c.SendStatus(fiber.StatusInternalServerError)
		}

		// Any logged in user can get thingamabobs
		if v, ok := sess.Get("loggedIn").(bool); !ok || !v {
			// Return a 401 status
			return c.SendStatus(fiber.StatusUnauthorized)
		}

		// Check for id param
		paramID := c.Params("id")
		id, err := strconv.Atoi(paramID)
		if err != nil {
			return c.SendStatus(fiber.StatusBadRequest)
		}

		if thingamabob, ok := thingamabobDB[id]; ok {
			return c.JSON(fiber.Map{
				"id":   id,
				"name": thingamabob.Name,
			})
		}

		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"message": "Thingamabob not found",
		})
	})

	app.Post("/api/thingamabob", func(c *fiber.Ctx) error {
		// Check for a session
		sess, err := store.Get(c)
		if err != nil {
			return c.SendStatus(fiber.StatusInternalServerError)
		}

		// Only admins can create thingamabobs
		if v, ok := sess.Get("loggedIn").(bool); !ok || !v {
			// Return a 401 status
			return c.SendStatus(fiber.StatusUnauthorized)
		}

		// Check for admin role
		if roles, ok := sess.Get("roles").([]string); !ok || !contains(roles, "admin") {
			// Return a 401 status
			return c.SendStatus(fiber.StatusUnauthorized)
		}

		type request struct {
			Name string `json:"name"`
		}

		// Parse body into request struct
		var body request
		if err := c.BodyParser(&body); err != nil {
			return c.SendStatus(fiber.StatusBadRequest)
		}

		// Create a new thingamabob
		id := len(thingamabobDB) + 1
		thingamabobDB[id] = Thingamabob(body)

		return c.JSON(fiber.Map{
			"id":   id,
			"name": body.Name,
		})
	})

	app.Put("/api/thingamabob/:id", func(c *fiber.Ctx) error {
		// Check for a session
		sess, err := store.Get(c)
		if err != nil {
			return c.SendStatus(fiber.StatusInternalServerError)
		}

		// Only admins can update thingamabobs
		if v, ok := sess.Get("loggedIn").(bool); !ok || !v {
			// Return a 401 status
			return c.SendStatus(fiber.StatusUnauthorized)
		}

		// Check for admin role
		if roles, ok := sess.Get("roles").([]string); !ok || !contains(roles, "admin") {
			// Return a 401 status
			return c.SendStatus(fiber.StatusUnauthorized)
		}

		// Check for id param
		paramID := c.Params("id")

		// If the id param is not set, return an error
		if paramID == "" {
			return c.SendStatus(fiber.StatusBadRequest)
		}

		// Update the thingamabob
		if id, err := strconv.Atoi(paramID); err != nil {
			return c.SendStatus(fiber.StatusBadRequest)
		} else if thingamabob, ok := thingamabobDB[id]; ok {
			type request struct {
				Name string `json:"name"`
			}

			// Parse body into request struct
			var body request
			if err := c.BodyParser(&body); err != nil {
				return c.SendStatus(fiber.StatusBadRequest)
			}

			thingamabob.Name = body.Name
			thingamabobDB[id] = thingamabob

			return c.JSON(fiber.Map{
				"id":   id,
				"name": body.Name,
			})
		}

		return c.SendStatus(fiber.StatusNotFound)
	})

	app.Delete("/api/thingamabob/:id", func(c *fiber.Ctx) error {
		// Check for a session
		sess, err := store.Get(c)
		if err != nil {
			return c.SendStatus(fiber.StatusInternalServerError)
		}

		// Only admins can delete thingamabobs
		if v, ok := sess.Get("loggedIn").(bool); !ok || !v {
			// Return a 401 status
			return c.SendStatus(fiber.StatusUnauthorized)
		}

		// Check for admin role
		if roles, ok := sess.Get("roles").([]string); !ok || !contains(roles, "admin") {
			// Return a 401 status
			return c.SendStatus(fiber.StatusUnauthorized)
		}

		// Check for id param
		paramID := c.Params("id")

		// If the id param is not set, return an error
		if paramID == "" {
			return c.SendStatus(fiber.StatusBadRequest)
		}

		// Delete the thingamabob
		if id, err := strconv.Atoi(paramID); err != nil {
			return c.SendStatus(fiber.StatusBadRequest)
		} else if _, ok := thingamabobDB[id]; ok {
			delete(thingamabobDB, id)
			return c.SendStatus(fiber.StatusNoContent)
		}

		return c.SendStatus(fiber.StatusNotFound)
	})

	// Start the Fiber app
	_ = app.Listen(":3001")
}

// Helper function to check if a slice contains a string
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}

	return false
}

// Helper function to parse a Redis connection string
// format redis://host:port/db
func parseRedisConnStr(connStr string) (host string, port int, db int, err error) {
	// Remove the redis:// prefix
	connStr = strings.TrimPrefix(connStr, "redis://")

	// Split the connection string into host:port/db
	parts := strings.Split(connStr, "/")
	if len(parts) != 2 {
		err = ErrRedisConnStr
		return
	}

	// Split the host:port part
	hostPort := strings.Split(parts[0], ":")
	if len(hostPort) != 2 {
		err = ErrRedisConnStr
		return
	}

	// Parse the port
	port, err = strconv.Atoi(hostPort[1])
	if err != nil {
		return
	}

	// Parse the db
	db, err = strconv.Atoi(parts[1])
	if err != nil {
		return
	}

	host = hostPort[0]
	return
}
