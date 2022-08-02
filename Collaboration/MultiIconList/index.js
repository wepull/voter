import React, {Component} from 'react';
import cx from 'classnames';
import * as s from './multiIconList.module.scss';
import IconList from '../../IconList/index';

class MultiIconList extends Component {
  render() {
    const {List, theme, data} = this.props;
    const containerStyles = cx(s.container, {
      [s.containerLight]: theme === 'Light',
    });
    return (
      <div className={containerStyles}>
        {List.map((list, i) => {
          if (list === 'NoIcon') {
            return (
              <div key={i} className={cx(s.none, s.innercontainer)}>
                -
              </div>
            );
          } else {
            return (
              <div key={i} className={s.innercontainer}>
                <IconList iconList={list} multi data={data} />
              </div>
            );
          }
        })}
      </div>
    );
  }
}

export default MultiIconList;
