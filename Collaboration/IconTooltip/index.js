import React, {Component} from 'react';
import * as s from './iconTooltip.module.scss';
import Tooltip from '../../Tooltip/tooltip';

class IconTooltip extends Component {
  render() {
    const {src, Click, message, data} = this.props;
    return (
      <div className={s.container}>
        <Tooltip content={message} direction="bottom">
          <img src={src} alt="" onClick={() => Click(data)} />
        </Tooltip>
      </div>
    );
  }
}

export default IconTooltip;
