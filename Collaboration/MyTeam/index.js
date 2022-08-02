import React, {Component} from 'react';
import cx from 'classnames';
import moment from 'moment';
import {connect} from 'react-redux';
import * as _ from 'lodash';
import ConfirmAction from '../../ConfirmAction';

import * as s1 from './myTeam.module.scss';
// import * as s2 from './myTeamLite.module.scss';

import {
  getMyJoinedTeams,
  exitTeam,
  getTeamActivity,
  setTeamViewTeam,
  setSelectedActivityTeamId,
} from '../../../actions/teamView';
import {setRoostIOKey, setScreenType} from '../../../actions/collaborate';
import {setDashboardSelectedTeam} from '../../../actions/teamDashboard';
import {sendDataToElectronMainThread} from '../../../utils/electronBridges';
import tableViewConfigs from '../../../utils/tableViewConfigs';
import Table from '../../Table';
import Loader from '../../Loader/index';
import AddTeam from '../AddTeam';

import addicon from '../../../assets/svgs/icon-folder.svg';
import eyeIcon from '../../../assets/svgs/icon-eye.svg';
import clusterIcon from '../../../assets/svgs/zkeclustericon.svg';
import clusterIconLight from '../../../assets/svgs/zkeclustericonlight.svg';
import BackIcon from '../../../assets/svgs/icon-infield-back-arrow.svg';
import UpIcon from '../../../assets/svgs/icon-infield-up-arrow.svg';
import DownIcon from '../../../assets/svgs/icon-infield-down-arrow.svg';
import eyeIconLight from '../../../assets/svgs/icon-eye-light.svg';
import exitIcon from '../../../assets/svgs/exit.svg';
import exitIconLight from '../../../assets/svgs/exit-Light.svg';

import graphIcon from '../../../assets/svgs/graph2.svg';
import graphIconLight from '../../../assets/svgs/graph2-light.svg';
import zeroRoostNetwork from '../../../assets/svgs/no-roost-network.svg';
import zeroRoostNetworkLight from '../../../assets/svgs/no-roost-network-light.svg';

class MyTeam extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showAddRoosterModal: false,
      showLeaveTeamModal: false,
      teamNameToLeave: '',
      teamIdToLeave: '',
      showTeamActivity: false,
      showTeamSelector: false,
      selectedTeam: {},
    };

    this.handleModalOpenClose = this.handleModalOpenClose.bind(this);
    this.leaveTeamPermanently = this.leaveTeamPermanently.bind(this);
  }

  componentDidMount() {
    this._isMounted = true;
    const {getMyJoinedTeams} = this.props;
    window.addEventListener('click', (e) => {
      const teamSelectorClicked = e.target.closest('#teamSelector');
      if (this._isMounted && !teamSelectorClicked) {
        this.setState({
          showTeamSelector: false,
        });
      }
    });
    getMyJoinedTeams();
  }

  handleModalOpenClose = (type) => {
    if (type === 'leaveTeam') {
      this.setState({
        showLeaveTeamModal: !this.state.showLeaveTeamModal,
      });
    }
  };

  leaveTeamPermanently = (data) => {
    this.setState({
      showLeaveTeamModal: true,
      teamNameToLeave: data.name,
      teamIdToLeave: data.team_id,
    });
  };

  sharePayloadWithTeam = async (data) => {
    sendDataToElectronMainThread('openCollaborateWindow', [data, 'team']);
  };

  render() {
    const {
      system: {
        loader: {fetchingMyJoinedTeams, fetchingTeamClusterActivity},
      },
      setTeamViewTeam,
      setDashboardSelectedTeam,
      setScreenType,
      teamView: {myJoinedTeams, teamActivity = {}},
      exitTeam,
      appPreferences: {theme = 'Dark'},
      getTeamActivity,
      setSelectedActivityTeamId,
    } = this.props;

    const {
      showAddRoosterModal,
      showLeaveTeamModal,
      teamIdToLeave,
      teamNameToLeave,
      showTeamSelector,
      selectedTeam,
      showTeamActivity,
    } = this.state;

    const s = s1;

    const teamSwitcher = () => {
      const allTeamsName = [];

      myJoinedTeams.teams.forEach((team, i) => {
        const id = team.team_id;
        const teamSelectorStyles = cx(s.teamSelector, {
          [s.teamSelectorApplied]: id === _.get(selectedTeam, 'team_id', ''),
        });

        allTeamsName.push(
          <div key={i} className={teamSelectorStyles}>
            <option
              value={team.name}
              onClick={() => {
                this.setState({showTeamSelector: false, selectedTeam: team});
                getTeamActivity(team.team_id);
                setSelectedActivityTeamId(team.team_id);
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

    let dataArrayJoinedTeams = [];
    myJoinedTeams.teams.forEach((joinedTeam) => {
      let actionArray = [];
      actionArray = [
        {
          src: theme === 'Dark' ? graphIcon : graphIconLight,
          message: 'Dashboard',
          handler: () => {
            setDashboardSelectedTeam({
              title: joinedTeam.name,
              key: joinedTeam.team_id,
              team_id: joinedTeam.team_id,
            });
            setScreenType('teamDashboard');
          },
        },
        {
          src: theme === 'Dark' ? clusterIcon : clusterIconLight,
          message: 'Cluster Activity',
          handler: () => {
            this.setState({
              showTeamActivity: true,
              selectedTeam: joinedTeam,
            });
            getTeamActivity(joinedTeam.team_id);
            setSelectedActivityTeamId(joinedTeam.team_id);
          },
        },
        {
          src: theme === 'Dark' ? eyeIcon : eyeIconLight,
          message: joinedTeam.is_admin ? 'Admin View' : 'Team View',
          handler: () => {
            setTeamViewTeam(joinedTeam);
            setScreenType('teamView');
          },
        },
        {
          src: theme === 'Dark' ? exitIcon : exitIconLight,
          message: 'Leave Team',

          handler: () => {
            this.leaveTeamPermanently(joinedTeam);
          },
        },
      ];

      let visibility = joinedTeam.visibility;
      if (joinedTeam.visibility === 'public') {
        visibility = 'All Users';
      } else if (joinedTeam.visibility === 'private') {
        visibility = 'Team Members';
      }

      let role = '';
      if (joinedTeam.member_role === 'read-only') {
        role = 'Read-Only';
      } else {
        role = 'Read-Write';
      }
      if (joinedTeam.is_admin === 1) {
        role += ', Admin';
      }

      dataArrayJoinedTeams.push({
        teamInfo: {
          name: joinedTeam.name,
          onlyHeading: true,
        },
        description: joinedTeam.description,
        visibility: visibility,
        role: role,
        createdOn: {
          date: new Date(joinedTeam.joining_date),
          format: 'mm/dd/yyyy',
        },
        // moment(joinedTeam.joining_date).format('Do MMMM, YYYY'),
        teamId: joinedTeam.id,
        totalMembers: joinedTeam.member_count,
        actions: actionArray,
      });
    });
    console.log('teamActivity', teamActivity);
    let dataArrayTeamActivity = [];
    let buildsByTeamId = _.get(teamActivity, 'buildsByTeamId', []);

    dataArrayTeamActivity = buildsByTeamId.map((build) => {
      let user = _.get(teamActivity.users, build.user_id);
      let device = _.get(teamActivity.devices, build.mac_id);
      return {
        EventType: build.activity_type,
        Artifact: build.artifact_name,
        Epoch: moment(build.artifact_built_on).format('LLL'),
        roosterInfo: {
          name: _.get(user, 'full_name', ''),
          roost_handle: _.get(user, 'username', ''),
          image_url: _.get(user, 'avatar_url', ''),
        },
        DeviceName: _.get(device, `device_name`, '-'),
        Namespace: build.namespace,
        Checksum: build.checksum,
        GitLogs: build.git_log,
        GitPatch: build.git_patch,
        ClusterName: build.cluster_alias,
        FileName: build.file_name,
        BuildId: build.build_id,
      };
    });
    console.log('dataArrayTeamActivity', dataArrayTeamActivity);
    const containerStyle = cx(s.container, {
      [s.containerLight]: theme === 'Light',
    });

    const clusterList = cx(s.headerButton, s.clusterList);

    const tableHeadJoinedTeams = _.cloneDeep(tableViewConfigs['teamInfo']);
    tableHeadJoinedTeams[4].title = 'JOINED ON';
    tableHeadJoinedTeams.splice(3, 0, {
      title: 'ROLE',
      key: 'role',
      type: 'text',
    });

    tableHeadJoinedTeams.splice(-1, 1, {
      title: 'ACTIONS',
      key: 'actions',
      type: 'iconList',
    });
    return (
      <div>
        {fetchingMyJoinedTeams && (
          <Loader
            loaderText={'Please wait while we fetch your Teams for you...'}
          />
        )}
        {!fetchingMyJoinedTeams && (
          <div className={containerStyle}>
            <>
              {!(myJoinedTeams.teams.length === 0) ? (
                showTeamActivity ? (
                  <>
                    <div className={s.header}>
                      <div
                        className={s.headerButton}
                        onClick={() => this.setState({showTeamActivity: false})}
                      >
                        <img src={BackIcon} alt="" className={s.iconBack} />
                        Back to My Teams
                      </div>
                      <div id="teamSelector">
                        <div
                          className={clusterList}
                          onClick={() =>
                            this.setState({showTeamSelector: !showTeamSelector})
                          }
                        >
                          <div className={s.title}>{`Team : `}</div>
                          {_.get(selectedTeam, 'name', '-')}
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
                    </div>

                    {fetchingTeamClusterActivity ? (
                      <Loader />
                    ) : (
                      <div className={s.tableContainer}>
                        <Table
                          head={tableViewConfigs['teamActivity']}
                          data={dataArrayTeamActivity}
                          recordsPerPage={10}
                          theme={theme}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className={s.tableContainer}>
                      <Table
                        head={tableHeadJoinedTeams}
                        data={dataArrayJoinedTeams}
                        recordsPerPage={10}
                        theme={theme}
                      />
                    </div>
                  </>
                )
              ) : (
                <>
                  <div className={s.zeroRoostNetwork}>
                    <img
                      src={
                        theme === 'Light'
                          ? zeroRoostNetworkLight
                          : zeroRoostNetwork
                      }
                      alt=""
                      className={s.norequestimage}
                    />
                    <p>No Joined Teams </p>
                    <div className={s.button}>
                      <button
                        className={s.addrooster}
                        onClick={() => {
                          this.setState({
                            showAddRoosterModal: !showAddRoosterModal,
                          });
                        }}
                      >
                        <img src={addicon} alt="" />
                        <span>Create New Team</span>
                      </button>
                    </div>
                    <AddTeam
                      open={showAddRoosterModal}
                      addTeamDialogClose={() => {
                        this.setState({
                          showAddRoosterModal: !showAddRoosterModal,
                        });
                      }}
                      theme={theme}
                    />
                  </div>
                </>
              )}
            </>
          </div>
        )}
        <ConfirmAction
          open={showLeaveTeamModal}
          dialogClose={() => this.handleModalOpenClose('leaveTeam')}
          theme={theme}
          consentMessage={
            teamIdToLeave.length > 0
              ? `Are you sure you want to leave the team "${teamNameToLeave}" ?`
              : `Are you sure you want to leave the team "${teamNameToLeave}" ?`
          }
          confirmConsentYes={() => {
            if (teamNameToLeave) {
              exitTeam(teamIdToLeave, teamNameToLeave);
              this.setState({
                showLeaveTeamModal: false,
                teamNameToLeave: '',
                teamIdToLeave: '',
              });
            }
          }}
        />
      </div>
    );
  }
}

const mapActionsToProps = {
  setRoostIOKey,
  getMyJoinedTeams,
  exitTeam,
  getTeamActivity,
  setTeamViewTeam,
  setScreenType,
  setDashboardSelectedTeam,
  setSelectedActivityTeamId,
};

export default connect((state) => state, mapActionsToProps)(MyTeam);
