import React from "react";
import Home from "./Home";
import Result from "./Result";
import {
  BrowserRouter as Router,
  Redirect,
  Route,
  Switch,
} from "react-router-dom";
import "./App.css";

// const ballot_endpoint = "roost-controlplane:30080";

function App() {
  return (
    <Router basename="/voter">
      <Switch>
        <Route exact path="/" component={Home} />
        <Route path="/result" component={Result} />
        <Route path="/results" component={Result} />
        <Route path="*" render={() => <Redirect to="/" />} />
      </Switch>
    </Router>
  );
}

export default App;
