import React, {Component} from 'react';
import cx from 'classnames';
import moment from 'moment';
import {connect} from 'react-redux';
import * as _ from 'lodash';
import axios from 'axios';
import https from 'https';
import {rdeColors} from '../../../utils/colors';

import UpdateTeamDetails from '../UpdateTeam';
import UpdateClusterDetails from '../UpdateCluster';
import ConfirmAction from '../../ConfirmAction';
import Table from '../../Table';
import Loader from '../../Loader/index';
import TeamConfig from '../../TeamConfig/index';
import InviteMember from '../InviteMember';
import Tooltip from '../../Tooltip/tooltip';

import BackIcon from '../../../assets/svgs/icon-infield-back-arrow.svg';
import UpIcon from '../../../assets/svgs/icon-infield-up-arrow.svg';
import DownIcon from '../../../assets/svgs/icon-infield-down-arrow.svg';

import * as s1 from './teamView.module.scss';
// import * as s2 from './teamViewLite.module.scss';

import tableViewConfigs from '../../../utils/tableViewConfigs';
import {sendDataToElectronMainThread} from '../../../utils/electronBridges';
import {registerTeamClusterUrl, updateTeamUrl} from '../../../utils/apiConfig';

import {setRoostIOKey, setScreenType} from '../../../actions/collaborate';
import {
  setTeamViewTeam,
  getMyPendingInvites,
  getMyPendingJoinRequests,
  getMyJoinedTeams,
  exitTeam,
  deleteJoinRequest,
  respondInvitation,
  removeAdmin,
  makeAdmin,
  updateSharingPermissions,
  removeMember,
  respondJoinRequest,
  deleteTeam,
  deleteInvitation,
  getDetailsTeam,
  getAllClusterDetails,
} from '../../../actions/teamView';

const agent = new https.Agent({
  rejectUnauthorized: true,
});

class TeamView extends Component {
  _isMounted = false;
  constructor(props) {
    super(props);
    this.state = {
      showDeleteTeamModal: false,
      teamNameToDelete: '',
      teamNameToLeave: '',
      teamName: '',
      memberName: '',
      memberIdToRemove: '',
      showUpdateTeamModal: false,
      showInviteMemberModal: false,
      showTeamClusterSelector: false,
      showTeamSelector: false,
      showInvites: false,
      showRequests: false,
      showTeamMembers: true,
      showConfigValues: true,
      teamConfigName: '',
      teamConfig: {},
    };
    this.handleModalOpenClose = this.handleModalOpenClose.bind(this);
    this.deleteTeamPermanently = this.deleteTeamPermanently.bind(this);
    this.leaveTeamPermanently = this.leaveTeamPermanently.bind(this);
    this.removeMemberPermanently = this.removeMemberPermanently.bind(this);
    this.handleSwitchTeamConfig = this.handleSwitchTeamConfig.bind(this);
    this.checkConfigDetails = this.checkConfigDetails.bind(this);
  }

  async componentDidMount() {
    this._isMounted = true;
    const {getMyJoinedTeams, getAllClusterDetails} = this.props;
    window.addEventListener('click', (e) => {
      const teamSelectorClicked = e.target.closest('#teamSelector');
      if (this._isMounted && !teamSelectorClicked) {
        this.setState({
          showTeamSelector: false,
        });
      }
    });
    let zkeOpts = {};
    window.ipcRenderer.on('getTeamSwitch', async (e, msg) => {
      await this.setState({
        teamConfigName: msg[0],
      });
      zkeOpts = JSON.parse(msg[1]);
      await this.setState({
        teamConfig: {
          k8s_version: zkeOpts.ZKE_K8S_VER,
          cluster_size: zkeOpts.ZKE_SIZE,
          vcpu_per_node: _.get(zkeOpts, 'ZKE_VCPUS', '').toString(),
          disk_per_node: zkeOpts.ZKE_DISK,
          memory_per_node: zkeOpts.ZKE_MEMORY,
        },
      });
    });
    sendDataToElectronMainThread('getTeamSwitch');

    getMyJoinedTeams();
    getAllClusterDetails();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  handleSwitchTeamConfig = (teamDetails) => {
    sendDataToElectronMainThread('switchTeamConfig', [teamDetails.config]);
  };

  handleModalOpenClose = (type) => {
    if (type === 'updateTeam') {
      this.setState({
        showUpdateTeamModal: !this.state.showUpdateTeamModal,
      });
    } else if (type === 'clusterSelector') {
      this.setState({
        showTeamClusterSelector: !this.state.showTeamClusterSelector,
      });
    } else if (type === 'inviteMember') {
      this.setState({
        showInviteMemberModal: !this.state.showInviteMemberModal,
      });
    } else if (type === 'deleteTeam') {
      this.setState({
        showDeleteTeamModal: !this.state.showDeleteTeamModal,
      });
    }
  };

  deleteTeamPermanently = (data) => {
    this.setState({
      showDeleteTeamModal: true,
      teamNameToDelete: data.name,
      teamName: '',
      teamNameToLeave: '',
      memberIdToRemove: '',
      memberName: '',
    });
  };

  leaveTeamPermanently = (data) => {
    this.setState({
      showDeleteTeamModal: true,
      teamNameToLeave: data.name,
      teamName: '',
      teamNameToDelete: '',
      memberIdToRemove: '',
      memberName: '',
    });
  };

  checkConfigDetails = () => {
    const {
      teamView: {teamDetails},
    } = this.props;
    const clusterConfig = {
      k8s_version: teamDetails.config.k8s_version,
      cluster_size: teamDetails.config.cluster_size,
      vcpu_per_node: teamDetails.config.vcpu_per_node,
      disk_per_node: teamDetails.config.disk_per_node.replace('GB', 'G'),
      memory_per_node: teamDetails.config.memory_per_node,
    };
    if (_.isEqual(clusterConfig, this.state.teamConfig)) {
      return true;
    }
    return false;
  };

  removeMemberPermanently = (teamName, memberId, memberName) => {
    console.log(teamName, memberId, memberName);
    this.setState({
      showDeleteTeamModal: true,
      teamName: teamName,
      memberIdToRemove: memberId,
      memberName: memberName,
      teamNameToDelete: '',
      teamNameToLeave: '',
    });
  };

  sharePayloadWithTeam = async (data) => {
    sendDataToElectronMainThread('openCollaborateWindow', [data, 'team']);
  };

  async updateTeamCluster(cluster_id, customer_email, customer_token) {
    const {
      collaborate: {roostIOKey},
      teamView: {teamViewTeam, teamDetails},
      getMyJoinedTeams,
      getDetailsTeam,
    } = this.props;

    const obj = {
      team_id: teamViewTeam.team_id,
      cluster_id: cluster_id,
      customer_token: customer_token,
      customer_email: customer_email,
    };

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
                config: {team_cluster_id: cluster_id},
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

  render() {
    const {
      system: {
        loader: {
          fetchingTeamPendingInvites,
          fetchingTeamPendingJoinRequests,
          fetchingMyJoinedTeams,
          fetchingTeamDetails,
        },
      },
      setScreenType,
      teamView: {
        myJoinedTeams,
        teamDetails,
        teamViewTeam,
        teamPendingInvites,
        teamPendingJoinRequests,
      },
      setTeamViewTeam,
      exitTeam,
      respondJoinRequest,
      deleteInvitation,
      removeAdmin,
      makeAdmin,
      updateSharingPermissions,
      removeMember,
      deleteTeam,
      appPreferences: {theme = 'Dark'},
    } = this.props;

    const {
      showTeamClusterSelector,

      showTeamSelector,
      showInvites,
      showRequests,
      showTeamMembers,
      showConfigValues,
      showUpdateTeamModal,
      showInviteMemberModal,
      showDeleteTeamModal,
      teamNameToDelete,
      teamNameToLeave,
      teamName,
      memberIdToRemove,
      memberName,
    } = this.state;

    const s = s1;

    if (teamViewTeam === null && myJoinedTeams.count > 0) {
      setTeamViewTeam(myJoinedTeams.teams[0]);
    }

    // To balance the changes due to updating the details, role, etc.
    let currentUserDetailsInTeam = null;
    if (teamViewTeam !== null && teamDetails.members) {
      let index = teamDetails.members.findIndex(
        (item) => item.member_id === teamViewTeam.member_id,
      );
      if (index !== -1) {
        currentUserDetailsInTeam = teamDetails.members[index];
      }
    }

    let dataArrayMembers = [];
    if (teamViewTeam !== null && teamDetails.members) {
      teamDetails.members.forEach((m) => {
        let role = '';
        if (m.member_role === 'read-only') {
          role = 'Read-Only';
        } else {
          role = 'Read-Write';
        }
        if (m.is_admin === 1) {
          role += ', Admin';
        }

        let actionArray = [];
        if (teamViewTeam.is_admin === 1) {
          actionArray = [
            {
              message: 'Remove Member',
              styles: {backgroundColor: rdeColors.red},
              handler: () => {
                this.removeMemberPermanently(
                  m.team_id,
                  m.member_id,
                  m.full_name,
                );
              },
            },
          ];

          if (m.member_role === 'read-only') {
            actionArray = [
              ...actionArray,
              {
                message: 'Change Role to Read-Write',
                styles: {backgroundColor: '#E9A149'},
                handler: () => {
                  updateSharingPermissions(
                    m.team_id,
                    m.member_id,
                    'read-write',
                    m.full_name,
                    teamDetails.name,
                  );
                },
              },
            ];
          } else {
            actionArray = [
              ...actionArray,
              {
                message: 'Change Role to Read-Only',
                styles: {backgroundColor: '#E9A149'},
                handler: () => {
                  updateSharingPermissions(
                    m.team_id,
                    m.member_id,
                    'read-only',
                    m.full_name,
                    teamDetails.name,
                  );
                },
              },
            ];
          }

          if (m.is_admin === 1) {
            actionArray = [
              ...actionArray,
              {
                message: 'Remove Admin',
                styles: {backgroundColor: rdeColors.red},
                handler: () => {
                  removeAdmin(
                    m.team_id,
                    m.member_id,
                    m.full_name,
                    teamDetails.name,
                    m.member_id === teamViewTeam.member_id,
                  );
                },
              },
            ];
          } else {
            actionArray = [
              ...actionArray,
              {
                message: 'Make Admin',
                styles: {},
                handler: () => {
                  makeAdmin(
                    m.team_id,
                    m.member_id,
                    m.full_name,
                    teamDetails.name,
                  );
                },
              },
            ];
          }
        }

        dataArrayMembers.push({
          roosterInfo: {
            name: m.full_name,
            roost_handle: m.username,
            image_url: m.avatar_url,
          },
          memberId: m.member_id,
          role: role,
          joinedOn: moment(m.joining_date).format('MM/DD/YYYY'),
          actions: actionArray,
        });
      });
    }

    let dataArrayInvites = [];
    let dataArrayRequests = [];
    if (
      teamViewTeam !== null &&
      teamDetails.name &&
      teamViewTeam.is_admin === 1
    ) {
      teamPendingInvites.pendingInvites.forEach((invite) => {
        let actionArray = [];
        actionArray = [
          {
            message: 'Invited',
            styles: {
              background: 'rgba(0, 0, 0, 0)',
              cursor: 'default',
              color: '#4E8FC9',
            },
            handler: () => {},
          },
          {
            message: 'Cancel Invite',
            styles: {
              backgroundColor: rdeColors.red,
            },
            handler: () => {
              deleteInvitation(
                invite.team_id,
                invite.member_id,
                invite.full_name,
                teamDetails.name,
              );
            },
          },
        ];

        dataArrayInvites.push({
          roosterInfo: {
            name: invite.full_name,
            roost_handle: invite.username,
            image_url: invite.avatar_url,
          },
          requestedOn: moment(invite.requested_on).format('MM/DD/YYYY'),
          teamId: invite.team_id,
          memberId: invite.member_id,
          actions: actionArray,
        });
      });

      teamPendingJoinRequests.pendingJoinRequests.forEach((joinRequest) => {
        let actionArray = [];
        actionArray = [
          {
            message: 'Accept Request',
            styles: {},
            handler: () => {
              respondJoinRequest(
                joinRequest.team_id,
                joinRequest.member_id,
                true,
                joinRequest.full_name,
                teamDetails.name,
              );
            },
          },
          {
            message: 'Reject',
            styles: {
              backgroundColor: rdeColors.red,
            },
            handler: () => {
              respondJoinRequest(
                joinRequest.team_id,
                joinRequest.member_id,
                false,
                joinRequest.full_name,
                teamDetails.name,
              );
            },
          },
        ];

        dataArrayRequests.push({
          roosterInfo: {
            name: joinRequest.full_name,
            roost_handle: joinRequest.username,
            image_url: joinRequest.avatar_url,
          },
          requestedOn: moment(joinRequest.requested_on).format('MM/DD/YYYY'),
          teamId: joinRequest.team_id,
          memberId: joinRequest.member_id,
          actions: actionArray,
        });
      });
    }

    let tableHead = _.cloneDeep(tableViewConfigs['memberInfo']);
    if (teamViewTeam !== null && teamViewTeam.is_admin === 1) {
      tableHead = [
        ...tableHead,
        {
          title: 'ACTIONS',
          key: 'actions',
          type: 'collabButton',
        },
      ];
    }

    const teamSwitcher = () => {
      const allTeamsName = [];

      myJoinedTeams.teams.forEach((team, i) => {
        const id = team.team_id;
        const teamSelectorStyles = cx(s.teamSelector, {
          [s.teamSelectorApplied]: id === teamViewTeam.team_id,
        });

        allTeamsName.push(
          <div key={i} className={teamSelectorStyles}>
            <option
              value={team.name}
              onClick={() => {
                this.setState({showTeamSelector: false});
                setTeamViewTeam(team);
              }}
              className={s.teamOption}
            >
              {team.name}
            </option>
          </div>,
        );
      });

      return [...allTeamsName];
    };

    const containerStyle = cx(s.container, {
      [s.containerLight]: theme === 'Light',
    });

    return (
      <div>
        {(fetchingTeamPendingInvites ||
          fetchingTeamPendingJoinRequests ||
          fetchingMyJoinedTeams ||
          fetchingTeamDetails) && (
          <Loader
            loaderText={
              'Please wait while we fetch your ' +
              _.get(teamDetails, 'name', '') +
              ' Team data for you...'
            }
          />
        )}
        {!(
          fetchingTeamPendingInvites ||
          fetchingTeamPendingJoinRequests ||
          fetchingMyJoinedTeams ||
          fetchingTeamDetails
        ) && (
          <>
            {teamViewTeam !== null && (
              <div className={containerStyle}>
                <div className={s.headerBar}>
                  <div
                    className={s.headerButton}
                    onClick={() => {
                      setScreenType('myTeam');
                    }}
                  >
                    <img src={BackIcon} alt="" className={s.iconBack} />
                    Back to My Teams
                  </div>

                  {teamViewTeam.is_admin === 1 && (
                    <div
                      className={s.headerButton}
                      onClick={() => this.handleModalOpenClose('updateTeam')}
                    >
                      Team Details
                    </div>
                  )}

                  {/* {currentUserDetailsInTeam !== null &&
                    currentUserDetailsInTeam.member_role === 'read-write' && (
                      <div
                        className={s.headerButton}
                        onClick={() => this.sharePayloadWithTeam(teamViewTeam)}
                      >
                        Share Workload
                      </div>
                    )} */}

                  {currentUserDetailsInTeam !== null &&
                    currentUserDetailsInTeam.is_admin === 1 && (
                      <>
                        <div id="teamViewTeamClusterSelector">
                          <Tooltip
                            direction={'bottom'}
                            content={
                              showTeamClusterSelector
                                ? null
                                : 'Pre-commit staging cluster for team'
                            }
                          >
                            <div
                              className={s.headerButton}
                              onClick={() => {
                                this.handleModalOpenClose('clusterSelector');
                              }}
                            >
                              <p
                                className={cx({
                                  [s.showTick]: teamDetails.config
                                    ? teamDetails.config.team_cluster_id
                                      ? true
                                      : false
                                    : false,
                                })}
                              ></p>
                              &nbsp;&nbsp; Cluster Details
                            </div>
                          </Tooltip>
                        </div>
                      </>
                    )}
                  <div id="teamSelector">
                    <div
                      className={s.headerButton}
                      onClick={() =>
                        this.setState({showTeamSelector: !showTeamSelector})
                      }
                    >
                      <div className={s.title}>
                        {teamViewTeam.is_admin ? 'Admin View ' : 'Team View '}
                      </div>
                      {teamDetails.name}
                      <div className={s.iconUpDown}>
                        <img src={UpIcon} alt="" className={s.iconUp} />
                        <img src={DownIcon} alt="" className={s.iconDown} />
                      </div>
                    </div>
                    {showTeamSelector && (
                      <div className={s.teamListBox}>
                        <div className={s.teamList}>{teamSwitcher()}</div>
                      </div>
                    )}
                  </div>
                  {teamViewTeam.is_admin === 1 && (
                    <div
                      className={s.headerButton}
                      onClick={() => this.handleModalOpenClose('inviteMember')}
                    >
                      Invite Members
                    </div>
                  )}

                  {teamViewTeam.is_admin === 1 && (
                    <div
                      className={cx(s.headerButton, s.redButton)}
                      onClick={() => {
                        this.deleteTeamPermanently(teamViewTeam);
                      }}
                    >
                      Delete Team
                    </div>
                  )}

                  <div
                    className={cx(s.headerButton, s.redButton)}
                    onClick={() => {
                      this.leaveTeamPermanently(teamViewTeam);
                    }}
                  >
                    Leave Team
                  </div>
                </div>

                <div className={s.toggleBar}>
                  <div className={s.title}>Recommended Config Values</div>
                  <div className={s.toggleButtons}>
                    {!this.checkConfigDetails() && (
                      <div
                        className={s.toggleButtonDetails}
                        onClick={() => {
                          this.handleSwitchTeamConfig(teamDetails);
                        }}
                      >
                        Apply Team Config to Local Roost
                      </div>
                    )}

                    {!showConfigValues && (
                      <div
                        className={s.toggleButton}
                        onClick={() => {
                          this.setState({showConfigValues: !showConfigValues});
                        }}
                      >
                        Show
                      </div>
                    )}
                    {showConfigValues && (
                      <div
                        className={s.toggleButton}
                        onClick={() => {
                          this.setState({showConfigValues: !showConfigValues});
                        }}
                      >
                        Hide
                      </div>
                    )}
                  </div>
                </div>

                {showConfigValues && (
                  <div className={s.tableContainer}>
                    <TeamConfig
                      theme={theme}
                      configValues={
                        teamDetails.config ? teamDetails.config : {}
                      }
                      isClusterRunning={_.isEmpty(
                        _.get(teamDetails, 'cluster_stopped_on', ''),
                      )}
                      teamDescription={teamDetails}
                      isAdmin={teamViewTeam.is_admin === 1}
                      teamName={teamDetails.name}
                    />
                  </div>
                )}

                {teamViewTeam.is_admin === 1 && (
                  <>
                    <div
                      className={s.toggleBar}
                      onClick={() => {
                        this.setState({showInvites: !showInvites});
                      }}
                    >
                      <div className={s.title}>
                        Invites Sent to Members ({teamPendingInvites.count})
                      </div>
                      <div className={s.toggleButtons}>
                        {!showInvites && (
                          <div className={s.toggleButton}>Show</div>
                        )}
                        {showInvites && (
                          <div className={s.toggleButton}>Hide</div>
                        )}
                      </div>
                    </div>
                    {showInvites && (
                      <div className={s.tableContainer}>
                        <Table
                          head={tableViewConfigs['memberRequests']}
                          data={dataArrayInvites}
                          recordsPerPage={5}
                          theme={theme}
                        />
                      </div>
                    )}
                    <div
                      className={s.toggleBar}
                      onClick={() => {
                        this.setState({showRequests: !showRequests});
                      }}
                    >
                      <div className={s.title}>
                        Join Requests to Team ({teamPendingJoinRequests.count})
                      </div>
                      <div className={s.toggleButtons}>
                        {!showRequests && (
                          <div className={s.toggleButton}>Show</div>
                        )}
                        {showRequests && (
                          <div className={s.toggleButton}>Hide</div>
                        )}
                      </div>
                    </div>
                    {showRequests && (
                      <div className={s.tableContainer}>
                        <Table
                          head={tableViewConfigs['memberRequests']}
                          data={dataArrayRequests}
                          recordsPerPage={5}
                          theme={theme}
                        />
                      </div>
                    )}
                  </>
                )}

                <div
                  className={s.toggleBar}
                  onClick={() => {
                    this.setState({showTeamMembers: !showTeamMembers});
                  }}
                >
                  <div className={s.title}>
                    Team Members ({teamDetails.numOfMembers})
                  </div>
                  <div className={s.toggleButtons}>
                    {!showTeamMembers && (
                      <div className={s.toggleButton}>Show</div>
                    )}
                    {showTeamMembers && (
                      <div className={s.toggleButton}>Hide</div>
                    )}
                  </div>
                </div>

                {showTeamMembers && (
                  <div className={s.tableContainer}>
                    <Table
                      head={tableHead}
                      data={dataArrayMembers}
                      recordsPerPage={10}
                      theme={theme}
                    />
                  </div>
                )}

                <UpdateTeamDetails
                  open={showUpdateTeamModal}
                  addTeamDialogClose={() =>
                    this.handleModalOpenClose('updateTeam')
                  }
                  theme={theme}
                />
                <UpdateClusterDetails
                  open={showTeamClusterSelector}
                  addDialogClose={() =>
                    this.handleModalOpenClose('clusterSelector')
                  }
                  theme={theme}
                />
                <InviteMember
                  theme={theme}
                  open={showInviteMemberModal}
                  teamVariables={[teamDetails.id, teamDetails.name]}
                  inviteMemberDialogClose={() =>
                    this.handleModalOpenClose('inviteMember')
                  }
                />
                <ConfirmAction
                  open={showDeleteTeamModal}
                  dialogClose={() => this.handleModalOpenClose('deleteTeam')}
                  theme={theme}
                  consentMessage={
                    teamNameToDelete.length > 0
                      ? `Are you sure you want to delete the team "${teamNameToDelete}" ?`
                      : teamNameToLeave.length > 0
                      ? `Are you sure you want to leave the team "${teamNameToLeave}" ?`
                      : `Are you sure you want to remove "${memberName}" from the team?`
                  }
                  confirmConsentYes={() => {
                    if (teamNameToDelete) {
                      deleteTeam(teamViewTeam.team_id);
                      this.setState({
                        showDeleteTeamModal: false,
                        teamNameToDelete: '',
                        // teamName: "",
                        // memberIdToRemove: "",
                        // teamNameToLeave: "",
                        // memberName: "",
                      });
                      setScreenType('myTeam');
                    } else if (teamNameToLeave) {
                      exitTeam(teamViewTeam.team_id, teamDetails.name);
                      this.setState({
                        showDeleteTeamModal: false,
                        teamNameToLeave: '',
                        // teamName: "",
                        // memberIdToRemove: "",
                        // teamNameToDelete: "",
                        // memberName: "",
                      });
                      setScreenType('myTeam');
                    } else if (teamName && memberIdToRemove) {
                      removeMember(teamName, memberIdToRemove);
                      this.setState({
                        showDeleteTeamModal: false,
                        teamName: '',
                        memberIdToRemove: '',
                        // teamNameToLeave: "",
                        // teamNameToDelete: "",
                        memberName: '',
                      });
                    }
                  }}
                />
              </div>
            )}
            {teamViewTeam === null && (
              <div className={containerStyle}>
                <div className={s.noTeam}>No Team Selected</div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }
}

const mapActionsToProps = {
  setTeamViewTeam,
  setRoostIOKey,
  getMyPendingJoinRequests,
  getMyPendingInvites,
  getMyJoinedTeams,
  exitTeam,
  deleteJoinRequest,
  respondInvitation,
  removeAdmin,
  makeAdmin,
  updateSharingPermissions,
  removeMember,
  setScreenType,
  deleteTeam,
  respondJoinRequest,
  deleteInvitation,
  getDetailsTeam,
  getAllClusterDetails,
};

export default connect((state) => state, mapActionsToProps)(TeamView);
