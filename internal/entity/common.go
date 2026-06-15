package entity

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
)

type StringSlice []string

// Scan 实现 sql.Scanner 接口
func (s *StringSlice) Scan(value interface{}) error {
	if value == nil {
		*s = []string{}
		return nil
	}

	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return fmt.Errorf("unsupported type: %T", value)
	}

	return json.Unmarshal(bytes, s)
}

// Value 实现 driver.Valuer 接口（保存时使用）
func (s StringSlice) Value() (driver.Value, error) {
	if s == nil {
		return "[]", nil
	}
	return json.Marshal(s)
}

type Int64Slice []int64

func (i *Int64Slice) Scan(value interface{}) error {
	if value == nil {
		*i = Int64Slice{}
	}
	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return fmt.Errorf("unsupported type: %T", value)
	}
	return json.Unmarshal(bytes, i)
}

func (i Int64Slice) Value() (driver.Value, error) {
	if i == nil {
		return "[]", nil
	}
	return json.Marshal(i)
}

// Scan 实现 sql.Scanner 接口
func (m *ChatMessages) Scan(value interface{}) error {
	if value == nil {
		*m = ChatMessages{}
		return nil
	}
	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return fmt.Errorf("unsupported type: %T", value)
	}
	return json.Unmarshal(bytes, m)
}

// Value 实现 driver.Valuer 接口
func (m ChatMessages) Value() (driver.Value, error) {
	if m == nil {
		return "[]", nil
	}
	return json.Marshal(m)
}
