import React, {Component} from 'react';
import Highlight, {defaultProps} from 'prism-react-renderer';
import {connect} from 'react-redux';
import cx from 'classnames';
import * as _ from 'lodash';

import * as s from './SvcTestResults.module.scss';

import HeaderTabButton from '../../../HeaderTabButton';
import Loader from '../../../Loader';
import Table from '../../../Table';

import {getCollabExtraInfo} from '../../../../actions/collaborate';
import {getProperRoosterName} from '../../../../utils/computeHelpers';
import tableViewConfigs from '../../../../utils/tableViewConfigs';
import crossIconDark from '../../../../assets/svgs/iconCrossDark.svg';
import crossIconLight from '../../../../assets/svgs/crossIconBlack.svg';

const headerButtonArray = [
  {
    name: 'Message',
    key: 'message',
  },
  {
    name: 'Test Result',
    key: 'testDetails',
  },
  {
    name: 'Git Logs',
    key: 'logs',
  },
  {
    name: 'Git Patch',
    key: 'patch',
  },
];

class SvcTestResults extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeScreenType: 'message',
      impactedSvcActiveKey: '',
      showTableView: true,

      selectedClusterId: '',
      selectedClusterVendor: '',
      selectedClusterK8sVersion: '',
      selectedClusterNode: '',
      selectedClusterInstanceType: '',
      selectedClusterRegion: '',

      selectedCertification_result: '',
      selectedCertification_test: '',
      selectedCertification_certifyWith: '',
      localRoostConfig: '',
    };
    this.toggleTableView = this.toggleTableView.bind(this);
    this.setMoreDetails = this.setMoreDetails.bind(this);
  }

  componentDidMount() {
    const {
      initData: {collaboration_id, artifact_name, from_user_id},
    } = this.props;

    this.getData(collaboration_id, artifact_name, from_user_id);
  }

  componentDidUpdate(prevProps, prevState) {
    const {
      initData: {collaboration_id, artifact_name, from_user_id},
    } = this.props;

    const {
      initData: {
        collaboration_id: prevCI,
        artifact_name: prevAN,
        from_user_id: prevFUI,
      },
    } = prevProps;

    if (
      collaboration_id !== prevCI ||
      artifact_name !== prevAN ||
      from_user_id !== prevFUI
    ) {
      this.getData(collaboration_id, artifact_name, from_user_id);
    }
  }

  toggleTableView() {
    const {showTableView} = this.state;
    this.setState({
      showTableView: !showTableView,
    });
  }

  setMoreDetails(data) {
    console.log('data: ', data);
    let clusterState = JSON.parse(data.cluster_state);
    let localRoost =
      _.get(data, 'clusterconfig', '') !== ''
        ? JSON.parse(_.get(data, 'clusterconfig', {}))
        : {};
    this.toggleTableView();
    if (!_.isEmpty(data)) {
      this.setState({
        selectedClusterId: data.cluster_id,
        selectedClusterK8sVersion: _.get(
          clusterState,
          'customer_list[' + 0 + '].k8s_version',
          '-',
        ),
        selectedClusterNode: _.get(
          clusterState,
          'customer_list[' + 0 + '].num_workers',
          '-',
        ),
        selectedClusterVendor: _.get(
          clusterState,
          'customer_list[' + 0 + '].vendor',
          '-',
        ),
        selectedClusterInstanceType: _.get(
          clusterState,
          'customer_list[' + 0 + '].instance_type',
          '',
        ),
        selectedClusterRegion: _.get(
          clusterState,
          'customer_list[' + 0 + '].region',
          '',
        ),
        selectedCertification_result: data.test_result_url,
        selectedCertification_test: data.test_case_url,
        selectedCertification_certifyWith:
          data.cluster === '' ? data.docker_host : data.cluster,
        localRoostConfig: `K8s: ${_.get(localRoost, 'k8sversion', '')}, ${_.get(
          localRoost,
          'clusterSizing',
          '',
        )}`,
      });
    } else {
      this.setState({
        selectedCertification_result: '',
        selectedCertification_test: '',
        selectedCertification_certifyWith: '',
        selectedClusterId: '',
        selectedClusterK8sVersion: '',
        selectedClusterNode: '',
        selectedClusterVendor: '',
        localRoostConfig: '',
      });
    }

    console.log('data: ', data);
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    const impacted_services = _.get(
      nextProps,
      'collaborate.collabActivityExtraInfo.impacted_services',
      [],
    );
    const impactedSvcData = _.groupBy(impacted_services, (svc) => {
      return svc.svc_name;
    });
    const impactedSvcKeys = Object.keys(impactedSvcData);
    if (
      impactedSvcKeys.length > 0 &&
      !impactedSvcKeys.includes(prevState.impactedSvcActiveKey)
    ) {
      return {impactedSvcActiveKey: impactedSvcKeys[0]};
    }
    return null;
  }

  getData(collaboration_id, artifact_name, from_user_id) {
    const {getCollabExtraInfo} = this.props;
    if (!collaboration_id) return;
    getCollabExtraInfo(collaboration_id, artifact_name, from_user_id);
  }

  render() {
    const {
      theme = 'Dark',
      initData: {collaboration_id, collab_message, senderInfo = {}},
      collaborate: {collabActivityExtraInfo},
      system: {
        loader: {fetchingCollabExtraInfo},
      },
    } = this.props;
    const {activeScreenType, impactedSvcActiveKey, showTableView} = this.state;

    const crossIcon = theme === 'Light' ? crossIconLight : crossIconDark;

    const {
      impacted_services = [],
      certifications = [],
      user_build_activity,
    } = collabActivityExtraInfo;

    const messageDataArray = [];
    certifications.forEach((item) => {
      let obj = [
        {
          message: 'More',
          styles: {
            background: '#4e8fc9',
            cursor: 'pointer',
            color: '#000000',
            width: 'auto',
            padding: '1px 3x',
            minWidth: '0px',
          },
          handler: () => {
            this.setMoreDetails(item);
          },
        },
      ];

      messageDataArray.push({
        from: {
          image_url: item.avatar_url,
          name: getProperRoosterName(item),
          roost_handle: item.username,
        },
        date: {
          date: item.certified_on,
          format: 'time-stamp',
        },
        action: obj,
        message: item.certify_message,
        activity: item.status === 1 ? 'CERTIFIED' : 'CERTIFY FAILED',
      });
    });

    let obj = [
      {
        message: 'More',
        styles: {
          background: '#c3b7f7',
          cursor: 'not-allowed',
          color: '#000000',
          width: 'auto',
          padding: '1px 3x',
          minWidth: '0px',
        },
        handler: () => {},
      },
    ];

    collaboration_id &&
      messageDataArray.push({
        from: {
          image_url: senderInfo.avatar_url,
          name: getProperRoosterName(senderInfo),
          roost_handle: senderInfo.username,
        },
        date: {
          date: new Date(collaboration_id * 1000),
          format: 'time-stamp',
        },
        action: obj,
        message: collab_message,
        activity: 'Collaboration',
      });

    const impactedSvcData = _.groupBy(impacted_services, (svc) => {
      return svc.svc_name;
    });

    const impactedSvcKeys = Object.keys(impactedSvcData);
    const ImpactedSvcKeysComponent = impactedSvcKeys.map((data, i) => {
      const impactedSvcSliderButtonStyles = cx(s.impactedSvcSliderButton, {
        [s.isActive]: data === impactedSvcActiveKey,
      });
      return (
        <div
          key={i}
          className={impactedSvcSliderButtonStyles}
          onClick={() => {
            this.setState({impactedSvcActiveKey: data});
          }}
        >
          {data}
        </div>
      );
    });

    const ImpactedSvcDataComponent = () => {
      const impactedSvcActiveData = impactedSvcData[impactedSvcActiveKey];

      if (!impactedSvcActiveData) return <></>;
      return impactedSvcActiveData.map((data, i) => (
        <div key={i} className={s.impactedSvcSingleDetail}>
          {data.test_details}
        </div>
      ));
    };

    const showMoreCertificationDetails = () => {
      const {
        selectedCertification_certifyWith,
        selectedCertification_result,
        selectedCertification_test,
        // selectedClusterId,
        selectedClusterK8sVersion,
        selectedClusterNode,
        selectedClusterVendor,
        selectedClusterRegion,
        selectedClusterInstanceType,
        localRoostConfig,
      } = this.state;
      return (
        <div className={s.certificationDetails}>
          <div className={s.crossIconCSS}>
            <img
              alt={'Cancel'}
              src={crossIcon}
              onClick={() => {
                this.toggleTableView();
              }}
            />
          </div>
          <div className={s.clusterDiv}>
            <label>Cluster/Docker Host: </label>
            <span> {selectedCertification_certifyWith} </span>
          </div>

          {selectedCertification_certifyWith === 'Local Roost' ? (
            <div className={s.testDiv}>
              <label>Configurations:</label>
              <span> {localRoostConfig} </span>
            </div>
          ) : (
            <div className={s.testDiv}>
              <label>Configurations:</label>
              {selectedClusterK8sVersion !== '-' && (
                <span> K8s: {selectedClusterK8sVersion} </span>
              )}
              {selectedClusterNode !== '-' && (
                <span> {selectedClusterNode} worker nodes </span>
              )}
              {selectedClusterVendor !== '-' && (
                <span> {selectedClusterVendor} </span>
              )}
              {selectedClusterInstanceType !== '-' && (
                <span> {selectedClusterInstanceType} </span>
              )}
              {selectedClusterRegion !== '-' && (
                <span> {selectedClusterRegion} </span>
              )}
            </div>
          )}
          <div className={s.testDiv}>
            <label>Test Case URL: </label>
            <span> {selectedCertification_test} </span>
          </div>

          <div className={s.testDiv}>
            <label>Test Result URL: </label>
            <span> {selectedCertification_result} </span>
          </div>
        </div>
      );
    };

    const GitLog = _.get(user_build_activity, 'git_log', '');
    const GitPatch = _.get(user_build_activity, 'git_patch', '');

    return (
      <>
        <div
          className={cx(s.svcContainer, {
            [s.svcContainerLight]: theme === 'Light',
          })}
        >
          <div className={s.svcContentBody}>
            <div className={s.svcTableHeading}>
              <HeaderTabButton
                handlerActiveScreen={(activeScreen) => {
                  this.setState({
                    activeScreenType: activeScreen,
                  });
                }}
                headerButton={headerButtonArray}
                defaultTab="message"
                activeScreen={activeScreenType}
              />
            </div>
            <div className={s.svcTableBody}>
              {fetchingCollabExtraInfo && <Loader />}
              {!fetchingCollabExtraInfo && (
                <>
                  {activeScreenType === 'message' &&
                    (showTableView ? (
                      <Table
                        head={tableViewConfigs.messageListing}
                        data={messageDataArray}
                        recordsPerPage={6}
                        theme={theme}
                        rowbreak
                      />
                    ) : (
                      <>{showMoreCertificationDetails()}</>
                    ))}

                  {activeScreenType === 'testDetails' &&
                    (ImpactedSvcKeysComponent.length > 0 ? (
                      <div className={s.impactedSvcContainer}>
                        <div className={s.impactedSvcSlider}>
                          <div className={s.impactedSvcSliderHeading}>
                            Services Name
                          </div>
                          <div className={s.impactedSvcSliderContent}>
                            {ImpactedSvcKeysComponent}
                          </div>
                        </div>

                        <div className={s.impactedSvcDetails}>
                          {ImpactedSvcDataComponent()}
                        </div>
                      </div>
                    ) : (
                      <div className={s.noRecords}>No Records</div>
                    ))}

                  {activeScreenType === 'logs' &&
                    (GitLog ? (
                      <Highlight {...defaultProps} code={GitLog} language="git">
                        {({
                          className,
                          style,
                          tokens,
                          getLineProps,
                          getTokenProps,
                        }) => (
                          <pre className={className} style={style}>
                            {tokens.map((line, i) => (
                              <div {...getLineProps({line, key: i})}>
                                {line.map((token, key) => (
                                  <span {...getTokenProps({token, key})} />
                                ))}
                              </div>
                            ))}
                          </pre>
                        )}
                      </Highlight>
                    ) : (
                      <div className={s.noRecords}>No Records</div>
                    ))}

                  {activeScreenType === 'patch' &&
                    (GitPatch ? (
                      <Highlight
                        {...defaultProps}
                        code={GitPatch}
                        language="git"
                      >
                        {({
                          className,
                          style,
                          tokens,
                          getLineProps,
                          getTokenProps,
                        }) => (
                          <pre className={className} style={style}>
                            {tokens.map((line, i) => (
                              <div {...getLineProps({line, key: i})}>
                                {line.map((token, key) => (
                                  <span {...getTokenProps({token, key})} />
                                ))}
                              </div>
                            ))}
                          </pre>
                        )}
                      </Highlight>
                    ) : (
                      <div className={s.noRecords}>No Records</div>
                    ))}
                </>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }
}

const mapActionToProps = {
  getCollabExtraInfo,
};

export default connect((state) => state, mapActionToProps)(SvcTestResults);
