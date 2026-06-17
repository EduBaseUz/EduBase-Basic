package hash

import "golang.org/x/crypto/bcrypt"

// cost is the bcrypt work factor (>= 10 per security requirements).
const cost = 12

// Password hashes a plaintext password with bcrypt.
func Password(plain string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(plain), cost)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

// Check compares a bcrypt hash with a plaintext password.
func Check(hashed, plain string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hashed), []byte(plain)) == nil
}
