package mysql

import "time"

// Option -.
type Option func(*MySQL)

// WithMaxPoolSize sets the maximum pool size.
func WithMaxPoolSize(size int) Option {
	return func(m *MySQL) {
		m.maxPoolSize = size
	}
}

// WithConnAttempts sets the number of connection attempts.
func WithConnAttempts(attempts int) Option {
	return func(m *MySQL) {
		m.connAttempts = attempts
	}
}

// WithConnTimeout sets the connection timeout.
func WithConnTimeout(timeout time.Duration) Option {
	return func(m *MySQL) {
		m.connTimeout = timeout
	}
}
