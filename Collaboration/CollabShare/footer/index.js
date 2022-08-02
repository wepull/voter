import React, {Component} from 'react';
import {connect} from 'react-redux';
import * as _ from 'lodash';
import https from 'https';
import cx from 'classnames';
import * as s from './footer.module.scss';
import {
  submitWorkload,
  setSendButtonStatus,
  submitTeamWorkload,
} from '../../../../actions/collaborateShare';
import {sendDataToElectronBrowserWindow} from '../../../../utils/electronBridges';
import {SYSTEM_NAMESPACES} from '../../../../constants/collaborateShare';
import {pushImageToTeamCluster} from '../../../../actions/collaborateShare';

const agent = new https.Agent({
  rejectUnauthorized: false,
});

class Footer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      transferOnly: false,
      isSendDisable: false,
    };

    this.handleSend = this.handleSend.bind(this);
  }

  componentDidMount() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.keyCode === 13) {
        this.handleSend();
      }
    });
  }

  async handleSend() {
    const {
      collaborateShare: {collabWithType = 'rooster'},
    } = this.props;

    if (collabWithType === 'rooster') {
      this.handleSendRooster();
    } else if (collabWithType === 'team') {
      this.handleSendTeam();
    } else if (collabWithType === 'team cluster') {
      // this.handleSendTeamCluster();
    }
  }
  async handleSendTeamCluster() {
    const {pushImageToTeamCluster, setSendButtonStatus} = this.props;

    const {
      selectedNamespace = '',
      selectedImagesToSend = [],
      yamlFilePath = '',
      shareFileType = 'yaml',
      helmChartPath = '',
      ReleaseName = '',
    } = this.props.collaborateShare;

    let is_sysns = false;

    SYSTEM_NAMESPACES.forEach((d) => {
      if (d === selectedNamespace) {
        is_sysns = true;
      }
    });

    if (!this.checkNamespace(selectedNamespace)) {
      sendDataToElectronBrowserWindow('addNotification', [
        {
          type: 'addError',
          header: `Collaboration Share`,
          message: `\u26A0 Namespace: Only lowercase alphanumeric with optional dash`,
        },
      ]);
    } else if (
      shareFileType === 'helm chart' &&
      !this.checkReleaseName(ReleaseName)
    ) {
      sendDataToElectronBrowserWindow('addNotification', [
        {
          type: 'addError',
          header: `Collaboration Share`,
          message: `\u26A0 ReleaseName: Only lowercase alphanumeric with optional dash and length less than 54`,
        },
      ]);
    } else if (is_sysns) {
      sendDataToElectronBrowserWindow('addNotification', [
        {
          type: 'addError',
          header: `Collaboration Share`,
          message: `${selectedNamespace} is a reserved namespace`,
        },
      ]);
    } else if (
      shareFileType === 'yaml' &&
      (yamlFilePath === '' || yamlFilePath === '/yaml.yaml')
    ) {
      sendDataToElectronBrowserWindow('addNotification', [
        {
          type: 'addError',
          header: `Collaboration Share`,
          message: `Select project from the treeview or select YAML first.`,
        },
      ]);
    } else if (shareFileType === 'helm chart' && helmChartPath === '') {
      sendDataToElectronBrowserWindow('addNotification', [
        {
          type: 'addError',
          header: `Collaboration Share`,
          message: `Select project from the treeview or select Helm Chart first.`,
        },
      ]);
    } else if (shareFileType === 'image' && selectedImagesToSend.length === 0) {
      sendDataToElectronBrowserWindow('addNotification', [
        {
          type: 'addError',
          header: `Collaboration Share`,
          message: `Select Image or build one to select image.`,
        },
      ]);
    } else {
      let dataObjectToSendforImage = {
        ImageList: selectedImagesToSend,
        YamlFilePath: '',
        Namespace: '',
        TransferOnly: true,
        WorkloadType: {
          helm: false,
          image: true,
          yaml: false,
        },
        HelmChartPath: '',
        ReleaseName: '',
      };
      let dataObjectToSendforYAML = {
        ImageList: selectedImagesToSend,
        YamlFilePath: yamlFilePath,
        Namespace: selectedNamespace || 'default',
        TransferOnly: false,
        WorkloadType: {
          helm: false,
          image: true,
          yaml: true,
        },
        HelmChartPath: '',
        ReleaseName: '',
      };
      let dataObjectToSendforHelm = {
        ImageList: selectedImagesToSend,
        YamlFilePath: '',
        Namespace: selectedNamespace || 'default',
        TransferOnly: false,
        WorkloadType: {
          helm: true,
          image: true,
          yaml: false,
        },
        HelmChartPath: helmChartPath,
        ReleaseName: ReleaseName,
      };

      this.setState({
        isSendDisable: true,
      });
      setSendButtonStatus(true);
      if (shareFileType === 'image') {
        await pushImageToTeamCluster(dataObjectToSendforImage);
      } else {
        if (shareFileType === 'yaml') {
          if (
            dataObjectToSendforYAML.ImageList &&
            dataObjectToSendforYAML.ImageList.length > 0
          ) {
            await pushImageToTeamCluster(dataObjectToSendforYAML);
          } else {
            dataObjectToSendforYAML.WorkloadType.image = false;
            dataObjectToSendforYAML.transferOnly = false;
            await pushImageToTeamCluster(dataObjectToSendforYAML);
          }
        } else {
          if (
            dataObjectToSendforHelm.ImageList &&
            dataObjectToSendforHelm.ImageList.length > 0
          ) {
            await pushImageToTeamCluster(dataObjectToSendforHelm);
          } else {
            dataObjectToSendforHelm.WorkloadType.image = false;
            dataObjectToSendforHelm.transferOnly = false;
            await pushImageToTeamCluster(dataObjectToSendforHelm);
          }
        }
      }
    }
  }

  async handleSendRooster() {
    const {submitWorkload, setSendButtonStatus} = this.props;

    const {
      selectedNamespace = '',
      shareWithRoosterName = {},
      selectedImagesToSend = [],
      yamlFilePath = '',
      shareFileType = 'yaml',
      helmChartPath = '',
      ReleaseName = '',
    } = this.props.collaborateShare;
    const {roostIoUserName} = this.props.collaborate;

    const username = _.get(shareWithRoosterName, 'username', '');
    const fname = _.get(shareWithRoosterName, 'first_name', '');
    const lname = _.get(shareWithRoosterName, 'last_name', '');
    const name = `${fname} ${lname}`;
    const targetUser = username;
    let is_sysns = false;

    SYSTEM_NAMESPACES.forEach((d) => {
      if (d === selectedNamespace) {
        is_sysns = true;
      }
    });

    // console.log("selectedNamespace: ", selectedNamespace);
    // console.log("shareWithRoosterName: ", shareWithRoosterName);
    // console.log("name: ", name);
    // console.log("selectedImagesToSend: ", selectedImagesToSend);
    // console.log("yamlFilePath: ", yamlFilePath);

    if (Object.keys(shareWithRoosterName).length === 0) {
      sendDataToElectronBrowserWindow('addNotification', [
        {
          type: 'addError',
          header: `Collaboration Share`,
          message: `Add Rooster first`,
        },
      ]);
    } else if (!this.checkNamespace(selectedNamespace)) {
      sendDataToElectronBrowserWindow('addNotification', [
        {
          type: 'addError',
          header: `Collaboration Share`,
          message: `\u26A0 Namespace: Only lowercase alphanumeric with optional dash`,
        },
      ]);
    } else if (
      shareFileType === 'helm chart' &&
      !this.checkReleaseName(ReleaseName)
    ) {
      sendDataToElectronBrowserWindow('addNotification', [
        {
          type: 'addError',
          header: `Collaboration Share`,
          message: `\u26A0 ReleaseName: Only lowercase alphanumeric with optional dash and length less than 54`,
        },
      ]);
    } else if (is_sysns) {
      sendDataToElectronBrowserWindow('addNotification', [
        {
          type: 'addError',
          header: `Collaboration Share`,
          message: `${selectedNamespace} is a reserved namespace`,
        },
      ]);
    } else if (
      shareFileType === 'yaml' &&
      (yamlFilePath === '' || yamlFilePath === '/yaml.yaml')
    ) {
      sendDataToElectronBrowserWindow('addNotification', [
        {
          type: 'addError',
          header: `Collaboration Share`,
          message: `Select project from the treeview or select YAML first.`,
        },
      ]);
    } else if (shareFileType === 'helm chart' && helmChartPath === '') {
      sendDataToElectronBrowserWindow('addNotification', [
        {
          type: 'addError',
          header: `Collaboration Share`,
          message: `Select project from the treeview or select Helm Chart first.`,
        },
      ]);
    } else if (shareFileType === 'image' && selectedImagesToSend.length === 0) {
      sendDataToElectronBrowserWindow('addNotification', [
        {
          type: 'addError',
          header: `Collaboration Share`,
          message: `Select Image or build one to select image.`,
        },
      ]);
    } else {
      const dataObjectToSendforYAML = {
        SourceRoostHandle: roostIoUserName,
        TargetRoostHandle: targetUser,
        TargetDeviceList: [], // [] array
        YamlFilePath: yamlFilePath, // string
        ImageList: selectedImagesToSend, // [] array
        TransferOnly: this.state.transferOnly, // false bcz we want to deploy also.
        Namespace: selectedNamespace || 'default',
        httpsAgent: agent,
        WorkloadType: {
          helm: false,
          image: true,
          yaml: true,
        },
        HelmChartPath: '',
        ReleaseName: '',
      };

      const dataObjectToSendforHelm = {
        SourceRoostHandle: roostIoUserName,
        TargetRoostHandle: targetUser,
        TargetDeviceList: [], // [] array
        YamlFilePath: '', // string
        ImageList: selectedImagesToSend, // [] array
        TransferOnly: this.state.transferOnly, // false bcz we want to deploy also.
        Namespace: selectedNamespace || 'default',
        httpsAgent: agent,
        WorkloadType: {
          helm: true,
          image: true,
          yaml: false,
        },
        HelmChartPath: helmChartPath,
        ReleaseName: ReleaseName,
      };

      const dataObjectToSendforImage = {
        SourceRoostHandle: roostIoUserName,
        TargetRoostHandle: targetUser,
        TargetDeviceList: [], // [] array
        YamlFilePath: '', // string
        ImageList: selectedImagesToSend, // [] array
        TransferOnly: true, // true bcz we are just sharing image, it can't be deployed.
        Namespace: '',
        httpsAgent: agent,
        WorkloadType: {
          helm: false,
          image: true,
          yaml: false,
        },
        HelmChartPath: '',
        ReleaseName: '',
      };
      this.setState({
        isSendDisable: true,
      });
      setSendButtonStatus(true);
      if (shareFileType === 'image') {
        await submitWorkload(dataObjectToSendforImage, name);
      } else {
        if (shareFileType === 'yaml') {
          if (
            dataObjectToSendforYAML.ImageList &&
            dataObjectToSendforYAML.ImageList.length > 0
          ) {
            await submitWorkload(dataObjectToSendforYAML, name);
          } else {
            dataObjectToSendforYAML.WorkloadType.image = false;
            dataObjectToSendforYAML.transferOnly = false;
            await submitWorkload(dataObjectToSendforYAML, name);
          }
        } else {
          if (
            dataObjectToSendforHelm.ImageList &&
            dataObjectToSendforHelm.ImageList.length > 0
          ) {
            await submitWorkload(dataObjectToSendforHelm, name);
          } else {
            dataObjectToSendforHelm.WorkloadType.image = false;
            dataObjectToSendforHelm.transferOnly = false;
            await submitWorkload(dataObjectToSendforHelm, name);
          }
        }
      }
      // console.log("sent")
    }
  }

  async handleSendTeam() {
    const {submitTeamWorkload, setSendButtonStatus} = this.props;

    const {
      selectedNamespace = '',
      // shareWithTeamDetails = {},
      selectedImagesToSend = [],
      yamlFilePath = '',
      shareFileType = 'yaml',
      teamTargetUsers = [],
      helmChartPath = '',
      ReleaseName = '',
    } = this.props.collaborateShare;
    // const {teamDetails} = this.props.teamView
    // console.log("Props",this.props.collaborateShare)
    const {roostIoUserName} = this.props.collaborate;

    const {teamDetails} = this.props.teamView;
    console.log('teamDetails', teamDetails);
    const team_id = _.get(teamDetails, 'id', '');
    const team_name = _.get(teamDetails, 'name', '');
    console.log(team_id);
    let is_sysns = false;
    SYSTEM_NAMESPACES.forEach((d) => {
      if (d === selectedNamespace) {
        is_sysns = true;
      }
    });

    if (Object.keys(teamDetails).length === 0) {
      sendDataToElectronBrowserWindow('addNotification', [
        {
          type: 'addError',
          heading: `Collaboration Share`,
          message: `Add Team first`,
        },
      ]);
    } else if (teamDetails.numOfMembers && teamDetails.numOfMembers === 1) {
      sendDataToElectronBrowserWindow('addNotification', [
        {
          type: 'addError',
          heading: `Collaboration Share`,
          message: `Add Members to Team first`,
        },
      ]);
    } else if (!this.checkNamespace(selectedNamespace)) {
      sendDataToElectronBrowserWindow('addNotification', [
        {
          type: 'addError',
          header: `Collaboration Share`,
          message: `\u26A0 Namespace: Only lowercase alphanumeric with optional dash`,
        },
      ]);
    } else if (
      shareFileType === 'helm chart' &&
      !this.checkReleaseName(ReleaseName)
    ) {
      sendDataToElectronBrowserWindow('addNotification', [
        {
          type: 'addError',
          header: `Collaboration Share`,
          message: `\u26A0 ReleaseName: Only lowercase alphanumeric with optional dash and length less than 54`,
        },
      ]);
    } else if (is_sysns) {
      sendDataToElectronBrowserWindow('addNotification', [
        {
          type: 'addError',
          header: `Collaboration Share`,
          message: `${selectedNamespace} is a reserved namespace`,
        },
      ]);
    } else if (
      shareFileType === 'yaml' &&
      (yamlFilePath === '' || yamlFilePath === '/yaml.yaml')
    ) {
      sendDataToElectronBrowserWindow('addNotification', [
        {
          type: 'addError',
          header: `Collaboration Share`,
          message: `Select project from the treeview or select YAML first.`,
        },
      ]);
    } else if (shareFileType === 'helm chart' && helmChartPath === '') {
      sendDataToElectronBrowserWindow('addNotification', [
        {
          type: 'addError',
          header: `Collaboration Share`,
          message: `Select project from the treeview or select YAML first.`,
        },
      ]);
    } else if (shareFileType === 'image' && selectedImagesToSend.length === 0) {
      sendDataToElectronBrowserWindow('addNotification', [
        {
          type: 'addError',
          header: `Collaboration Share`,
          message: `Select Image or build one to select image.`,
        },
      ]);
    } else {
      const dataObjectToSendforYAML = {
        SourceRoostHandle: roostIoUserName,
        TargetRoostHandles: [...teamTargetUsers],
        TeamName: team_name,
        team_id: team_id,
        YamlFilePath: yamlFilePath, // string
        ImageList: selectedImagesToSend, // [] array
        TransferOnly: this.state.transferOnly, // false bcz we want to deploy also.
        Namespace: selectedNamespace || 'default',
        httpsAgent: agent,
        WorkloadType: {
          helm: false,
          image: true,
          yaml: true,
        },
        HelmChartPath: '',
        ReleaseName: '',
      };

      const dataObjectToSendforHelm = {
        SourceRoostHandle: roostIoUserName,
        TargetRoostHandles: [...teamTargetUsers],
        TeamName: team_name,
        team_id: team_id,
        YamlFilePath: '', // string
        ImageList: selectedImagesToSend, // [] array
        TransferOnly: this.state.transferOnly, // false bcz we want to deploy also.
        Namespace: selectedNamespace || 'default',
        httpsAgent: agent,
        WorkloadType: {
          helm: true,
          image: true,
          yaml: false,
        },
        HelmChartPath: helmChartPath,
        ReleaseName: ReleaseName,
      };

      const dataObjectToSendforImage = {
        SourceRoostHandle: roostIoUserName,
        TargetRoostHandles: [...teamTargetUsers],
        TeamName: team_name,
        team_id: team_id,
        YamlFilePath: '', // string
        ImageList: selectedImagesToSend, // [] array
        TransferOnly: true, // true bcz we are just sharing image, it can't be deployed.
        Namespace: '',
        httpsAgent: agent,
        WorkloadType: {
          helm: false,
          image: true,
          yaml: false,
        },
        HelmChartPath: '',
        ReleaseName: '',
      };
      this.setState({
        isSendDisable: true,
      });
      setSendButtonStatus(true);
      if (shareFileType === 'image') {
        await submitTeamWorkload(dataObjectToSendforImage, team_name);
      } else {
        if (shareFileType === 'yaml') {
          if (
            dataObjectToSendforYAML.ImageList &&
            dataObjectToSendforYAML.ImageList.length > 0
          ) {
            await submitTeamWorkload(dataObjectToSendforYAML, team_name);
          } else {
            dataObjectToSendforYAML.WorkloadType.image = false;
            dataObjectToSendforYAML.transferOnly = false;
            await submitTeamWorkload(dataObjectToSendforYAML, team_name);
          }
        } else {
          if (
            dataObjectToSendforHelm.ImageList &&
            dataObjectToSendforHelm.ImageList.length > 0
          ) {
            await submitTeamWorkload(dataObjectToSendforHelm, team_name);
          } else {
            dataObjectToSendforHelm.WorkloadType.image = false;
            dataObjectToSendforHelm.transferOnly = false;
            await submitTeamWorkload(dataObjectToSendforHelm, team_name);
          }
        }
      }
      // console.log("sent")
    }
  }

  handleClose() {
    sendDataToElectronBrowserWindow('closeCollaborationWindow');
  }

  checkNamespace(value) {
    if (value === null || value === '') {
      return true;
    }
    return /^[a-z0-9]+([a-z0-9-]*[a-z0-9])?$/.test(value);
  }
  checkReleaseName(value) {
    if (value === null || value === '' || value.length > 53) {
      return false;
    }
    return /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/.test(
      value,
    );
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    const status = _.get(nextProps, 'collaborateShare.sendButtonStatus');
    return {
      isSendDisable: status,
    };
  }

  render() {
    const {
      appPreferences: {theme},
    } = this.props;

    const footerContainer = cx(s.footerContainer, {
      [s.footerContainerLight]: theme === 'Light',
    });

    const cancelButton = cx(s.cancelButton, {
      [s.cancelButtonLight]: theme === 'Light',
    });

    const sendButton = cx(s.sendButton, {
      [s.sendButtonLight]: theme === 'Light',
      [s.sendButtonDisable]: this.state.isSendDisable,
    });

    return (
      <div className={footerContainer}>
        <div
          className={cancelButton}
          onClick={() => {
            this.handleClose();
          }}
        >
          <span>Cancel</span>
        </div>
        <button
          className={sendButton}
          onClick={this.handleSend}
          disabled={this.state.isSendDisable}
        >
          Send
        </button>
      </div>
    );
  }
}

const mapActionToProps = {
  submitWorkload,
  submitTeamWorkload,
  setSendButtonStatus,
  pushImageToTeamCluster,
};

export default connect((state) => state, mapActionToProps)(Footer);
