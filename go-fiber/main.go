package main

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/csrf"
	"github.com/gofiber/fiber/v2/middleware/session"
)

// fake user db
type User struct {
	Username string
	Password string
	Roles    []string
}

var (
	usersDB = map[string]User{
		"admin": {
			Password: "admin",
			Roles:    []string{"admin"},
		},
		"user": {
			Password: "user",
			Roles:    []string{"user"},
		},
	}
)

func main() {
	app := fiber.New()

	// Create a new session manager
	store := session.New()

	// Create a new CSRF middleware
	csrfConfig := csrf.Config{
		CookieSameSite: "Lax",
		CookieSecure:   false, // Set to true in production
		CookieHTTPOnly: false, // To allow JS to read the CSRF cookie
		Session:        store,
	}

	app.Use(csrf.New(csrfConfig))

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
		if v, ok := sess.Get("loggedIn").(bool); !ok || v == false {
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

	// Start the Fiber app
	_ = app.Listen(":3001")
}
