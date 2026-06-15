package md5

import (
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"time"
)

func GenerateSalt() string {
	// 简单的盐值生成，实际项目中可以使用更复杂的方法
	timestamp := time.Now().UnixNano()
	hash := md5.Sum([]byte(fmt.Sprintf("%d", timestamp)))
	return hex.EncodeToString(hash[:])[:8]
}

func EncryptPassword(password, salt string) string {
	hash := md5.Sum([]byte(password + salt))
	return hex.EncodeToString(hash[:])
}
