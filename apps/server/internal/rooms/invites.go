// this code is to create invites code

package rooms

import (
	"crypto/rand"
	"math/big"
)

const inviteAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

func GenerateRandomCode(length int) (string, error) {
	inviteCode := make([]byte, length)
	for i := range inviteCode {
		index, err := rand.Int(rand.Reader, big.NewInt(int64(len(inviteAlphabet))))
		if err != nil {
			return "", err
		}
		inviteCode[i] = inviteAlphabet[index.Int64()]
	}
	return string(inviteCode), nil
}

func GenerateRoomID(prefix string) (string, error) {
	res, err := GenerateRandomCode(8)
	if err != nil {
		return "", err
	}
	return prefix + res, nil
}
