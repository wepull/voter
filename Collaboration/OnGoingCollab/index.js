import React, {Component, createRef} from 'react';
import {connect} from 'react-redux';
import moment from 'moment';
import cx from 'classnames';
import * as _ from 'lodash';

import {ImCheckboxChecked, ImCheckboxUnchecked} from 'react-icons/im';
import CollaborateButton from '../CollaborateButton/index';
import Dropdowncollab from '../Dropdowncollab';
import * as s1 from './onGoingcollab.module.scss';
// import * as s2 from './onGoingCollabRdeLite.module.scss';

import AbortIcon from '../../../assets/svgs/icon-abort-dark.svg';
import AbortIconLight from '../../../assets/svgs/icon-abort-light.svg';

import AbortIconNonClick from '../../../assets/svgs/icon-abort-nonclick.svg';
import AbortIconNonClickLight from '../../../assets/svgs/icon-abort-nonclick-light.svg';

import ServiceTestIcon from '../../../assets/svgs/icon-test-result.svg';
import ServiceTestIconLight from '../../../assets/svgs/icon-test-result-light.svg';

import CertifiedIcon from '../../../assets/svgs/icon-certified.svg';
import CertifiedIconLight from '../../../assets/svgs/icon-certified-light.svg';

import DeleteIcon from '../../../assets/svgs/icon-delete.svg';
import DeleteIconLight from '../../../assets/svgs/icon-delete-light.svg';

import DeleteIconNonClick from '../../../assets/svgs/icon-delete-nonclick.svg';
import DeleteIconNonClickLight from '../../../assets/svgs/icon-delete-nonclick-light.svg';

import DeployLightIcon from '../../../assets/svgs/icon-deploy-light.svg';
import DeployIcon from '../../../assets/svgs/icon-deploy.svg';

import DeployIconNonClick from '../../../assets/svgs/icon-deploy-nonclick.svg';
import DeployIconNonClickLight from '../../../assets/svgs/icon-deploy-nonclick-light.svg';

import ReceiveIcon from '../../../assets/svgs/icon-receiver.svg';
import ReceiveIconLight from '../../../assets/svgs/icon-receiver-light.svg';

import SenderIcon from '../../../assets/svgs/icon-sender.svg';
import SenderIconLight from '../../../assets/svgs/icon-sender-light.svg';

import downArrowIcon from '../../../assets/svgs/arrowDown.svg';
import downArrowIconLight from '../../../assets/svgs/arrowdown-light.svg';

import searchIcon from '../../../assets/svgs/iconSearch.svg';
// import searchIconDark from '../../../assets/svgs/iconSearchBlack.svg';

import noongoingcollaborationimage from '../../../assets/svgs/no-ongoing-collaboration.svg';
import noongoingcollaborationimageLight from '../../../assets/svgs/no-ongoing-collaboration-light.svg';

import Table from '../../Table/index';
import Modal from '../../Modal';
import ConfirmAction from '../../ConfirmAction';
import Loader from '../../Loader/index';
import Chip from '../../Chip';
import SvcTestResults from './SvcTestResults';
import CertifyWorkload from './CertifyWorkload';
import TableFooter from '../../TableFooter';

import {
  executeYaml,
  abortTransfer,
  refreshDetails,
  getOnGoingCollaborationsNew,
  setOnGoingCollabCurrentPage,
  setOnGoingCollabStatusFilter,
  setOnGoingCollabFileFilter,
} from '../../../actions/collaborate';
import {
  getClusterListRCR,
  getDockerHostRunningStatus,
} from '../../../actions/rcr';
import {setClusterName} from '../../../actions/cluster';
import {setToken} from '../../../actions/userActions';
import {getDefaultDaemonConfig} from '../../../actions/appPreference';
import {
  sendDataToElectronMainThread,
  receiveDataFromElectronMainThread,
} from '../../../utils/electronBridges';
import tableViewConfig from '../../../utils/tableViewConfigs';

const StatusArray = [
  'Aborted',
  'Completed',
  'Deployed',
  'Failed',
  'In Progress',
  'Loaded',
  'Received',
  'Started',
  'Success',
];

class OnGoingCollab extends Component {
  constructor(props) {
    super(props);
    const {
      collaborate: {onGoingCollabStatusFilter},
    } = this.props;

    this.state = {
      showThisModal: '',
      svcTestResultModalData: {},
      certifyWorkloadModalData: {},

      showConfirmRevokeModal: false,
      collaborationIdtoAbort: '',
      collaborationAction: false,
      collaborationIdArray: [],
      action: '',
      consentMessage: '',
      fileType: '',
      imageFilePath: '',
      namespaceToDelete: '',
      currentSearchValue: '',
      errorText: '',
      showStatusFilter: false,
      statusFilterAll:
        onGoingCollabStatusFilter.length === StatusArray.length
          ? true
          : onGoingCollabStatusFilter.length === 0,
      currentStatusFilter: onGoingCollabStatusFilter,
      showClusterFilter: false,
      clusterToDeploy: '',
      // to check if file exist or not befor deploy/delete
      yamlFilePath: '',
    };

    this.statusFilterRef = createRef();

    this.handleCloseModal = this.handleCloseModal.bind(this);
    this.handleTextSearch = this.handleTextSearch.bind(this);
    this.closeSelectors = this.closeSelectors.bind(this);
    this.abortTransferFunction = this.abortTransferFunction.bind(this);
    this.executeYamlFunction = this.executeYamlFunction.bind(this);
    this.clickConsentYes = this.clickConsentYes.bind(this);
  }

  abortTransferFunction = (data) => {
    this.handleCloseModal();
    this.setState({
      showConfirmRevokeModal: true,
      collaborationIdArray: data,
      action: 'abort',
      consentMessage: `Are you sure you want to "abort" transfer?`,
    });
  };

  executeYamlFunction = async (data, action, type, filepath, ns) => {
    this.handleCloseModal();
    if (type === 'yaml') {
      if (action === true) {
        this.setState({
          showConfirmRevokeModal: true,
          collaborationIdtoAbort: data,
          collaborationAction: action,
          action: 'delete',
          consentMessage: `Delete from`,
          fileType: type,
          namespaceToDelete: ns,
        });
      } else {
        this.setState({
          showConfirmRevokeModal: true,
          collaborationIdtoAbort: data,
          collaborationAction: action,
          action: 'Deploy',
          consentMessage: `Deploy to`,
          fileType: type,
          namespaceToDelete: ns,
          yamlFilePath: filepath,
        });
      }
    } else if (type === 'helm') {
      if (action === true) {
        this.setState({
          showConfirmRevokeModal: true,
          collaborationIdtoAbort: data,
          collaborationAction: action,
          action: 'delete',
          consentMessage: `Delete from`,
          fileType: type,
          namespaceToDelete: ns,
        });
      } else {
        this.setState({
          showConfirmRevokeModal: true,
          collaborationIdtoAbort: data,
          collaborationAction: action,
          action: 'Deploy',
          consentMessage: `Deploy to`,
          fileType: type,
          namespaceToDelete: ns,
          yamlFilePath: filepath,
        });
      }
    } else if (type === 'docker') {
      this.setState({
        showConfirmRevokeModal: true,
        collaborationIdtoAbort: data,
        collaborationAction: action,
        imageFilePath: filepath,
        action: 'DeployImage',
        consentMessage: `Load to`,
        fileType: type,
        namespaceToDelete: ns,
      });
    }
    sendDataToElectronMainThread('getClusterName');
    let globalClusterName = await receiveDataFromElectronMainThread(
      'getClusterName',
    );
    this.setState({clusterToDeploy: globalClusterName});
  };

  closeSelectors(e) {
    const {
      collaborate: {onGoingCollabStatusFilter},
    } = this.props;

    if (
      this.statusFilterRef &&
      this.statusFilterRef.current &&
      !this.statusFilterRef.current.contains(e.target)
    ) {
      this.setState({
        showStatusFilter: false,
        currentStatusFilter: onGoingCollabStatusFilter,
        statusFilterAll:
          onGoingCollabStatusFilter.length === StatusArray.length
            ? true
            : onGoingCollabStatusFilter.length === 0,
      });
    }

    const clusterSelectorClicked = e.target.closest(
      '#onGoingCollabClusterSelector',
    );
    if (!clusterSelectorClicked) {
      this.setState({showClusterFilter: false});
    }
  }

  async componentDidMount() {
    const {
      getClusterListRCR,
      getOnGoingCollaborationsNew,
      getDefaultDaemonConfig,
      getDockerHostRunningStatus,
    } = this.props;

    const getData = () => {
      getOnGoingCollaborationsNew();
      getClusterListRCR();
      getDefaultDaemonConfig();
    };

    getData();

    window.ipcRenderer.on('getClusterList', () => {
      getClusterListRCR();
    });

    window.ipcRenderer.on('getClusterNames', () => {
      getClusterListRCR();
    });

    window.ipcRenderer.on('updatedCluster', async (e, msg) => {
      getDockerHostRunningStatus(msg);
    });

    window.ipcRenderer.on('getClusterDetails', async (event, msg) => {
      const {
        collaborate: {activeScreen},
        setToken,
        refreshDetails,
      } = this.props;
      await setToken(msg);
      const today = new Date();
      const currentTime = moment(today).format('LT');
      refreshDetails(activeScreen, currentTime);
    });

    window.ipcRenderer.on('tokensend', (e, token) => {
      setTimeout(getData, 100);
    });

    sendDataToElectronMainThread('getClusterDetails', ['roostapi']);
    window.addEventListener('click', this.closeSelectors, true);

    // close ServiceImpact Modal window on ESC.
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.handleCloseModal();
      }
    });

    sendDataToElectronMainThread('getClusterName');
    let clusterNameGlobal = await receiveDataFromElectronMainThread(
      'getClusterName',
    );
    console.log(clusterNameGlobal);
    this.setState({
      clusterToDeploy:
        clusterNameGlobal === 'roostapi' ? 'Local Roost' : clusterNameGlobal,
    });

    getDockerHostRunningStatus(clusterNameGlobal);
  }

  componentWillUnmount() {
    window.removeEventListener('click', this.closeSelectors, true);
    window.removeEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.handleCloseModal();
      }
    });
  }

  handleCloseModal() {
    this.setState({
      showThisModal: '',
      svcTestResultModalData: {},
      certifyWorkloadModalData: {},
      showConfirmRevokeModal: false,
    });
  }

  handleTextSearch(e) {
    const {value} = e.currentTarget;
    this.setState({currentSearchValue: value});
  }

  handleStatusFilter(name) {
    const {statusFilterAll, currentStatusFilter} = this.state;

    if (statusFilterAll) {
      const index = StatusArray.indexOf(name);
      const updatedStatus = [...StatusArray];
      updatedStatus.splice(index, 1);
      this.setState({
        currentStatusFilter: [...updatedStatus],
        statusFilterAll: false,
      });
    } else {
      const index = currentStatusFilter.indexOf(name);
      if (index > -1) {
        const updatedStatus = [...currentStatusFilter];
        updatedStatus.splice(index, 1);
        this.setState({
          currentStatusFilter: [...updatedStatus],
          statusFilterAll: false,
        });
      } else {
        const updatedStatus = [...currentStatusFilter, name];
        this.setState({
          currentStatusFilter: updatedStatus,
          statusFilterAll: StatusArray.length === currentStatusFilter.length,
        });
      }
    }
  }

  async handleClusterDropdown(clusterName) {
    const {
      setClusterName,
      getOnGoingCollaborationsNew,
      setOnGoingCollabCurrentPage,
      cluster: {clusterName: currentCluster},
    } = this.props;
    let apiClusterName;
    switch (clusterName) {
      case 'Local Roost':
        apiClusterName = 'roostapi';
        break;
      case 'Default':
        apiClusterName = 'default';
        break;
      default:
        apiClusterName = clusterName;
        break;
    }

    if (currentCluster !== apiClusterName) {
      await Promise.all([
        setClusterName(apiClusterName),
        setOnGoingCollabCurrentPage(1),
      ]);
      getOnGoingCollaborationsNew();
    }
    this.setState({showClusterFilter: false});
  }

  onClickClear(type) {
    if (type === 'Status') {
      this.setState({currentStatusFilter: [], statusFilterAll: false});
    }
  }

  async onClickApply(type) {
    const {
      getOnGoingCollaborationsNew,
      setOnGoingCollabCurrentPage,
      setOnGoingCollabStatusFilter,
      setOnGoingCollabFileFilter,
      collaborate: {onGoingCollabStatusFilter},
    } = this.props;
    const {
      currentSearchValue = '',
      statusFilterAll,
      currentStatusFilter,
    } = this.state;

    if (type === 'Status') {
      if (
        onGoingCollabStatusFilter.length !== currentStatusFilter.length ||
        onGoingCollabStatusFilter.some(
          (el) => !currentStatusFilter.includes(el),
        )
      ) {
        if (
          statusFilterAll ||
          currentStatusFilter.length === 0 ||
          currentStatusFilter.length === StatusArray.length
        ) {
          await Promise.all([
            setOnGoingCollabCurrentPage(1),
            setOnGoingCollabStatusFilter([]),
          ]);
          this.setState({statusFilterAll: true});
        } else {
          await Promise.all([
            setOnGoingCollabCurrentPage(1),
            setOnGoingCollabStatusFilter(currentStatusFilter),
          ]);
        }
        getOnGoingCollaborationsNew();
      } else {
        this.setState({
          statusFilterAll:
            currentStatusFilter.length === 0 ||
            currentStatusFilter.length === StatusArray.length,
        });
        setOnGoingCollabStatusFilter(currentStatusFilter);
      }
      this.setState({showStatusFilter: false});
    } else if (type === 'Search') {
      if (
        // currentSearchValue.trim().length !== 0 &&
        currentSearchValue.trim().length < 3
      ) {
        this.setState({errorText: 'Search term length should be >= 3'});
        setTimeout(() => this.setState({errorText: ''}), 5000);
      } else {
        this.setState({errorText: ''});
        await Promise.all([
          setOnGoingCollabCurrentPage(1),
          setOnGoingCollabFileFilter(currentSearchValue.trim()),
        ]);
        getOnGoingCollaborationsNew();
      }
    }
  }

  clickConsentYes() {
    const {
      action,
      collaborationIdtoAbort,
      collaborationAction,
      imageFilePath,
      collaborationIdArray,
      fileType,
      yamlFilePath,
      clusterToDeploy,
    } = this.state;
    const {executeYaml} = this.props;
    const clusterSelected =
      clusterToDeploy === 'Default (Docker Host)' ? 'Default' : clusterToDeploy;

    if (action === 'abort') {
      abortTransfer(collaborationIdArray);
      this.setState({
        showConfirmRevokeModal: false,
      });
    } else if (action === 'DeployImage') {
      executeYaml(
        fileType,
        collaborationIdtoAbort,
        collaborationAction,
        true,
        imageFilePath,
        [clusterSelected],
      );
      this.setState({
        showConfirmRevokeModal: false,
      });
    } else {
      // call a check function to verify file exist or not.

      executeYaml(
        fileType,
        collaborationIdtoAbort,
        collaborationAction,
        false,
        yamlFilePath,
        [clusterSelected],
      );
      this.setState({
        showConfirmRevokeModal: false,
      });
    }
  }

  async handleReset() {
    const {
      getOnGoingCollaborationsNew,
      setOnGoingCollabCurrentPage,
      setOnGoingCollabStatusFilter,
      setOnGoingCollabFileFilter,
    } = this.props;

    await Promise.all([
      setOnGoingCollabCurrentPage(1),
      setOnGoingCollabStatusFilter([]),
      setOnGoingCollabFileFilter(''),
    ]);

    getOnGoingCollaborationsNew();

    this.setState({
      currentSearchValue: '',
      currentStatusFilter: [],
      statusFilterAll: true,
      errorText: '',
    });
  }

  toggleViewSelector(type) {
    const {getClusterListRCR} = this.props;
    if (type === 'Status') {
      this.setState({showStatusFilter: !this.state.showStatusFilter});
    } else if (type === 'Cluster') {
      getClusterListRCR();
      this.setState({showClusterFilter: !this.state.showClusterFilter});
    }
  }

  async showPreviousSet() {
    const {
      getOnGoingCollaborationsNew,
      setOnGoingCollabCurrentPage,
      collaborate: {onGoingCollabCurrentPage},
    } = this.props;
    await setOnGoingCollabCurrentPage(onGoingCollabCurrentPage - 1);
    getOnGoingCollaborationsNew();
  }

  async showNextSet() {
    const {
      getOnGoingCollaborationsNew,
      setOnGoingCollabCurrentPage,
      collaborate: {onGoingCollabCurrentPage},
    } = this.props;
    await setOnGoingCollabCurrentPage(onGoingCollabCurrentPage + 1);
    getOnGoingCollaborationsNew();
  }

  render() {
    const {
      eventViewer: {eventViewerStatus = false},

      appPreferences: {theme},
      system: {
        loader: {fetchingOnGoingCollab},
      },
      cluster: {
        clusterName,
        // health: {Running},
      },
      collaborate: {
        roostIoUserId,
        onGoingCollabNewData,
        onGoingCollabCurrentPage,
        onGoingCollabPageSize,
        onGoingCollabStatusFilter,
        onGoingCollabFileFilter,
      },
    } = this.props;

    const {
      showThisModal,
      svcTestResultModalData,
      certifyWorkloadModalData,
      fileType,
      showConfirmRevokeModal,
      collaborationAction,
      action,
      consentMessage,
      collaborationIdtoAbort,
      currentSearchValue,
      errorText,
      showStatusFilter,
      statusFilterAll,
      currentStatusFilter,
      showClusterFilter,
    } = this.state;

    const s = s1;

    const {collaborations, count, users, devices} = onGoingCollabNewData;
    const totalPages = Math.ceil(count / onGoingCollabPageSize);

    const Icon = {
      Certify: (av) => ({
        src: theme === 'Light' ? CertifiedIconLight : CertifiedIcon,
        handler: () => {
          const dataToSend = {
            gitops: {
              gitops_user: av.gitops_user,
              git_branch: av.git_branch,
              git_repo: av.git_repo,
              gitops_at: av.gitops_at,
              gitops_device_id: av.gitops_device_id,
            },
            senderInfo: users[av.gitops_user],
            certifyData: {
              collaboration_id: av.transfer_transaction_id,
              artifact_name: av.name,
              from_user_id: av.user_id,
            },
          };
          this.setState({
            showConfirmRevokeModal: false,
            showThisModal: 'certify',
            certifyWorkloadModalData: dataToSend,
          });
        },
        message: 'Certify',
      }),
      SvcTest: (av) => ({
        src: theme === 'Light' ? ServiceTestIconLight : ServiceTestIcon,
        handler: () => {
          const dataToSend = {
            collaboration_id: av.transfer_transaction_id,
            artifact_name: av.name,
            from_user_id: av.user_id,
            collab_message: av.message,
            senderInfo: users[av.user_id],
          };
          this.setState({
            showConfirmRevokeModal: false,

            showThisModal: 'svcTest',
            svcTestResultModalData: dataToSend,
          });
        },
        message: 'Open Service Test Result',
      }),
      Deploy: (av) => ({
        src: theme === 'Light' ? DeployLightIcon : DeployIcon,
        handler: () => {
          this.setState({showThisModal: ''});

          // if (Running === true) {
          const file_type = av.activity_type;
          let fileTypeToSend = 'yaml';
          if (file_type === 'Image') {
            fileTypeToSend = 'docker';
          } else if (file_type === 'helm') {
            fileTypeToSend = 'helm';
          }

          this.executeYamlFunction(
            av.transfer_transaction_id,
            false,
            fileTypeToSend,
            av.filepath,
            av.namespace,
          );
          // } else {
          // sendDataToElectronMainThread('addNotification', [
          //   {
          //     type: 'addError',
          //     heading: 'Collaboration',
          //     message: `Cluster should be up for ${
          //       av.activity_type === 'Image' ? 'Load' : 'Deploy'
          //     } Action`,
          //   },
          // ]);
          // }
        },
        message: av.activity_type === 'Image' ? 'Load' : 'Deploy',
      }),
      Delete: (av) => ({
        src: theme === 'Light' ? DeleteIconLight : DeleteIcon,
        handler: () => {
          this.setState({showThisModal: ''});

          // if (Running === true) {
          const file_type = av.activity_type;
          let fileTypeToSend = 'yaml';
          if (file_type === 'Image') {
            fileTypeToSend = 'docker';
          } else if (file_type === 'helm') {
            fileTypeToSend = 'helm';
          }
          this.executeYamlFunction(
            av.transfer_transaction_id,
            true,
            fileTypeToSend,
            av.filepath,
            av.namespace,
          );
          // } else {
          //   sendDataToElectronMainThread('addNotification', [
          //     {
          //       type: 'addError',
          //       heading: 'Collaboration',
          //       message: `Cluster should be up for Delete Action`,
          //     },
          //   ]);
          // }
        },
        message: 'Delete',
      }),
      Abort: (av) => ({
        src: theme === 'Light' ? AbortIconLight : AbortIcon,
        handler: () => {
          this.setState({showThisModal: ''});
          const collabarr = [];
          collabarr.push(av.transfer_transaction_id);
          this.abortTransferFunction(collabarr);
        },
        message: 'Abort',
      }),
      DeployDisable: {
        src: theme === 'Light' ? DeployIconNonClickLight : DeployIconNonClick,
        handler: () => {},
        message: 'Not Clickable',
      },
      DeleteDisable: {
        src: theme === 'Light' ? DeleteIconNonClickLight : DeleteIconNonClick,
        handler: () => {},
        message: 'Not Clickable',
      },
      AbortDisable: {
        src: theme === 'Light' ? AbortIconNonClickLight : AbortIconNonClick,
        handler: () => {},
        message: 'Not Clickable',
      },
    };

    const dataArray = [];

    collaborations &&
      collaborations.forEach((d) => {
        const senderInfo = users[d.activities[0].user_id];
        const recieverInfo = users[d.activities[0].to_user_id];

        let roosterInfo;
        if (senderInfo && senderInfo.id === roostIoUserId) {
          roosterInfo = recieverInfo;
        } else if (recieverInfo && recieverInfo.id === roostIoUserId) {
          roosterInfo = senderInfo;
        } else {
          roosterInfo = senderInfo || recieverInfo || {};
        }

        const fileNameArray = [];
        const namespaceArray = [];
        const deviceIdArray = [];
        const deviceNameArray = [];
        const statusArray = [];
        const changeStatusArray = [];
        const actionArray = [];

        d.activities.forEach((av) => {
          if (av.user_id === roostIoUserId) {
            fileNameArray.push({
              src: theme === 'Light' ? SenderIconLight : SenderIcon,
              name: _.get(av, 'name', ''),
            });
          } else {
            fileNameArray.push({
              src: theme === 'Light' ? ReceiveIconLight : ReceiveIcon,
              name: _.get(av, 'name', ''),
            });
          }

          namespaceArray.push(_.get(av, 'namespace', ''));

          let device_id = _.get(av, 'to_device_id', '');
          if (device_id === 'ALL') device_id = '';
          deviceIdArray.push(device_id);
          if (device_id) {
            deviceNameArray.push(
              _.get(devices, [device_id, 'device_name'], ''),
            );
          } else {
            deviceNameArray.push('');
          }

          const status = _.get(av, 'status', '');
          let progress = parseFloat(_.get(av, 'progress', '0'));
          if (status === 'In Progress' || status === 'Started') {
          } else if (status === 'Failed' || status === 'Aborted') {
            progress = 0.17;
          } else {
            progress = 1.0;
          }
          statusArray.push({
            status: status,
            progress: Math.round(progress * 100),
          });

          const cert = _.get(d, 'collaborationCertifications', []);
          let certTosend = [];
          if (cert.length > 0) {
            const d1 = cert[0];
            const u1 = users[d1.user_id] || {};
            certTosend.push({...d1, ...u1});
          }

          changeStatusArray.push({
            type: _.get(av, 'change_status', ''),
            certifyList: certTosend,
          });

          const file_type = _.get(av, 'activity_type', 'Image');

          if (status === 'In Progress' || status === 'Started') {
            actionArray.push([
              clusterName === 'roostapi' ? Icon.Abort(av) : Icon.AbortDisable,
            ]);
          } else if (status === 'Failed' || status === 'Aborted') {
            actionArray.push([
              Icon.AbortDisable,
              Icon.DeployDisable,
              Icon.DeleteDisable,
            ]);
          } else if (av.user_id === roostIoUserId) {
            actionArray.push([
              Icon.Certify(av),
              Icon.SvcTest(av),
              Icon.DeployDisable,
              Icon.DeleteDisable,
            ]);
          } else if (file_type === 'yaml' || file_type === 'helm') {
            actionArray.push([
              Icon.Certify(av),
              Icon.SvcTest(av),
              Icon.Deploy(av),
              Icon.Delete(av),
            ]);
          } else {
            actionArray.push([
              Icon.Certify(av),
              Icon.SvcTest(av),
              Icon.Deploy(av),
              Icon.DeleteDisable,
            ]);
          }
        });

        dataArray.push({
          roosterInfo,
          fileNameArray,
          date: {
            date: new Date(parseInt(d.collaboration_id) * 1000),
            format: 'time-stamp',
          },
          collaborationId: d.collaboration_id,
          namespaceArray,
          deviceIdArray,
          deviceNameArray,
          statusArray,
          change_status: changeStatusArray,
          actionArray,
        });
      });

    const onGoingStyles = cx(s.container, {
      [s.containerLight]: theme === 'Light',
      [s.containerEventViewer]: eventViewerStatus === true,
    });

    const ClusterTogglerStyles = cx(s.clusterToggler, {
      [s.toggleBorder]: showClusterFilter === true,
    });

    const StatusTogglerStyles = cx(s.statusToggler, {
      [s.toggleBorder]: showStatusFilter === true,
    });

    const NoOngoingCollaborationStyles = cx(s.noongoingcollaboration, {
      [s.noongoingcollaborationLight]: theme === 'Light',
    });

    const selectedFilters = () => {
      const selectedStatuses = [];
      const searchText = [];
      const errorDiv = [];

      const divider = (key) => (
        <div key={key} className={s.selectedChipsDivider}></div>
      );

      for (const key in onGoingCollabStatusFilter) {
        if (onGoingCollabStatusFilter[key]) {
          selectedStatuses.push(
            <div key={key} className={s.selectedfilter}>
              <Chip
                key={key}
                text={`${onGoingCollabStatusFilter[key]}`}
                showCrossIcon={false}
                theme={theme}
              />
            </div>,
          );
        }
      }

      if (selectedStatuses.length !== 0) {
        selectedStatuses.unshift(
          <div key={-1} className={s.statusFilter}>
            <p>Status:</p>
          </div>,
        );
      }

      if (onGoingCollabFileFilter) {
        searchText.push(
          <div key={'filename'} className={s.statusFilter}>
            <p>FileName:</p>
          </div>,
          <div key={'search'} className={s.selectedfilter}>
            <Chip
              key={'search'}
              text={onGoingCollabFileFilter}
              showCrossIcon={false}
              theme={theme}
            />
          </div>,
        );
      }

      if (selectedStatuses.length > 0 && searchText.length > 0) {
        searchText.unshift(divider('div1'));
      }

      if (errorText) {
        errorDiv.push(
          <div key={'error'} className={s.errorText}>
            <p>ERROR: {errorText}</p>
          </div>,
        );
      }

      if (
        (selectedStatuses.length > 0 || searchText.length > 0) &&
        errorDiv.length > 0
      ) {
        errorDiv.unshift(divider('div2'));
      }

      return [...selectedStatuses, ...searchText, ...errorDiv];
    };

    const StatusFilter = () => {
      const StatusFilter = StatusArray.map((n, i) => (
        <div
          key={i}
          className={s.checkbox}
          onClick={() => this.handleStatusFilter(n)}
        >
          {statusFilterAll || currentStatusFilter.indexOf(n) > -1 ? (
            <ImCheckboxChecked className={s.checkedIcon} />
          ) : (
            <ImCheckboxUnchecked className={s.uncheckedIcon} />
          )}
          <p>{n}</p>
        </div>
      ));
      return StatusFilter;
    };

    let ListOfCluster = _.get(this.props, 'rcr.clusterList', []) || [];
    ListOfCluster = ListOfCluster.filter((cl) => {
      if (
        cl === 'Local_Roost' ||
        cl === 'Local Roost' ||
        !['team', 'spawned', 'connected'].includes(
          _.get(cl, 'spec.type', 'managed'),
        ) ||
        cl === 'Default'
      ) {
        return false;
      }
      return true;
    });

    let ListOfClusterManaged = _.get(this.props, 'rcr.clusterList', []) || [];

    let clusterList;
    if (ListOfClusterManaged.length > 0) {
      clusterList = ListOfClusterManaged.filter((el) => el.spec).map((cls) => {
        return cls.spec.name;
      });
    } else {
      clusterList = [];
    }
    clusterList.unshift('Local Roost');

    if (this.state.action === 'DeployImage') {
      clusterList.unshift('Default (Docker Host)');
    }

    const clusterFilter = () => {
      const ClusterFilter = [
        {spec: {name: 'Local Roost'}},
        ...ListOfCluster,
      ].map((n, i) => (
        <div
          key={i}
          className={cx(s.checkbox, {
            [s.checkboxSelected]:
              clusterName === n.spec.name ||
              (clusterName === 'roostapi' && n.spec.name === 'Local Roost'),
          })}
          onClick={() => this.handleClusterDropdown(n.spec.name)}
        >
          <p>{n.spec.name}</p>
        </div>
      ));
      return ClusterFilter;
    };
    //console.log('CLUSTER LIST', clusterList);

    return (
      <div>
        {fetchingOnGoingCollab && <Loader />}
        {!fetchingOnGoingCollab && (
          <>
            <div className={onGoingStyles}>
              <div className={s.headingfilters}>
                <div className={s.headingCluster}>
                  <div className={s.heading}>Collaboration Activities</div>
                  <div className={s.verticalline}></div>
                  <div
                    className={s.clusterFilter}
                    id={'onGoingCollabClusterSelector'}
                  >
                    <div
                      className={ClusterTogglerStyles}
                      onClick={() => this.toggleViewSelector('Cluster')}
                    >
                      {clusterName === 'roostapi' ? 'Local Roost' : clusterName}
                      <img
                        src={
                          theme === 'Light' ? downArrowIconLight : downArrowIcon
                        }
                        className={s.downArrow}
                        alt=""
                      />
                    </div>
                    {showClusterFilter && (
                      <div className={s.clusterFilterBox}>
                        {clusterFilter()}
                      </div>
                    )}
                  </div>
                </div>
                <div className={s.filtersContainer}>
                  <div className={s.statusFilter} ref={this.statusFilterRef}>
                    <div
                      className={StatusTogglerStyles}
                      onClick={() => this.toggleViewSelector('Status')}
                    >
                      Status
                      <img
                        src={
                          theme === 'Light' ? downArrowIconLight : downArrowIcon
                        }
                        alt=""
                        className={s.downArrow}
                      />
                    </div>
                    {showStatusFilter && (
                      <div className={s.statusFilterBox}>
                        {StatusFilter()}

                        <div className={s.actionButtons}>
                          <button
                            className={s.clearall}
                            onClick={() => this.onClickClear('Status')}
                          >
                            Clear All
                          </button>
                          <button
                            className={s.apply}
                            onClick={() => this.onClickApply('Status')}
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={s.verticalline}></div>

                  <div className={s.searchBar}>
                    <input
                      type="text"
                      placeholder={'Search for file name (min. 3 chars) ...'}
                      value={currentSearchValue}
                      onChange={this.handleTextSearch}
                    />
                    <img
                      src={searchIcon}
                      alt=""
                      onClick={() => this.onClickApply('Search')}
                    />
                  </div>

                  <div className={s.verticalline}></div>

                  <div
                    className={s.resetButton}
                    onClick={() => this.handleReset()}
                  >
                    Reset
                  </div>
                </div>
              </div>

              <div className={s.selectedFilters}>{selectedFilters()}</div>

              {count > 0 ? (
                <div className={s.tableContainer}>
                  <div className={s.tableContainerBox}>
                    <Table
                      head={tableViewConfig.onGoingCollaborations}
                      data={dataArray}
                      recordsPerPage={onGoingCollabPageSize}
                      theme={theme}
                      noFooter={true}
                      rowbreak
                    />
                  </div>
                  <TableFooter
                    currentPage={onGoingCollabCurrentPage}
                    pageSize={onGoingCollabPageSize}
                    totalPages={totalPages}
                    showPreviousSet={() => this.showPreviousSet()}
                    showNextSet={() => this.showNextSet()}
                    count={count}
                    theme={theme}
                  />
                  {action === 'abort' ? (
                    <ConfirmAction
                      open={showConfirmRevokeModal}
                      dialogClose={() =>
                        this.setState({showConfirmRevokeModal: false})
                      }
                      theme={theme}
                      consentMessage={consentMessage}
                      confirmConsentYes={() => {
                        executeYaml(
                          fileType,
                          collaborationIdtoAbort,
                          collaborationAction,
                        );
                        this.setState({
                          showConfirmRevokeModal: false,
                        });
                      }}
                    />
                  ) : (
                    <Modal
                      open={showConfirmRevokeModal}
                      closeHandler={() =>
                        this.setState({
                          showConfirmRevokeModal: false,
                          clusterToDeploy:
                            clusterName === 'roostapi'
                              ? 'Local Roost'
                              : clusterName,
                        })
                      }
                      theme={theme}
                      // minHeight={'130px'}
                      width={'470px'}
                    >
                      <div className={s.confirmContainer}>
                        <div className={s.heading}>Choose Target Cluster</div>

                        <div className={s.consentContainer}>
                          <div className={s.consentMessageOngoing}>
                            {consentMessage}
                          </div>
                          <div className={s.consentMessageDropdown}>
                            <Dropdowncollab
                              theme={theme}
                              list={clusterList}
                              id="clusterSelectorDeploy"
                              type={'cluster'}
                              value={this.state.clusterToDeploy}
                              changeFunction={(item) =>
                                this.setState({clusterToDeploy: item})
                              }
                            />
                          </div>
                        </div>

                        <div className={s.footer}>
                          <CollaborateButton
                            styles={{
                              margin: '9px 0 0 15px',
                              padding: '2px 30px',
                            }}
                            clickHandler={() => this.clickConsentYes()}
                          >
                            {action === 'DeployImage'
                              ? 'Load'
                              : action === 'Deploy'
                              ? 'Deploy'
                              : 'Delete'}
                          </CollaborateButton>

                          <CollaborateButton
                            styles={{
                              margin: '9px 0 0 15px',
                              padding: '2px 30px',
                              backgroundColor: '#ff6b6a',
                            }}
                            clickHandler={() =>
                              this.setState({
                                showConfirmRevokeModal: false,
                                clusterToDeploy:
                                  clusterName === 'roostapi'
                                    ? 'Local Roost'
                                    : clusterName,
                              })
                            }
                          >
                            Cancel
                          </CollaborateButton>
                        </div>
                      </div>
                    </Modal>
                  )}
                  <div>
                    <Modal
                      open={showThisModal === 'svcTest'}
                      closeHandler={this.handleCloseModal}
                      width={'620px'}
                      padding={'10px'}
                      theme={theme}
                    >
                      <SvcTestResults
                        theme={theme}
                        initData={svcTestResultModalData}
                      />
                    </Modal>
                  </div>

                  <div>
                    <Modal
                      open={showThisModal === 'certify'}
                      closeHandler={this.handleCloseModal}
                      minHeight={'200px'}
                      minWidth={'500px'}
                      padding={'10px'}
                      theme={theme}
                    >
                      <CertifyWorkload
                        theme={theme}
                        closeModal={this.handleCloseModal}
                        certifyWorkloadData={certifyWorkloadModalData}
                      />
                    </Modal>
                  </div>
                </div>
              ) : (
                <div className={NoOngoingCollaborationStyles}>
                  <img
                    src={
                      theme === 'Light'
                        ? noongoingcollaborationimageLight
                        : noongoingcollaborationimage
                    }
                    alt=""
                    className={s.norequestimage}
                  />
                  <p className={s.noOnGoingCollabMsg}>
                    You don't have any collaboration activity
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }
}

const mapActionToProps = {
  getOnGoingCollaborationsNew,
  setOnGoingCollabCurrentPage,
  setOnGoingCollabStatusFilter,
  setOnGoingCollabFileFilter,
  executeYaml,
  abortTransfer,
  getClusterListRCR,
  setClusterName,
  refreshDetails,
  setToken,
  getDefaultDaemonConfig,
  getDockerHostRunningStatus,
};

export default connect((state) => state, mapActionToProps)(OnGoingCollab);
