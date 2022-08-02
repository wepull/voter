import React, {Component} from 'react';
import cx from 'classnames';
import {connect} from 'react-redux';
import * as s from './SentRequests.module.scss';
import RoosterInfo from '../../RoosterInfo/index';
import {cancelRequest} from '../../../actions/collaborate';

class SentRequests extends Component {
  constructor(props) {
    super(props);
    this.state = {
      seemore: false,
    };
    this.onClickCancelPush = this.onClickCancelPush.bind(this);
    this.onClickMore = this.onClickMore.bind(this);
    this.onClickLess = this.onClickLess.bind(this);
  }

  onClickCancelPush(e) {
    e.preventDefault();
    const {cancelRequest} = this.props;
    cancelRequest(e.currentTarget.value);
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

    const SentStyle = cx(s.container, {
      [s.containerLight]: theme === 'Light',
    });

    let heading;
    if (data.toUser.first_name && data.toUser.last_name) {
      heading = `${data.toUser.first_name} ${data.toUser.last_name}`;
    } else if (data.toUser.first_name && !data.toUser.last_name) {
      heading = data.toUser.first_name;
    } else if (!data.toUser.first_name && data.toUser.last_name) {
      heading = `${data.toUser.first_name} ${data.toUser.last_name}`;
    } else {
      heading = data.toUser.username;
    }

    return (
      <div className={SentStyle}>
        <div className={s.RoosterInfo}>
          <RoosterInfo
            heading={heading}
            subHeading={data.toUser.username}
            image={data.toUser.avatar_url}
            theme={theme}
          />
        </div>
        <div className={s.messageContainer}>
          {data.description && (
            <div className={s.message}>
              {data.description && length > 79
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
                            {' '}
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
            className={s.cancelbutton}
            value={data.toUser.username}
            onClick={this.onClickCancelPush}
          >
            Cancel Request
          </button>
        </div>
      </div>
    );
  }
}

const mapActionToProps = {
  cancelRequest,
};
export default connect((state) => state, mapActionToProps)(SentRequests);
