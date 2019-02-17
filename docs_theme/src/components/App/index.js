import React, { Component} from "react";
import { Container } from 'sui';

import SideNav from 'components/SideNav';

import "./App.css";

class App extends Component {
  state = {
    isLoading: true,
    docs: {},
    members: {},
    currentDoclet: {},
  }

  componentDidMount() {
    Promise.all([
      fetch('/dist/docs.json')
        .then(resp => resp.json())
        .then(json => {
          console.log('received docs: %o', json);
          this.setState({ docs: json });
        }),
      fetch('/dist/members.json')
        .then(resp => resp.json())
        .then(json => {
          console.log('received members: %o', json);
          this.setState({ members: json });
        })
    ])
      .finally(() => {
        this.setState({ isLoading: false });
      });
  }

  render() {
    const content = this.state.isLoading
      ? 'Loading...'
      : (
        <main className="App">
          <SideNav members={this.state.members} />
          <Container>
            <h1> Hello, Worldz! </h1>
          </Container>
        </main>
      );

    return content;
  }
}

export default App;
