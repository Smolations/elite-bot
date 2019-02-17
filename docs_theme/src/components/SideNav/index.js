import React, { Component} from "react";
import { Container, Menu } from 'sui';

import "./SideNav.css";


const hasOwnProp = Object.prototype.hasOwnProperty;

class SideNav extends Component {
  state = { activeItem: 'home' }


  /**
   *  @returns {string} HTML collection of lists for members
   */
  buildMemberNav(items, itemHeading, itemsSeen, linktoFn) {
    let nav = '';

    if (items.length) {
      let itemsNav = [];
      let itemsNavItems = [];

      items.forEach((item) => {
        let displayName;

        if ( !hasOwnProp.call(item, 'longname') ) {
          // itemsNavItems += '<li>' + linktoFn('', item.name) + '</li>';
          // itemsNav.push( <li>{linktoFn('', item.name)}</li> );
          itemsNavItems.push( linktoFn('', item.name) );

        } else if ( !hasOwnProp.call(itemsSeen, item.longname) ) {
          // if (tools.env.conf.templates.default.useLongnameInNav) {
          if (false) {
            displayName = item.longname;
          } else {
            displayName = item.name;
          }

          // itemsNavItems += '<li>' + linktoFn(item.longname, displayName.replace(/\b(module|event):/g, '')) + '</li>';
          // itemsNav.push( <li>{displayName.replace(/\b(module|event):/g, '')}</li> );
          itemsNavItems.push( displayName.replace(/\b(module|event):/g, '') );

          itemsSeen[item.longname] = true;
        }
      });

      if (itemsNavItems.length) {
        // nav = <h3>{itemHeading}</h3><ul>{itemsNav.join('')}</ul>;
        const menuItems = itemsNavItems.map(content =>
          <Menu.Item
            name={content}
            active={this.state.activeItem === content}
            onClick={this.handleItemClick}
          />
        );

        nav = (
          <Menu.Item>
            <Menu.Header>{itemHeading}</Menu.Header>

            <Menu.Menu>
              {menuItems}
            </Menu.Menu>
          </Menu.Item>
        );
      }
    }

    return nav;
  }

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
  buildNav(members) {
    const seen = {};
    const seenTutorials = {};
    const nav = [];
    // let nav = '<h2><a href="index.html">Home</a></h2>';
    let globalNav;

    nav.push(this.buildMemberNav(members.modules, 'Modules', {}, helper.linkto));
    nav.push(this.buildMemberNav(members.externals, 'Externals', seen, tools.linktoExternal));
    nav.push(this.buildMemberNav(members.classes, 'Classes', seen, helper.linkto));
    nav.push(this.buildMemberNav(members.events, 'Events', seen, helper.linkto));
    nav.push(this.buildMemberNav(members.namespaces, 'Namespaces', seen, helper.linkto));
    nav.push(this.buildMemberNav(members.mixins, 'Mixins', seen, helper.linkto));
    nav.push(this.buildMemberNav(members.tutorials, 'Tutorials', seenTutorials, tools.linktoTutorial));
    nav.push(this.buildMemberNav(members.interfaces, 'Interfaces', seen, helper.linkto));

    if (members.globals.length) {
      globalNav = '';

      members.globals.forEach((g) => {
        if ( g.kind !== 'typedef' && !hasOwnProp.call(seen, g.longname) ) {
          globalNav += '<li>' + helper.linkto(g.longname, g.name) + '</li>';
        }
        seen[g.longname] = true;
      });

      if (!globalNav) {
        // turn the heading into a link so you can actually get to the global page
        nav += `<h3>${helper.linkto('global', 'Global')}</h3>`;

      } else {
        nav += `'<h3>Global</h3><ul>${globalNav}</ul>'`;
      }
    }

    return nav;
  }

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
            <Menu.Header>{navItem.heading}</Menu.Header>

            <Menu.Menu>
              {menuItems}
            </Menu.Menu>
          </Menu.Item>
        );
      } else {
        return (
          <Menu.Item key={navItem.id}>
            <Menu.Header>{navItem.heading}</Menu.Header>
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
