import React, {Component} from 'react';
import cx from 'classnames';
import * as s from './progressText.module.scss';
// import * as _ from "lodash";

class ProgressText extends Component {
  render() {
    const {List, theme} = this.props;
    const ContainerStyles = cx(s.container, {
      [s.containerLight]: theme === 'Light',
    });
    return (
      <>
        {List.length === 0 ? (
          <div>-</div>
        ) : (
          <>
            {List.map((item, i) => {
              return (
                <div className={ContainerStyles} key={i}>
                  <div className={s.progressBarContainer}>
                    <div className={s.progressBar}>
                      <div
                        className={s.progress}
                        style={{width: item.progress || '0'}}
                      ></div>
                    </div>
                    <div className={s.progressBarCount}>{item.status}</div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </>
    );
  }
}

export default ProgressText;
