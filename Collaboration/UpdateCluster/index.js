import React, {Component} from 'react';
import {connect} from 'react-redux';
import cx from 'classnames';
import * as _ from 'lodash';
import axios from 'axios';
import https from 'https';
import Modal from '../../Modal';
import CheckBox from '../../CheckBox';
import Dropdown from '../Dropdowncollab';
import RadioButton from '../../RadioButton';
import * as s from '../UpdateCluster/updateCluster.module.scss';
import {
  getMyJoinedTeams,
  getAllClusterDetails,
  getDetailsTeam,
} from '../../../actions/teamView';
import {sendDataToElectronMainThread} from '../../../utils/electronBridges';
import {gitkindarray} from '../../../utils/preferenceUtils';

import {registerTeamClusterUrl, updateTeamUrl} from '../../../utils/apiConfig';

const agent = new https.Agent({
  rejectUnauthorized: true,
});
class UpdateClusterDetails extends Component {
  _isMounted = false;
  constructor(props) {
    super(props);
    this.state = {
      errorMessage: '',
      config: {},
      username: '',
      reponame: '',
      accesstoken: '',
      stagingBranch: '',
      gitkind: 'github',
      jenkinsEnabled: false,
      rbac_scope: false,
      clusterName: '',
      clusterId: '',
      customerEmail: '',
      customerToken: '',
    };
    this.handleClickCancel = this.handleClickCancel.bind(this);
    this.updateTeamCluster = this.updateTeamCluster.bind(this);
    this.updateClusterConfigs = this.updateClusterConfigs.bind(this);
    this.getRbacScope = this.getRbacScope.bind(this);
  }

  updateClusterConfigs = async () => {
    const {
      addDialogClose = () => console.log('Close Happened by Send'),
    } = this.props;
    const {
      clusterName,
      username,
      jenkinsEnabled,
      gitkind,
      accesstoken,
      reponame,
    } = this.state;
    const gitserver = gitkindarray[gitkind];
    this.updateTeamCluster();
    if (jenkinsEnabled) {
      sendDataToElectronMainThread('enableJenkins', [
        clusterName,
        username,
        gitkind,
        gitserver,
        accesstoken,
        reponame,
      ]);
    }
    addDialogClose();
  };

  async updateTeamCluster() {
    const {
      collaborate: {roostIOKey},
      teamView: {teamViewTeam, teamDetails},
      getMyJoinedTeams,
      getDetailsTeam,
    } = this.props;

    const {
      username,
      jenkinsEnabled,
      gitkind,
      accesstoken,
      stagingBranch,
      reponame,
      clusterId,
      customerEmail,
      customerToken,
      rbac_scope,
    } = this.state;

    const obj = {
      team_id: teamViewTeam.team_id,
      cluster_id: clusterId,
      customer_token: customerToken,
      customer_email: customerEmail,
      rbac_scope: rbac_scope ? 'namespace' : 'admin',
    };
    console.log(this.state);

    try {
      await axios
        .post(registerTeamClusterUrl(), obj, {
          httpsAgent: agent,
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + roostIOKey,
          },
        })
        .then(async () => {
          await axios
            .post(
              updateTeamUrl(),
              {
                team_id: teamViewTeam.team_id,
                config: {
                  team_cluster_id: clusterId,
                  gitUsername: username,
                  gitkind: gitkind,
                  gittoken: accesstoken,
                  stagingBranch,
                  gitrepo: reponame,
                  jenkinsEnabled: jenkinsEnabled,
                },
              },
              {
                httpsAgent: agent,
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: 'Bearer ' + roostIOKey,
                },
              },
            )
            .then(() => {
              sendDataToElectronMainThread('addNotification', [
                {
                  type: 'addSuccess',
                  heading: 'Team Cluster Updated Successfully ',
                  message: `${'Action Performed for team ' + teamDetails.name}`,
                },
              ]);
              getMyJoinedTeams();
              getDetailsTeam(teamViewTeam.team_id);
            })
            .catch((e) => {
              console.log('Error: updateTeamConfig with teamClusterID', e);
              sendDataToElectronMainThread('addNotification', [
                {
                  type: 'addError',
                  heading: '',
                  message: 'Error Occured: updateTeamConfig with teamClusterID',
                },
              ]);
            });
        })
        .catch((e) => {
          console.log('Error: registerTeamCluster', e);
          sendDataToElectronMainThread('addNotification', [
            {
              type: 'addError',
              heading: '',
              message: 'Error Occured: registerTeamCluster',
            },
          ]);
        });
    } catch (e) {
      console.log(e);
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.open !== prevProps.open) {
      this.handleClickCancel();
    }
  }

  componentDidMount() {
    this._isMounted = true;
    const {
      teamView: {teamViewTeam, teamDetails},
      getAllClusterDetails,
    } = this.props;

    if (this._isMounted && teamViewTeam.team_id === teamDetails.id) {
      this.setState({
        clusterName: teamDetails.name,
        clusterId: teamDetails.config.team_cluster_id,
        description: teamDetails.description,
        visibility: teamDetails.visibility,
        org: teamDetails.org ? teamDetails.org : '',
        config: {...this.state.config, ...teamDetails.config},
      });
      this.getRbacScope(teamDetails.config.team_cluster_id);
    }
    getAllClusterDetails();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  getRbacScope(clusterId) {
    const {
      teamView: {teamViewTeam},
      collaborate: {roostIOKey},
    } = this.props;
    let getrbacscopeUrl = 'https://roost.io/api/application/getRbacScope';
    let PayloadData = {
      team_id: teamViewTeam.team_id,
      cluster_id: clusterId,
    };
    let Authenticate_config = {
      method: 'post',
      url: getrbacscopeUrl,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${roostIOKey}`,
      },
      data: PayloadData,
    };

    axios(Authenticate_config)
      .then((response) => {
        let rbac_value = _.get(response.data, 'rbac_scope', '') === 'namespace';
        this.setState({rbac_scope: rbac_value});
      })
      .catch((error) => {
        if (error) console.log('error: ', error);
      });
  }

  handleClickCancel = () => {
    const {
      teamView: {teamViewTeam, teamDetails},
    } = this.props;
    if (teamViewTeam.team_id === teamDetails.id) {
      this.getRbacScope(teamDetails.config.team_cluster_id);
      this.setState({
        flag: true,
        errorMessage: '',
        errorMessageOrg: '',
        clusterName: teamDetails.name,
        description: teamDetails.description,
        visibility: teamDetails.visibility,
        org: teamDetails.org ? teamDetails.org : '',
        config: {...this.state.config, ...teamDetails.config},
        username: '',
        reponame: '',
        accesstoken: '',
        gitkind: 'github',
        stagingBranch: '',
        jenkinsEnabled: false,
        clusterId: teamDetails.config.team_cluster_id,
        customerEmail: '',
        customerToken: '',
      });
    } else {
      this.setState({
        flag: false,
        errorMessage: '',
        errorMessageOrg: '',
        clusterName: '',
        description: '',
        visibility: 'private',
        org: '',
        config: {...this.state.config},
        username: '',
        reponame: '',
        accesstoken: '',
        stagingBranch: '',
        gitkind: 'github',
        jenkinsEnabled: false,
        clusterId: '',
        customerEmail: '',
        customerToken: '',
      });
    }
  };

  render() {
    const {
      open = false,
      addDialogClose = () => console.log('Close clicked'),
      theme,
      teamView: {teamDetails, myClusterList},
    } = this.props;
    const {
      username,
      jenkinsEnabled,
      accesstoken,
      stagingBranch,
      gitkind,
      reponame,
      rbac_scope,
    } = this.state;
    console.log(teamDetails);
    const addTeamFormStyles = cx(s.addTeamForm, {
      [s.addTeamFormLight]: theme === 'Light',
    });
    const projectHeading = cx(s.projectHeading, {
      [s.projectHeadingLight]: theme === 'Light',
    });
    const noProjectFound = cx(s.noProjectFound, {
      [s.noProjectFoundLight]: theme === 'Light',
    });
    const gitarray = [
      'github',
      // 'gitlab',
      // 'gitea',
      // 'bitbucketcloud',
      // 'bitbucketserver',
    ];

    const teamClusterList = () => {
      const allClusterName = [];

      myClusterList.forEach((cl, i) => {
        allClusterName.push(
          <div key={i} className={s.projectIndividual}>
            <RadioButton
              theme={theme}
              name="clusterlist"
              title={`${cl.id} - ${cl.alias}`}
              checked={this.state.clusterId === cl.id}
              onChangeFunction={() => {
                this.setState({
                  clusterName: cl.alias,
                  clusterId: cl.id,
                  customerEmail: cl.customer_email,
                  customerToken: cl.customer_token,
                });
                this.getRbacScope(cl.id);
              }}
            />
          </div>,
        );
      });

      if (allClusterName.length === 0)
        return [
          <div key={-1} className={s.teamSelector}>
            <p className={s.noTeamOption}>You do not own any Remote Cluster</p>
          </div>,
        ];
      return [...allClusterName];
    };

    return (
      <Modal
        open={open}
        closeHandler={addDialogClose}
        minHeight={'150px'}
        padding={'10px'}
        theme={theme}
      >
        <div className={addTeamFormStyles}>
          <div className={s.mainScreen}>
            <div className={s.leftList}>
              <div className={projectHeading}> Cluster list </div>
              <div className={s.projectList}>
                {teamClusterList().length > 0 ? (
                  teamClusterList()
                ) : (
                  <div className={noProjectFound}> No Project found</div>
                )}
              </div>
            </div>
            <div className={s.rightList}>
              <div className={s.heading}>Git Configuration</div>
              <div className={s.divider} />
              <div className={s.configContainer}>
                <div className={s.eachInputRow}>
                  <div className={s.title}>Kind :</div>
                  <div className={s.typeInputs}>
                    <Dropdown
                      theme={theme}
                      list={gitarray}
                      type="text"
                      id="gitkind"
                      value={gitkind}
                      changeFunction={(item) => this.setState({gitkind: item})}
                    />
                  </div>
                </div>
                <div className={s.eachInputRow}>
                  <div className={s.title}>User name :</div>
                  <div className={s.typeInputs}>
                    <input
                      type="text"
                      onChange={(e) =>
                        this.setState({username: e.target.value})
                      }
                      value={username}
                    />
                  </div>
                </div>

                <div className={s.eachInputRow}>
                  <div className={s.title}>Access token :</div>
                  <div className={s.typeInputs}>
                    <input
                      type="text"
                      onChange={(e) =>
                        this.setState({accesstoken: e.target.value})
                      }
                      value={accesstoken}
                    />
                  </div>
                </div>
                <div className={s.eachInputRow}>
                  <div className={s.title}>Staging branch:</div>
                  <div className={s.typeInputs}>
                    <input
                      type="text"
                      onChange={(e) =>
                        this.setState({stagingBranch: e.target.value})
                      }
                      value={stagingBranch}
                    />
                  </div>
                </div>
                <div className={s.eachInputRow}>
                  <div className={s.checkBoxInput}>
                    <CheckBox
                      theme={theme}
                      styles={{height: '20px'}}
                      name="jenkins"
                      title={'Restrict user access to namespace'}
                      checked={rbac_scope}
                      onChangeFunction={() => {
                        this.setState({
                          rbac_scope: !rbac_scope,
                        });
                      }}
                    />
                  </div>
                </div>
                <div className={s.eachInputRow}>
                  <div className={s.checkBoxInput}>
                    <CheckBox
                      theme={theme}
                      styles={{height: '20px'}}
                      name="jenkins"
                      title={'Enable Jenkins'}
                      checked={jenkinsEnabled}
                      onChangeFunction={() => {
                        this.setState({jenkinsEnabled: !jenkinsEnabled});
                      }}
                    />
                  </div>
                </div>
                {jenkinsEnabled && (
                  <div className={s.eachInputRow}>
                    <div className={s.title}>Repo name :</div>
                    <div className={s.typeInputs}>
                      <input
                        type="text"
                        onChange={(e) =>
                          this.setState({reponame: e.target.value})
                        }
                        value={reponame}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* <div className={s.divider} /> */}
          <div className={s.footer}>
            <div className={s.leftButtons}></div>
            <div className={s.actionButtons}>
              <div className={s.cancel} onClick={() => addDialogClose()}>
                Cancel
              </div>
              <div
                className={s.updateButton}
                onClick={() => this.updateClusterConfigs()}
              >
                Update
              </div>
            </div>
          </div>
        </div>
      </Modal>
    );
  }
}
export default connect((state) => state, {
  getMyJoinedTeams,
  getDetailsTeam,
  getAllClusterDetails,
})(UpdateClusterDetails);
