import React, { Component} from "react";
import { Container, Menu } from 'sui';

import "./SideNav.css";


const hasOwnProp = Object.prototype.hasOwnProperty;

class SideNav extends Component {
  state = { activeItem: 'home' }


  /**
   * Create the navigation sidebar.
   * @param {object} members The members that will be used to create the sidebar.
   * @param {array<object>} members.classes
   * @param {array<object>} members.externals
   * @param {array<object>} members.globals
   * @param {array<object>} members.mixins
   * @param {array<object>} members.modules
   * @param {array<object>} members.namespaces
   * @param {array<object>} members.tutorials
   * @param {array<object>} members.events
   * @param {array<object>} members.interfaces
   * @return {string} The HTML for the navigation sidebar.
   */
  buildNav(nav) {
    return nav.map(navItem => {
      if (navItem.items && navItem.items.length) {
        // nav = <h3>{itemHeading}</h3><ul>{itemsNav.join('')}</ul>;
        const menuItems = navItem.items.map((navSubItem) =>
          <Menu.Item
            key={navSubItem.id}
            name={navSubItem.id}
            active={this.state.activeItem === navSubItem.id}
            onClick={this.handleItemClick}
          />
        );

        return (
          <Menu.Item key={navItem.id}>
            <Menu.Header>{navItem.anchor.content}</Menu.Header>

            <Menu.Menu>
              {menuItems}
            </Menu.Menu>
          </Menu.Item>
        );
      } else {
        return (
          <Menu.Item key={navItem.id}>
            <Menu.Header>{navItem.anchor.content}</Menu.Header>
          </Menu.Item>
        );
      }
    });
  }

  handleItemClick = (e, { name }) => this.setState({ activeItem: name })

  render() {
    const { activeItem } = this.state;
    const { nav, width } = this.props;

    const menuStyles = {
      position: 'fixed',
      display: 'flex',
      flexDirection: 'column',
      top: 0,
      bottom: 0,
      left: 0,
      width,
      // match menu background
      // prevents a white background when items are filtered out by search
      background: '#1B1C1D',
      overflowX: 'hidden',
    };

    const menuItems = this.buildNav(nav);
          // <Menu.Item name='home' active={activeItem === 'home'} onClick={this.handleItemClick} />

    return (
      <div style={{ ...menuStyles, flex: 1 }}>
        <div style={{ flex: 1, overflowY: 'scroll' }}>
          <Menu vertical inverted fluid borderless compact>
            <Container>
              {menuItems}
            </Container>
          </Menu>
        </div>
      </div>
    )
  }
}

export default SideNav;
