package main

import (
	"errors"
	"log"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/csrf"
	"github.com/gofiber/fiber/v2/middleware/session"
	"github.com/gofiber/storage/redis/v3"
)

// User represents a user in the system
type User struct {
	Username string
	Password string
	Roles    []string
}

// Thingamabob represents a thingamabob in the system
type Thingamabob struct {
	Name string `json:"name"`
}

var (
	ErrRedisConnStr = errors.New("invalid Redis connection string")

	//Fake DBs
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
		1: {Name: "Thingamabob 1"},
		2: {Name: "Thingamabob 2"},
	}

	thingamabobID = 3

	thingamabobMux = &sync.RWMutex{}
)

func main() {
	app := fiber.New()

	// Create a new session manager
	store := createSessionStore()

	// Create a new CSRF middleware
	csrfConfig := csrf.Config{
		CookieSameSite: "Lax",
		CookieSecure:   false, // Set to true in production
		CookieHTTPOnly: false, // To allow JS to read the CSRF cookie
		Session:        store,
	}

	app.Use(csrf.New(csrfConfig))

	app.Get("/api/", func(c *fiber.Ctx) error {
		return c.SendString("Hello, World 👋!")
	})

	// Auth routes
	setupAuthRoutes(app, store)

	// Thingamabob routes
	setupThingamabobRoutes(app, store)

	// Start the Fiber app
	_ = app.Listen(":3001")
}

func createSessionStore() *session.Store {
	var store *session.Store

	// Check for a session store env var
	sessionStoreEnv := os.Getenv("SESSION_STORE")
	if strings.HasPrefix(sessionStoreEnv, "redis://") {
		log.Println("Using Redis session store")
		store = createRedisSessionStore(sessionStoreEnv)
	} else {
		log.Println("Using in-memory session store")
		store = session.New()
	}

	return store
}

func createRedisSessionStore(redisConnStr string) *session.Store {
	// Parse the Redis connection string
	host, port, db, err := parseRedisConnStr(redisConnStr)
	if err != nil {
		// Log and exit on error
		log.Fatal("Error parsing Redis connection string: ", err)
	}

	// Create a new Redis store
	storage := redis.New(redis.Config{
		Host:     host,
		Port:     port,
		Database: db,
	})

	return session.New(session.Config{
		Storage: storage,
	})
}

func setupAuthRoutes(app *fiber.App, store *session.Store) {
	app.Post("/api/auth/login", handleLogin(store))
	app.Post("/api/auth/logout", handleLogout(store))
	app.Get("/api/auth/status", handleAuthStatus(store))
}

func handleLogin(store *session.Store) fiber.Handler {
	return func(c *fiber.Ctx) error {
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

		// Simulated login - should be replaced with secure authentication logic
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
	}
}

func handleLogout(store *session.Store) fiber.Handler {
	return func(c *fiber.Ctx) error {
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
	}
}

func handleAuthStatus(store *session.Store) fiber.Handler {
	return func(c *fiber.Ctx) error {
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
	}
}

func setupThingamabobRoutes(app *fiber.App, store *session.Store) {
	app.Get("/api/thingamabob", requireAuth(store), getThingamabobs)
	app.Get("/api/thingamabob/:id", requireAuth(store), getThingamabob)
	app.Post("/api/thingamabob", requireAuth(store, "admin"), createThingamabob)
	app.Put("/api/thingamabob/:id", requireAuth(store, "admin"), updateThingamabob)
	app.Delete("/api/thingamabob/:id", requireAuth(store, "admin"), deleteThingamabob)
}

func getThingamabobs(c *fiber.Ctx) error {
	type response struct {
		ID   int    `json:"id"`
		Name string `json:"name"`
	}

	// Lock the mutex before reading the thingamabob DB
	thingamabobMux.RLock()
	defer thingamabobMux.RUnlock()

	rows := make([]response, 0, len(thingamabobDB))
	for id, thingamabob := range thingamabobDB {
		rows = append(rows, response{
			ID:   id,
			Name: thingamabob.Name,
		})
	}

	// Sort by id, ascending
	sort.Slice(rows, func(i, j int) bool {
		return rows[i].ID < rows[j].ID
	})

	return c.JSON(rows)
}

func getThingamabob(c *fiber.Ctx) error {
	// Check for id param
	paramID := c.Params("id")
	id, err := strconv.Atoi(paramID)
	if err != nil {
		return c.SendStatus(fiber.StatusBadRequest)
	}

	// Lock the mutex before reading the thingamabob DB
	thingamabobMux.RLock()
	defer thingamabobMux.RUnlock()

	if thingamabob, ok := thingamabobDB[id]; ok {
		return c.JSON(fiber.Map{
			"id":   id,
			"name": thingamabob.Name,
		})
	}

	return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
		"message": "Thingamabob not found",
	})
}

func createThingamabob(c *fiber.Ctx) error {
	type request struct {
		Name string `json:"name"`
	}

	// Parse body into request struct
	var body request
	if err := c.BodyParser(&body); err != nil {
		return c.SendStatus(fiber.StatusBadRequest)
	}

	// Lock the mutex before creating a new thingamabob and incrementing the ID
	thingamabobMux.Lock()
	defer thingamabobMux.Unlock()

	// Create a new thingamabob
	thingamabobDB[thingamabobID] = Thingamabob(body)

	// Increment the thingamabob ID
	thisID := thingamabobID
	thingamabobID++

	return c.JSON(fiber.Map{
		"id":   thisID,
		"name": body.Name,
	})
}

func updateThingamabob(c *fiber.Ctx) error {
	// Check for id param
	paramID := c.Params("id")

	// If the id param is not set, return an error
	if paramID == "" {
		return c.SendStatus(fiber.StatusBadRequest)
	}

	// Lock the mutex before updating the thingamabob
	thingamabobMux.Lock()
	defer thingamabobMux.Unlock()

	// Update the thingamabob
	if id, err := strconv.Atoi(paramID); err == nil {
		if thingamabob, ok := thingamabobDB[id]; ok {
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
	}

	return c.SendStatus(fiber.StatusNotFound)
}

func deleteThingamabob(c *fiber.Ctx) error {
	// Check for id param
	paramID := c.Params("id")

	// If the id param is not set, return an error
	if paramID == "" {
		return c.SendStatus(fiber.StatusBadRequest)
	}

	// Delete the thingamabob
	if id, err := strconv.Atoi(paramID); err == nil {
		if _, ok := thingamabobDB[id]; ok {
			// Lock the mutex before deleting the thingamabob
			thingamabobMux.Lock()
			defer thingamabobMux.Unlock()

			delete(thingamabobDB, id)
			return c.SendStatus(fiber.StatusNoContent)
		}
	}

	return c.SendStatus(fiber.StatusNotFound)
}

// Helper function to require a authenticated for a route
// optionally with a matching role (or any of the roles passed)
//
//	Example: app.Post("/api/thingamabob", requireAuth("admin"), getThingamabobs(store))
//
// If no roles are passed, any logged in user can access the route
// If one or more roles are passed, the user must have at least one of the roles
// to access the route.
func requireAuth(store *session.Store, roles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Check for a session
		sess, err := store.Get(c)
		if err != nil {
			return c.SendStatus(fiber.StatusInternalServerError)
		}

		// Check if the user is logged in
		if v, ok := sess.Get("loggedIn").(bool); !ok || !v {
			return c.SendStatus(fiber.StatusUnauthorized)
		}

		// Check if a role is required and if the user has the required role
		if len(roles) > 0 {
			match := false
			if userRoles, ok := sess.Get("roles").([]string); ok {
				for _, role := range roles {
					if contains(userRoles, role) {
						match = true
						break
					}
				}
			}
			if !match {
				return c.SendStatus(fiber.StatusUnauthorized)
			}
		}

		// Continue to the next handler
		return c.Next()
	}
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
