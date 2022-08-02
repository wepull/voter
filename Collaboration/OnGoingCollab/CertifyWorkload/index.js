import React, {Component} from 'react';
import {connect} from 'react-redux';
import moment from 'moment';
import cx from 'classnames';
import * as _ from 'lodash';

import * as s from './CertifyWorkload.module.scss';

import RoosterInfo from '../../../RoosterInfo';

import {
  certifiedWorkload,
  getCollabExtraInfo,
  rejectCertify,
} from '../../../../actions/collaborate';
import {getProperRoosterName} from '../../../../utils/computeHelpers';
import {
  receiveDataFromElectronMainThread,
  sendDataToElectronMainThread,
} from '../../../../utils/electronBridges';
import Dropdown from '../../../ClusterManagement/Dropdown';
import RadioButton from '../../../RadioButton';

class CertifyWorkload extends Component {
  constructor(props) {
    super(props);
    this.state = {
      certifyWorkloadMessage: '',
      selectedCluster: 'Local Roost',
      selectedClusterId: null,
      selectedDockerDaemon: '',
      certifyOption: 'cluster',
      testCaseURL: '',
      testResultURL: '',
    };
    this.getCertifyInput = this.getCertifyInput.bind(this);
    this.setDropDownValue = this.setDropDownValue.bind(this);
    this.setClusterDropDownValue = this.setClusterDropDownValue.bind(this);
  }

  componentDidMount() {
    const {
      rcr: {currentDockerDaemon},
    } = this.props;

    this.setState({
      selectedDockerDaemon: currentDockerDaemon,
    });
  }

  async certifyWorkload() {
    const {certifiedWorkload, certifyWorkloadData, closeModal} = this.props;
    const {
      certifyWorkloadMessage,
      selectedCluster,
      selectedClusterId,
      selectedDockerDaemon,
      certifyOption,
      testCaseURL,
      testResultURL,
    } = this.state;

    const collab_id = _.get(
      certifyWorkloadData,
      'certifyData.collaboration_id',
      '',
    );
    sendDataToElectronMainThread('loadRoostConfig');
    const loadRoostConfig = await receiveDataFromElectronMainThread(
      'loadRoostConfig',
    );

    let obj = {
      k8sversion: loadRoostConfig.kubernetesVersion,
      clusterSizing: loadRoostConfig.clusterSizing,
    };
    obj = JSON.stringify(obj);

    // window.cid value is getting set on electron side in preload.js.
    certifiedWorkload(
      collab_id,
      window.cid,
      certifyWorkloadMessage,
      certifyOption === 'cluster' ? selectedClusterId : null,
      certifyOption === 'cluster' ? selectedCluster : '',
      certifyOption === 'dockerDaemon' ? selectedDockerDaemon : '',
      certifyOption === 'cluster' && selectedCluster === 'Local Roost'
        ? obj
        : '',
      testCaseURL,
      testResultURL,
    );
    sendDataToElectronMainThread('Amplitude', [
      'Amplitude',
      'Certify Workload',
    ]);
    closeModal();
  }

  async rejectCertifyWorkload() {
    const {rejectCertify, certifyWorkloadData, closeModal} = this.props;
    const {
      selectedCluster,
      selectedClusterId,
      selectedDockerDaemon,
      certifyOption,
      testCaseURL,
      testResultURL,
    } = this.state;
    const collab_id = _.get(
      certifyWorkloadData,
      'certifyData.collaboration_id',
      '',
    );

    sendDataToElectronMainThread('loadRoostConfig');
    const loadRoostConfig = await receiveDataFromElectronMainThread(
      'loadRoostConfig',
    );

    let obj = {
      k8sversion: loadRoostConfig.kubernetesVersion,
      clusterSizing: loadRoostConfig.clusterSizing,
    };
    obj = JSON.stringify(obj);

    // window.cid value is getting set on electron side in preload.js.

    rejectCertify(
      collab_id,
      window.cid,
      this.state.certifyWorkloadMessage,
      certifyOption === 'cluster' ? selectedClusterId : null,
      certifyOption === 'cluster' ? selectedCluster : '',
      certifyOption === 'dockerDaemon' ? selectedDockerDaemon : '',
      certifyOption === 'cluster' && selectedCluster === 'Local Roost'
        ? obj
        : '',
      testCaseURL,
      testResultURL,
    );
    sendDataToElectronMainThread('Amplitude', [
      'Amplitude',
      'Certify Workload',
    ]);
    closeModal();
  }

  getCertifyInput(type, value) {
    this.setState({
      [type]: value,
    });
  }

  setDropDownValue(type, value) {
    this.setState({
      [type]: value,
    });
  }

  setClusterDropDownValue(value) {
    this.setState({selectedCluster: value.title, selectedClusterId: value.id});
  }

  setCertifyInputOption(value) {
    this.setState({
      certifyOption: value,
    });
  }

  async certifyWorkloadGitOps() {
    const {certifyWorkloadData, closeModal, getCollabExtraInfo} = this.props;
    const {certifyWorkloadMessage} = this.state;
    const clusterName = _.get(this.props, 'cluster.clusterName', 'roostapi');

    let user = clusterName;

    const collab_id = _.get(
      certifyWorkloadData,
      'certifyData.collaboration_id',
      '',
    );
    const artifact_name = _.get(
      certifyWorkloadData,
      'certifyData.artifact_name',
      '',
    );
    const from_user_id = _.get(
      certifyWorkloadData,
      'certifyData.from_user_id',
      '',
    );

    await getCollabExtraInfo(collab_id, artifact_name, from_user_id);

    if (clusterName === 'roostapi') {
      user = _.get(this.props, 'collaborate.roostIoUserName', '');
    }

    const ubaData = _.get(
      this.props,
      'collaborate.collabActivityExtraInfo.user_build_activity',
      {},
    );

    const buildID = _.get(ubaData, 'build_id', '');
    const gitLogContent = _.get(ubaData, 'git_log', '');
    const gitPatchContent = _.get(ubaData, 'git_patch', '');

    if (buildID && buildID.length > 0) {
      let secondline = '';
      let gitrepo = '';
      if (gitLogContent && gitLogContent !== '') {
        secondline = gitLogContent.split('\n');
        if (secondline[1] && secondline[1] !== '') {
          secondline[1] = secondline[1].replace('\t', ' ');
          gitrepo = secondline[1].split(' ')[1];
        }
      }
      sendDataToElectronMainThread('certifyGitOps', [
        user,
        buildID,
        gitLogContent,
        gitPatchContent,
        certifyWorkloadMessage,
        collab_id,
        gitrepo,
        window.cid,
      ]);
      this.certifyWorkload();
    } else {
      alert('No Git Repo linked');
      closeModal();
    }
  }

  render() {
    const {
      appPreferences: {theme, daemonConfigList},
      certifyWorkloadData,
    } = this.props;
    const {certifyWorkloadMessage} = this.state;

    let daemonList = [];

    daemonList = _.map(daemonConfigList, (item) => {
      return item.dockerHost;
    });

    daemonList = _.uniq(daemonList);

    const git_repo = _.get(certifyWorkloadData, 'gitops.git_repo', '');

    const conainerStyles = cx(s.certifyWorkloadContainer, {
      [s.certifyWorkloadContainerLight]: theme === 'Light',
    });

    let ListOfClusterManaged = _.get(this.props, 'rcr.clusterList', []) || [];
    let clusterList;
    if (ListOfClusterManaged.length > 0) {
      clusterList = ListOfClusterManaged.filter((el) => el.spec).map((cls) => {
        return (
          cls.status.state === 'running' && {
            title: cls.spec.name,
            id: _.get(cls, 'spec.cluster_id', ''),
          }
        );
      });
    } else {
      clusterList = [];
    }
    clusterList.unshift({title: 'Local Roost', id: ''});
    clusterList.push({title: 'Other', id: ''});

    return (
      <div className={conainerStyles}>
        <div className={s.certifiedWorkloadHeading}>
          <p>Certify Workload</p>
        </div>

        {git_repo && (
          <>
            <div className={s.certifiedWorkloadHeading2}>
              <p>Last Git Operation :</p>
            </div>
            <div className={s.certifyWorkloadBody}>
              <div className={s.certifyWorkloadBodyLeft}>
                <RoosterInfo
                  heading={getProperRoosterName(
                    _.get(certifyWorkloadData, 'senderInfo', {}),
                  )}
                  subHeading={_.get(
                    certifyWorkloadData,
                    'senderInfo.username',
                    '',
                  )}
                  image={_.get(
                    certifyWorkloadData,
                    'senderInfo.avatar_url',
                    '',
                  )}
                  theme={theme}
                />
              </div>

              <div className={s.certifyWorkloadBodyRight}>
                <div className={s.eachRow}>
                  <p>Repo: </p>
                  <span>{git_repo || '-'}</span>
                </div>
                <div className={s.eachRow}>
                  <p>Branch: </p>
                  <span>
                    {_.get(certifyWorkloadData, 'gitops.git_branch', '') || '-'}
                  </span>
                </div>
                <div className={s.eachRow}>
                  <p>Date: </p>
                  <span>
                    {moment(
                      _.get(certifyWorkloadData, 'gitops.gitops_at', ''),
                    ).format('MM/DD/YYYY, h:mm:ss a')}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        <div className={s.inputBox}>
          <div className={s.radioButtons}>
            <div className={s.eachInputRow}>
              <RadioButton
                theme={theme}
                name="certifyOption"
                title={'Cluster'}
                // styles={{marginRight: '0'}}
                checked={
                  'cluster' === _.get(this.state, 'certifyOption', 'cluster')
                }
                onChangeFunction={() => {
                  this.setCertifyInputOption('cluster');
                }}
              />
            </div>
            <div className={s.eachInputRow}>
              <RadioButton
                theme={theme}
                name="certifyOption"
                title={'Docker Daemon'}
                // styles={{marginRight: '0'}}
                checked={
                  'dockerDaemon' ===
                  _.get(this.state, 'certifyOption', 'cluster')
                }
                onChangeFunction={() => {
                  this.setCertifyInputOption('dockerDaemon');
                }}
              />
            </div>
          </div>
        </div>

        {_.get(this.state, 'certifyOption', 'cluster') === 'cluster' && (
          <div className={s.inputBox}>
            <div>
              <label>Cluster: </label>
            </div>
            <div>
              <Dropdown
                height={'20px'}
                width={'300px'}
                theme={theme}
                list={clusterList}
                id="clusterSelectorCertify"
                type={'selectedCluster'}
                value={this.state.selectedCluster}
                isListObject={true}
                changeFunction={(item) => this.setClusterDropDownValue(item)}
              />
            </div>
          </div>
        )}

        {_.get(this.state, 'certifyOption', 'cluster') === 'dockerDaemon' && (
          <div className={s.inputBox}>
            <div>
              <label>Docker Daemon: </label>
            </div>
            <div>
              <Dropdown
                height={'20px'}
                width={'300px'}
                theme={theme}
                list={daemonList}
                id="dockerDaemonSelector"
                type={'selectedDockerDaemon'}
                value={this.state.selectedDockerDaemon}
                changeFunction={(type, item) => {
                  this.setDropDownValue(type, item);
                }}
              />
            </div>
          </div>
        )}

        <div className={s.textInput}>
          <div className={s.header}>
            <div className={s.headinfo}>Test Cases URL:</div>
          </div>
          <div className={s.info}>
            <input
              type="text"
              onChange={(e) => {
                this.getCertifyInput('testCaseURL', e.target.value);
              }}
              value={_.get(this.state, 'testCaseURL', '')}
              placeholder={'Test Cases URL'}
            />
          </div>
        </div>

        <div className={s.textInput}>
          <div className={s.header}>
            <div className={s.headinfo}>Test Result URL:</div>
          </div>
          <div className={s.info}>
            <input
              type="text"
              onChange={(e) => {
                this.getCertifyInput('testResultURL', e.target.value);
              }}
              value={_.get(this.state, 'testResultURL', '')}
              placeholder={'Test Result URL'}
            />
          </div>
        </div>

        {/* <div className={s.inputBox}> */}
        <textarea
          maxLength="250"
          className={s.certifyWorkloadMessage}
          placeholder={'Enter Your Message here'}
          value={certifyWorkloadMessage}
          onChange={(e) =>
            this.setState({certifyWorkloadMessage: e.target.value})
          }
        />
        {/* </div> */}

        <div className={s.actionButtons}>
          <div
            className={s.certifyWorkload}
            onClick={() => this.certifyWorkload()}
          >
            Certify Workload
          </div>
          {/* <div
            className={s.certifyWorkloadGitOps}
            onClick={() => this.certifyWorkloadGitOps()}
          >
            Certify Workload with Git Ops
          </div> */}
          <div
            className={s.rejectCertifyWorkload}
            onClick={() => this.rejectCertifyWorkload()}
          >
            Reject Certify
          </div>
        </div>
      </div>
    );
  }
}

const mapActionToProps = {
  getCollabExtraInfo,
  certifiedWorkload,
  rejectCertify,
};

export default connect((state) => state, mapActionToProps)(CertifyWorkload);
