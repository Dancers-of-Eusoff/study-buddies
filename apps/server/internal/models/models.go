package models

import "time"

type User struct {
	ID            int       `json:"id" db:"id"`
	Username      string    `json:"username" db:"username"`
	Email         string    `json:"email" db:"email"`
	ProfilePicURL string    `json:"profile_pic_url" db:"profile_pic_url"`
	Bio           string    `json:"bio" db:"bio"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}

type CreateUserParams struct {
	Username string
	Email string
	Password string
}