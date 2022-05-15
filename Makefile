VOTER_IMG=voter
TEST_IMG=service-test-suite
ifndef IMAGE_TAG
  IMAGE_TAG=latest
endif
CLUSTER_IP := $(shell ping -W2 -n -q -c1 current-cluster-roost.io  2> /dev/null | awk -F '[()]' '/PING/ { print $$2}')

# HOSTNAME := $(shell hostname)
.PHONY: all
all: dockerise helm-deploy

.PHONY: test
test: test-voter

.PHONY: test-voter
test-voter:
	echo "Test Voter"
	mkdir -p /var/tmp/test
	mkdir -p /var/tmp/test/cypress
	mkdir -p /var/tmp/test/cypress/integration
	echo '{"reporter": "junit","reporterOptions": {"mochaFile": "results/my-test-output-[hash].xml"}}' > /var/tmp/test/cypress.json
	cp ${PWD}/service-test-suite/voter/voter.spec.js /var/tmp/test/cypress/integration
	docker run --network="host"  -v /var/tmp/test:/e2e -w /e2e cypress/included:6.2.1 --browser firefox

.PHONY: dockerise
dockerise: build-voter

.PHONY: build-voter
build-voter:
ifdef DOCKER_HOST
	docker -H ${DOCKER_HOST} build -t ${VOTER_IMG}:${IMAGE_TAG} -f voter/Dockerfile voter
else
	docker build -t ${VOTER_IMG}:${IMAGE_TAG} -f voter/Dockerfile voter	
endif

.PHONY: build-test
build-test:
ifdef DOCKER_HOST
	docker -H ${DOCKER_HOST} build -t ${TEST_IMG}:${IMAGE_TAG} -f service-test-suite/Dockerfile service-test-suite
else
	docker build -t ${TEST_IMG}:${IMAGE_TAG} -f service-test-suite/Dockerfile service-test-suite
endif

.PHONY: push
push:
	docker tag ${VOTER_IMG}:${IMAGE_TAG} zbio/${VOTER_IMG}:${IMAGE_TAG}
	docker push zbio/${VOTER_IMG}:${IMAGE_TAG}
	docker tag ${TEST_IMG}:${IMAGE_TAG} zbio/${TEST_IMG}:${IMAGE_TAG}
	docker push zbio/${TEST_IMG}:${IMAGE_TAG}

.PHONY: deploy
deploy:
	kubectl apply -f voter/voter.yaml
	kubectl apply -f service-test-suite/test-suite.yaml
	
.PHONY: helm-deploy
helm-deploy: 
ifeq ($(strip $(CLUSTER_IP)),)
	@echo "UNKNOWN_CLUSTER_IP: failed to resolve current-cluster-roost.io to an valid IP"
	@exit 1;
endif
		helm install vote helm-vote --set clusterIP=$(CLUSTER_IP)
		
.PHONY: helm-undeploy
helm-undeploy:
		-helm uninstall vote

.PHONY: clean
clean: helm-undeploy
	-kubectl delete -f service-test-suite/test-suite.yaml
	-kubectl delete -f voter/voter.yaml
