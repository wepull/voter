package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/roost-io/roost-example/voting_app/service-test-suite/ballot"
	"github.com/roost-io/roost-example/voting_app/service-test-suite/common"
)

func runTest(w http.ResponseWriter, r *http.Request) {

	var req ballot.TestReq
	var status string

	if err := common.ReadAndParseInput(w, r, &req); err != nil {
		r.Response.StatusCode = http.StatusBadRequest
		return
	}

	status = common.TestStatusOK

	defer func(status string) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Add("Content-Type", "application/json")
		w.Write([]byte(status))
	}(status)

	if !req.Parallel {
		url := req.IP + ":" + req.Port
		common.TestStatusMapLock.RLock()
		defer common.TestStatusMapLock.RUnlock()
		if val, ok := common.TestStatusMap[url]; ok {
			if val == common.TestStatusInProgress {
				status = common.TestStatusNotInvoked
				return
			}
		}
	}

	go func(req ballot.TestReq) {
		var err error
		url := req.IP + ":" + req.Port
		if req.TimeOut == 0 {
			req.TimeOut = common.DefaultTimeOut //default value
		}

		common.TestStatusMapLock.Lock()
		common.TestStatusMap[url] = common.TestStatusInProgress
		common.TestStatusMapLock.Unlock()
		timer := time.NewTimer(time.Duration(req.TimeOut) * time.Second)
		errch := make(chan error, 2)

		go func(errch chan error) {
			err := ballot.RunTest(req)
			errch <- err
			if err != nil {
				log.Printf("run test error:%+v", err)
				return
			}
		}(errch)

		select {
		case <-timer.C:
			common.TestStatusMapLock.Lock()
			common.TestStatusMap[url] = common.TestStatusTimeOut
			common.TestStatusMapLock.Unlock()
			log.Println("timeout") //debug
			timer.Stop()
			return
		case err = <-errch:
			if err == nil {
				common.TestStatusMapLock.Lock()
				common.TestStatusMap[url] = common.TestStatusPass
				common.TestStatusMapLock.Unlock()
				log.Println("TestStatusPass") //debug
				return
			}
			common.TestStatusMapLock.Lock()
			common.TestStatusMap[url] = common.TestStatusFailed
			common.TestStatusMapLock.Unlock()
			log.Println("TestStatusFailed") //debug
			return
		}
	}(req)
	log.Println("Endpoint Hit: runTest")
}

func testResult(w http.ResponseWriter, r *http.Request) {

	var req ballot.TestReq
	var err error
	if err = common.ReadAndParseInput(w, r, &req); err != nil {
		r.Response.StatusCode = http.StatusBadRequest
		return
	}
	url := req.IP + ":" + req.Port
	var status string
	common.TestStatusMapLock.RLock()
	if val, ok := common.TestStatusMap[url]; ok {
		status = val
	} else {
		status = common.TestStatusNotFound
	}
	common.TestStatusMapLock.RUnlock()
	// ballot.BallotTestResult(req)
	fmt.Fprintf(w, status)
	log.Println("Endpoint Hit: testResult")
}

func handleRequests() {
	http.HandleFunc("/tests/run", runTest)
	http.HandleFunc("/tests/result", testResult)
	log.Fatal(http.ListenAndServe(":5003", nil))
}

func main() {
	log.Printf("service test suite is started...")
	handleRequests()
}
