package common

import (
	"sync"
)

const (
	maxRestAPIPayload    = 1073741824
	TestStatusPass       = "PASS"
	TestStatusFailed     = "FAILED"
	TestStatusInProgress = "IN-PROGRESS"
	TestStatusNotFound   = "NOT-FOUND"
	TestStatusTimeOut    = "TIMEOUT"

	TestStatusOK         = "ok"
	TestStatusNotInvoked = "NOT-INVOKED"
	DefaultTimeOut       = 600
)

var (
	TestStatusMap     = make(map[string]string)
	TestStatusMapLock = &sync.RWMutex{}
)
