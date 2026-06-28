package users

import (
	"testing"
)

func (s *Service) TestRegister(t *testing.T) {
	t.Run("registering user", func(t *testing.T) {
		gotUserDTO, gotToken, err := s.Register(RegisterRequest{Username: "Hello", Password: "World"})
		
		if err != nil {
			t.Fatalf("Register error: %q", err)
		}
		if gotToken == "" {
			t.Errorf("Register token not returned")
		}
		if gotUserDTO.Username != "Hello" {
			t.Errorf("Register got %v want %v", gotUserDTO.Username, "Hello")
		}
	})
}