(function (window) {
  window["env"] = window["env"] || {};

  // Environment variables
  var ballotEndpointEnvVar = `$REACT_APP_BALLOT_ENDPOINT`;
  var ecServerEndpoint = `$REACT_APP_EC_SERVER_ENDPOINT`;
  window["env"]["ballotEndpoint"] = ballotEndpointEnvVar.replace(/['"]/gi, "");
  window["env"]["ecServerEndpoint"] = ecServerEndpoint.replace(/['"]/gi, "");
})(this);
