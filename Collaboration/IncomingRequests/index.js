import React, {Component} from 'react';
import cx from 'classnames';
import {connect} from 'react-redux';
import * as _ from 'lodash';
import * as s from './IncomingRequests.module.scss';
import RoosterInfo from '../../RoosterInfo/index';
import {userAction} from '../../../actions/collaborate';

class IncomingRequests extends Component {
  constructor(props) {
    super(props);
    this.state = {
      seemore: false,
    };
    this.onClickUserAction = this.onClickUserAction.bind(this);
    this.onClickMore = this.onClickMore.bind(this);
    this.onClickLess = this.onClickLess.bind(this);
  }

  onClickUserAction(e, type) {
    const {userAction} = this.props;
    e.preventDefault();
    const value = _.get(e, 'currentTarget.value', '');
    userAction(value, type);
  }

  onClickMore() {
    this.setState({seemore: true});
  }

  onClickLess() {
    this.setState({seemore: false});
  }

  render() {
    const {
      data,
      appPreferences: {theme},
    } = this.props;
    let lesstext;
    let length;
    if (data.description) {
      length = data.description.length;
    }
    if (data.description) {
      if (data.description.length > 79) {
        lesstext = data.description.slice(0, 79);
      }
    }

    const IncomingStyle = cx(s.container, {
      [s.containerLight]: theme === 'Light',
    });
    let heading;
    if (data.fromUser.first_name && data.fromUser.last_name) {
      heading = `${data.fromUser.first_name} ${data.fromUser.last_name}`;
    } else if (data.fromUser.first_name && !data.fromUser.last_name) {
      heading = data.fromUser.first_name;
    } else if (!data.fromUser.first_name && data.fromUser.last_name) {
      heading = `${data.fromUser.first_name} ${data.fromUser.last_name}`;
    } else {
      heading = data.fromUser.username;
    }

    return (
      <div className={IncomingStyle}>
        <div className={s.RoosterInfo}>
          <RoosterInfo
            heading={heading}
            subHeading={data.fromUser.username}
            image={data.fromUser.avatar_url}
            theme={theme}
          />
        </div>
        <div className={s.messageContainer}>
          {data.description && (
            <div className={s.message}>
              {length > 79
                ? [
                    this.state.seemore === false ? (
                      <div className={s.textmessage}>
                        <p>
                          {lesstext}
                          <span
                            onClick={this.onClickMore}
                            className={s.seemore}
                          >
                            ... See More
                          </span>
                        </p>
                      </div>
                    ) : (
                      <div className={s.textmessage}>
                        <p>
                          {data.description}
                          <span
                            onClick={this.onClickLess}
                            className={s.seemore}
                          >
                            . See Less
                          </span>
                        </p>
                      </div>
                    ),
                  ]
                : [<p>{data.description}</p>]}
            </div>
          )}
        </div>
        <div className={s.actionButtons}>
          <button
            className={s.acceptbutton}
            value={data.fromUser.username}
            onClick={(e) => {
              this.onClickUserAction(e, 1);
            }}
          >
            Accept
          </button>
          <button
            className={s.rejectbutton}
            value={data.fromUser.username}
            onClick={(e) => {
              this.onClickUserAction(e, 2);
            }}
          >
            Reject
          </button>
        </div>
      </div>
    );
  }
}

const mapActionToProps = {
  userAction,
};

export default connect((state) => state, mapActionToProps)(IncomingRequests);
