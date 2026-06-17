package middleware

import (
	"net"
	"net/http"
	"sync"
	"time"

	"edubase/backend/pkg/response"
	"golang.org/x/time/rate"
)

// ipLimiter is a simple per-IP token-bucket rate limiter.
type ipLimiter struct {
	mu       sync.Mutex
	visitors map[string]*visitor
	rps      rate.Limit
	burst    int
}

type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// NewRateLimiter limits to rps requests/second with the given burst.
func NewRateLimiter(rps float64, burst int) func(http.Handler) http.Handler {
	l := &ipLimiter{
		visitors: make(map[string]*visitor),
		rps:      rate.Limit(rps),
		burst:    burst,
	}
	go l.cleanup()
	return l.middleware
}

func (l *ipLimiter) get(ip string) *rate.Limiter {
	l.mu.Lock()
	defer l.mu.Unlock()
	v, ok := l.visitors[ip]
	if !ok {
		lim := rate.NewLimiter(l.rps, l.burst)
		l.visitors[ip] = &visitor{limiter: lim, lastSeen: time.Now()}
		return lim
	}
	v.lastSeen = time.Now()
	return v.limiter
}

func (l *ipLimiter) cleanup() {
	for {
		time.Sleep(time.Minute)
		l.mu.Lock()
		for ip, v := range l.visitors {
			if time.Since(v.lastSeen) > 3*time.Minute {
				delete(l.visitors, ip)
			}
		}
		l.mu.Unlock()
	}
}

func (l *ipLimiter) middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			ip = r.RemoteAddr
		}
		if !l.get(ip).Allow() {
			response.Error(w, http.StatusTooManyRequests, response.CodeRateLimited, "Juda ko'p urinish. Birozdan so'ng qayta urining")
			return
		}
		next.ServeHTTP(w, r)
	})
}
