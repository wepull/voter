import React, {Component} from 'react';
import {connect} from 'react-redux';
import moment from 'moment';
import cx from 'classnames';
import * as _ from 'lodash';

import Shepherd from 'shepherd.js';

import * as s1 from './header.module.scss';
// import * as s2 from './headerRdeLite.module.scss';

import refreshIcon from '../../../assets/svgs/refresh.svg';
import refreshIconPurple from '../../../assets/svgs/refreshpurple-light.svg';

import tourStepsCollaborate from './collaborationSteps';
import '../../../assets/styles/shepherdTour.scss';

import Tooltip from '../../Tooltip/tooltip';
import HeaderTabButton from '../../../components/HeaderTabButton';

import {
  setScreenType,
  refreshDetails,
  getMyRoostNetwork,
  getOnGoingCollaborationsNew,
} from '../../../actions/collaborate';
import {
  getMyJoinedTeams,
  getMyPendingJoinRequests,
  getMyPendingInvites,
  setTeamViewTeam,
  searchTeam,
  getAllClusterDetails,
  getDetailsTeam,
  getTeamActivity,
} from '../../../actions/teamView';
import {getPushNetwork} from '../../../actions/collaborateShare';
import {getClusterListRCR} from '../../../actions/rcr';

import {sendDataToElectronMainThread} from '../../../utils/electronBridges';

const tourCollaborate = new Shepherd.Tour({
  defaultStepOptions: {
    cancelIcon: {
      enabled: true,
    },
    popperOptions: {
      modifiers: [{name: 'offset', options: {offset: [0, 12]}}],
    },
    arrow: true,
    scrollTo: {behavior: 'smooth', block: 'nearest'},
    canClickTarget: true,
  },
  confirmCancel: false,
  exitOnEsc: true,
  keyboardNavigation: false,
  useModalOverlay: true,
});
tourCollaborate.addSteps(tourStepsCollaborate);
tourCollaborate.on('complete', () => {
  sendDataToElectronMainThread('setFirstTimeTourCollaborationFalse');
});
tourCollaborate.on('cancel', () => {
  sendDataToElectronMainThread('setFirstTimeTourCollaborationFalse');
});

class Header extends Component {
  constructor() {
    super();
    this.handleRefresh = this.handleRefresh.bind(this);
    this.setActiveScreen = this.setActiveScreen.bind(this);
  }

  setActiveScreen(activeScreen) {
    const {setScreenType} = this.props;
    setScreenType(activeScreen);
  }

  handleRefresh() {
    const {
      collaborate: {activeScreen},
      refreshDetails,
      getMyRoostNetwork,
      getPushNetwork,
      getOnGoingCollaborationsNew,
      getClusterListRCR,
      searchTeam,
      getMyJoinedTeams,
      getMyPendingJoinRequests,
      getMyPendingInvites,
      setTeamViewTeam,
      getAllClusterDetails,
      getTeamActivity,
      getDetailsTeam,
      teamView: {
        currentPage,
        pageSize,
        teamViewTeam,
        myJoinedTeams,
        selectedActivityTeamId,
      },
      teamDashboard: {tdSelectedTeam},
    } = this.props;

    const today = new Date();
    const currentTime = moment(today).format('LT');
    refreshDetails(activeScreen, currentTime);
    if (activeScreen === 'network') {
      getMyRoostNetwork();
      getPushNetwork();
    } else if (activeScreen === 'request') {
      getMyRoostNetwork();
      getMyPendingJoinRequests();
      getMyPendingInvites();
    } else if (activeScreen === 'ongoing') {
      getOnGoingCollaborationsNew();
      getClusterListRCR();
    } else if (activeScreen === 'allTeams' || activeScreen === 'myTeam') {
      searchTeam(pageSize, (currentPage - 1) * pageSize);
      getMyJoinedTeams();
      getMyPendingJoinRequests();
      getMyPendingInvites();
      if (!_.isEmpty(selectedActivityTeamId)) {
        getTeamActivity(selectedActivityTeamId);
      }
    } else if (activeScreen === 'teamView') {
      getMyJoinedTeams();
      getAllClusterDetails();
      sendDataToElectronMainThread('getTeamSwitch');
      if (teamViewTeam !== null) {
        myJoinedTeams.teams.forEach((key, i) => {
          if (teamViewTeam.team_id === key.team_id) {
            setTeamViewTeam(key);
          }
        });
      }
    } else if (activeScreen === 'teamDashboard') {
      getMyJoinedTeams();
      if (tdSelectedTeam.team_id) getDetailsTeam(tdSelectedTeam.team_id);
    }
    // here we will have to refresh container content based on active screen
    // that will be a seperate task
  }

  componentDidMount() {
    const {
      appPreferences: {firstTimeTourCollaboration = true},
    } = this.props;
    window.ipcRenderer.on('refreshrdeClientWebviewcollaborate', (e, msg) => {
      this.handleRefresh();
    });

    window.ipcRenderer.on('openTeamPage', async (event, message) => {
      const {getMyJoinedTeams, setTeamViewTeam} = this.props;
      await getMyJoinedTeams();
      const {
        teamView: {myJoinedTeams},
      } = this.props;
      myJoinedTeams.teams.forEach((key, i) => {
        if (message === key.team_id) {
          console.log(message, key);
          setTeamViewTeam(key);
          this.setActiveScreen('teamView');
        }
      });
    });

    firstTimeTourCollaboration === true && tourCollaborate.start();
  }

  render() {
    const {
      collaborate = {},
      collaborate: {activeScreen},
      appPreferences: {theme},
      system: {
        loader: {fetchingMyRoostNetwork},
      },
    } = this.props;
    console.log(this.props);
    let headerButtonArray = [
      {
        name: 'My Roost Network',
        key: 'network',
      },
      {
        name: 'Requests',
        key: 'request',
      },
      {
        name: 'Collaboration Activities',
        key: 'ongoing',
      },
      {
        name: 'My Teams',
        key: 'myTeam',
      },
      {
        name: 'All Teams',
        key: 'allTeams',
      },
    ];

    const activeScreenLastUpdatedTime = _.get(
      collaborate,
      `lastUpdatedTime.${activeScreen}`,
      '',
    );

    const s = s1;
    const HeaderStyle = cx(s.headerContainer, {
      [s.headerContainerLight]: theme === 'Light',
    });

    const HrStyle = cx(s.hr, {
      [s.hrLight]: theme === 'Light',
    });

    return (
      <>
        <div className={HeaderStyle}>
          {fetchingMyRoostNetwork ? <div className={s.overlay}></div> : null}
          <div className={s.heading}>
            <p className={s.collaboration}>Collaboration</p>
          </div>
          <HeaderTabButton
            handlerActiveScreen={this.setActiveScreen}
            headerButton={headerButtonArray}
            defaultTab="network"
            activeScreen={
              activeScreen === 'teamView' || activeScreen === 'teamDashboard'
                ? 'myTeam'
                : activeScreen
            }
          />
          <div className={s.refreshDiv}>
            {activeScreenLastUpdatedTime !== '' ? (
              <span className={s.lastUpdate}>
                Last updated at {activeScreenLastUpdatedTime}
              </span>
            ) : (
              <span className={s.lastUpdate}>Refresh not triggered yet</span>
            )}
            <Tooltip content="Refresh" direction="bottom">
              <img
                className={s.refreshIcon}
                src={theme === 'Dark' ? refreshIcon : refreshIconPurple}
                alt=""
                onClick={this.handleRefresh}
              />
            </Tooltip>
          </div>
        </div>
        <div className={HrStyle} />
      </>
    );
  }
}

const mapActionsToProps = {
  refreshDetails,
  getMyRoostNetwork,
  getOnGoingCollaborationsNew,
  getPushNetwork,
  setScreenType,
  searchTeam,
  getMyJoinedTeams,
  getMyPendingJoinRequests,
  getMyPendingInvites,
  setTeamViewTeam,
  getAllClusterDetails,
  getDetailsTeam,
  getClusterListRCR,
  getTeamActivity,
};

export default connect((state) => state, mapActionsToProps)(Header);
