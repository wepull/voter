import React, {Component} from 'react';
import {connect} from 'react-redux';
// import _ from 'lodash';
import cx from 'classnames';
import * as s from './message.module.scss';
import {setMessage} from '../../../../actions/collaborateShare';

class Message extends Component {
  constructor(props) {
    super(props);
    this.state = {
      message: '',
    };
    this.handleChange = this.handleChange.bind(this);
  }
  handleChange(e) {
    const {setMessage} = this.props;
    this.setState({
      message: e.target.value,
    });
    setMessage(e.target.value);
  }

  render() {
    const {
      appPreferences: {theme},
    } = this.props;

    const messageContainer = cx(s.messageContainer, {
      [s.messageContainerLight]: theme === 'Light',
    });

    const parentContainer = cx(s.parentContainer, {
      [s.parentContainerLight]: theme === 'Light',
    });
    return (
      <div className={parentContainer}>
        <div className={messageContainer}>
          <label className={s.messageLabel}> Message: </label>
          <textarea
            rows="4"
            cols="50"
            maxLength="250"
            placeholder="Add your message here"
            className={s.messageInput}
            value={this.state.message}
            onChange={(e) => {
              console.log('message', e.target.value);
              this.handleChange(e);
            }}
          ></textarea>
        </div>
      </div>
    );
  }
}

const mapActionToProps = {
  setMessage,
};

export default connect((state) => state, mapActionToProps)(Message);
