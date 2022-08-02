import React, {Component} from 'react';
import cx from 'classnames';
import * as s from './textList.module.scss';

class TextList extends Component {
  render() {
    const {textList, theme, type} = this.props;
    const TextList = (textList = []) => {
      if (textList.length === 0) {
        return <div>-</div>;
      }
      const containerStyles = cx(s.container, {
        [s.containerLight]: theme === 'Light',
        [s.containerWork]: type === 'Workflow',
      });
      return textList.map((text = '', i) => {
        return (
          <div className={containerStyles} key={i}>
            {!text || text.length === 0 ? (
              <div className={s.label}>-</div>
            ) : (
              <div className={s.label}>{text}</div>
            )}
          </div>
        );
      });
    };

    return <>{TextList(textList)}</>;
  }
}

export default TextList;
