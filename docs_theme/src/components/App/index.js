import React, { Component} from "react";
import { Container } from 'sui';

import SideNav from 'components/SideNav';

import "./App.css";

class App extends Component {
  state = {
    isLoading: true,
    docs: {},
    members: {},
    nav: {},
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
        }),
      fetch('/dist/nav.json')
        .then(resp => resp.json())
        .then(json => {
          console.log('received nav: %o', json);
          this.setState({ nav: json });
        })
    ])
      .finally(() => {
        this.setState({ isLoading: false });
      });
  }

  render() {
    const sidebarWidth = '250px';
    const contentStyles = {
      marginLeft: sidebarWidth,
      padding: '20px',
    };
    const content = this.state.isLoading
      ? 'Loading...'
      : (
        <main className="App">
          <SideNav nav={this.state.nav} width={sidebarWidth} />
          <div style={contentStyles}>
            <Container style={{ marginLeft: sidebarWidth }}>
              <h1> Hello, Worldz! </h1>
            </Container>
          </div>
        </main>
      );

    return content;
  }
}

export default App;
