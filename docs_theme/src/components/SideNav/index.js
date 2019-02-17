import React, { Component} from "react";
import { Container, Menu } from 'sui';
import { taffy } from 'taffydb';

import "./SideNav.css";


class SideNav extends Component {
  state = { activeItem: 'home' }

  constructor(props) {
    super(props);

    this.state.members = props.members;
  }

  handleItemClick = (e, { name }) => this.setState({ activeItem: name })

  render() {
    const { activeItem } = this.state;

    return (
      <Menu fixed='left' vertical inverted>
        <Container>
          <Menu.Item name='home' active={activeItem === 'home'} onClick={this.handleItemClick} />
          <Menu.Item
            name='messages'
            active={activeItem === 'messages'}
            onClick={this.handleItemClick}
          />
          <Menu.Item
            name='friends'
            active={activeItem === 'friends'}
            onClick={this.handleItemClick}
          />
        </Container>
      </Menu>
    )
  }
}

export default SideNav;
