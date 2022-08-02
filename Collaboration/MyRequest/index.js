import React, {Component} from 'react';
import cx from 'classnames';
import {connect} from 'react-redux';
import * as _ from 'lodash';
import IncomingRequests from '../IncomingRequests/index';
import SentRequests from '../SentRequests/index';
import * as s1 from './myRequestStyles.module.scss';
// import * as s2 from './myRequestStylesRdeLite.module.scss';

import {rdeColors} from '../../../utils/colors';

import zerorequestimage from '../../../assets/svgs/zerorequests.svg';
import zerorequestslightimage from '../../../assets/svgs/zerorequestslight.svg';
import addicon from '../../../assets/svgs/icon-folder.svg';
import Loader from '../../Loader/index';
import AddRooster from '../AddRooster';
import {getMyRoostNetwork} from '../../../actions/collaborate';
import tableViewConfigs from '../../../utils/tableViewConfigs';
import {sendDataToElectronMainThread} from '../../../utils/electronBridges';
import {
  getMyPendingInvites,
  getMyPendingJoinRequests,
  deleteJoinRequest,
  respondInvitation,
} from '../../../actions/teamView';

import Table from '../../Table';

class MyRequest extends Component {
  constructor(props) {
    super(props);
    this.state = {
      seeallsent: false,
      showInvites: false,
      showRequests: false,
      seeallincoming: false,
      showAddRoosterModal: false,
    };

    this.handleModalOpenClose = this.handleModalOpenClose.bind(this);
  }

  async componentDidMount() {
    const {
      getMyPendingInvites,
      getMyPendingJoinRequests,
      getMyRoostNetwork,
    } = this.props;

    await getMyPendingJoinRequests();
    await getMyPendingInvites();
    await getMyRoostNetwork();
  }

  onClickSeeAll(type) {
    if (type === 'Incoming') {
      this.setState({seeallincoming: true});
    } else if ((type = 'Sent')) {
      this.setState({seeallsent: true});
    }
  }

  onClickSeeLess(type) {
    if (type === 'Incoming') {
      this.setState({seeallincoming: false});
    } else if ((type = 'Sent')) {
      this.setState({seeallsent: false});
    }
  }

  handleModalOpenClose = () => {
    this.setState({
      showAddRoosterModal: !this.state.showAddRoosterModal,
    });
  };

  render() {
    const {
      system: {
        loader: {
          fetchingMyPendingInvites,
          fetchingMyPendingJoinRequests,
          fetchingMyRoostNetwork,
        },
      },
      teamView: {myPendingInvites, myPendingJoinRequests},
      eventViewer: {eventViewerStatus = false},
      deleteJoinRequest,
      respondInvitation,
    } = this.props;

    const s = s1;
    const limit = 3;

    const data = _.get(this.props, 'roostnetwork.myRoostNetwork', []) || [];

    const {
      seeallincoming,
      seeallsent,
      showAddRoosterModal,
      showInvites,
      showRequests,
    } = this.state;

    const theme = _.get(this.props, 'appPreferences.theme', 'Dark');
    const containerStyle = cx(s.container, {
      [s.containerLight]: theme === 'Light',
      [s.containerEventViewer]: eventViewerStatus === true,
    });

    let sent = [];
    let received = [];
    for (let i = 0; i < data.length; i++) {
      if (
        data[i].hasOwnProperty('toUser') === true &&
        (data[i].approval_status === 0 || data[i].approval_status === 2)
      ) {
        sent.push(data[i]);
      } else if (
        data[i].hasOwnProperty('fromUser') === true &&
        (data[i].approval_status === 0 || data[i].approval_status === 2)
      ) {
        received.push(data[i]);
      }
    }

    let dataArrayInvites = [];
    myPendingInvites.invitations.forEach((invite) => {
      let actionArray = [];
      actionArray = [
        {
          message: 'Accept Invite',
          styles: {},
          handler: () => {
            respondInvitation(invite.team_id, true);
            sendDataToElectronMainThread('addNotification', [
              {
                type: 'addSuccess',
                heading: 'Accepted the Invitation ',
                message: `${'Action Performed for team ' + invite.name}`,
              },
            ]);
          },
        },
        {
          message: 'Reject',
          styles: {
            backgroundColor: rdeColors.red,
          },
          handler: () => {
            respondInvitation(invite.team_id, false);
            sendDataToElectronMainThread('addNotification', [
              {
                type: 'addSuccess',
                heading: 'Rejected the Invitation ',
                message: `${'Action Performed for team ' + invite.name}`,
              },
            ]);
          },
        },
      ];

      let visibility = invite.visibility;
      if (invite.visibility === 'public') {
        visibility = 'All Users';
      } else if (invite.visibility === 'private') {
        visibility = 'Team Members';
      }

      dataArrayInvites.push({
        teamInfo: {
          name: invite.name,
          onlyHeading: true,
        },
        description: invite.description,
        visibility: visibility,
        createdOn: {
          date: new Date(invite.requested_on),
          format: 'mm/dd/yyyy',
        },
        // createdOn: moment(invite.requested_on).format('Do MMMM, YYYY'),
        teamId: invite.id,
        totalMembers: invite.member_count,
        actions: actionArray,
      });
    });

    let dataArrayRequests = [];
    myPendingJoinRequests.pendingJoinRequests.forEach((joinRequest) => {
      let actionArray = [];
      actionArray = [
        {
          message: 'Requested',
          styles: {
            background: 'rgba(0, 0, 0, 0)',
            cursor: 'default',
            color: rdeColors.purple,
          },
          handler: () => {},
        },
        {
          message: 'Cancel Request',
          styles: {
            backgroundColor: rdeColors.red,
          },
          handler: () => {
            deleteJoinRequest(joinRequest.team_id);
            sendDataToElectronMainThread('addNotification', [
              {
                type: 'addSuccess',
                heading: 'Request Withdrawn ',
                message: `${'Action Performed for team ' + joinRequest.name}`,
              },
            ]);
          },
        },
      ];

      let visibility = joinRequest.visibility;
      if (joinRequest.visibility === 'public') {
        visibility = 'All Users';
      } else if (joinRequest.visibility === 'private') {
        visibility = 'Team Members';
      }

      dataArrayRequests.push({
        teamInfo: {
          name: joinRequest.name,
          onlyHeading: true,
        },
        description: joinRequest.description,
        visibility: visibility,
        createdOn: {
          date: new Date(joinRequest.requested_on),
          format: 'mm/dd/yyyy',
        },
        // createdOn: moment(joinRequest.requested_on).format('Do MMMM, YYYY'),
        teamId: joinRequest.id,
        totalMembers: joinRequest.member_count,
        actions: actionArray,
      });
    });

    const tableHeadRequests = _.cloneDeep(tableViewConfigs['teamInfo']);
    tableHeadRequests[4].title = 'REQUESTED ON';

    const cntincoming = received.length;
    const cntsent = sent.length;

    if (seeallincoming === false && received.length > limit) {
      received = received.slice(0, limit);
    }

    if (seeallsent === false && sent.length > limit) {
      sent = sent.slice(0, 3);
    }

    const totalZeroRequests =
      myPendingInvites.invitations.length === 0 &&
      myPendingJoinRequests.pendingJoinRequests.length === 0 &&
      cntsent === 0 &&
      cntincoming === 0;

    const ZeroRequestStyle = cx(s.zerorequests, {
      [s.zerorequestslight]: theme === 'Light',
    });

    return (
      <div>
        {(fetchingMyPendingInvites ||
          fetchingMyPendingJoinRequests ||
          fetchingMyRoostNetwork) && (
          <Loader
            loaderText={"Please wait while we fetch your Request's for you..."}
          />
        )}
        {!(
          fetchingMyPendingInvites ||
          fetchingMyPendingJoinRequests ||
          fetchingMyRoostNetwork
        ) && (
          <div>
            {!totalZeroRequests ? (
              <div className={containerStyle}>
                <div className={s.incomingRequests}>
                  <div className={s.headerContainer}>
                    <div className={s.incomingHeader}>
                      Incoming Pull Requests ({cntincoming})
                    </div>
                    {cntincoming > limit
                      ? [
                          seeallincoming === false ? (
                            <div
                              className={s.seeall}
                              onClick={() => this.onClickSeeAll('Incoming')}
                            >
                              See All
                            </div>
                          ) : (
                            <div
                              className={s.seeall}
                              onClick={() => this.onClickSeeLess('Incoming')}
                            >
                              See Less
                            </div>
                          ),
                        ]
                      : null}
                  </div>

                  {received.map((data, key) => {
                    return (
                      <div className={s.incomingRequestContainer}>
                        <IncomingRequests data={data} key={key} />
                      </div>
                    );
                  })}
                </div>
                <div className={s.sentRequests}>
                  <div className={s.headerContainer}>
                    <div className={s.sentHeader}>
                      Sent Push Requests({cntsent})
                    </div>
                    {cntsent > limit
                      ? [
                          seeallsent === false ? (
                            <div
                              className={s.seeall}
                              onClick={() => this.onClickSeeAll('Sent')}
                            >
                              See All
                            </div>
                          ) : (
                            <div
                              className={s.seeall}
                              onClick={() => this.onClickSeeLess('Sent')}
                            >
                              See Less
                            </div>
                          ),
                        ]
                      : null}
                  </div>
                  {sent.map((data, key) => {
                    return (
                      <div key={key} className={s.sentRequestsContainer}>
                        <SentRequests data={data} />
                      </div>
                    );
                  })}
                </div>
                <div className={s.sentRequests}>
                  <div className={s.headerContainer}>
                    <div className={s.sentHeader}>
                      Pending Team Invites ({myPendingInvites.count})
                    </div>
                    {showInvites === false ? (
                      <div
                        className={s.seeall}
                        onClick={() => this.setState({showInvites: true})}
                      >
                        Show
                      </div>
                    ) : (
                      <div
                        className={s.seeall}
                        onClick={() => this.setState({showInvites: false})}
                      >
                        Hide
                      </div>
                    )}
                  </div>
                  {showInvites && (
                    <div className={s.tableContainer}>
                      <Table
                        head={tableHeadRequests}
                        data={dataArrayInvites}
                        recordsPerPage={5}
                        theme={theme}
                      />
                    </div>
                  )}
                </div>
                <div className={s.sentRequests}>
                  <div className={s.headerContainer}>
                    <div className={s.sentHeader}>
                      Pending Team Join Requests ({myPendingJoinRequests.count})
                    </div>
                    {showRequests === false ? (
                      <div
                        className={s.seeall}
                        onClick={() => this.setState({showRequests: true})}
                      >
                        Show
                      </div>
                    ) : (
                      <div
                        className={s.seeall}
                        onClick={() => this.setState({showRequests: false})}
                      >
                        Hide
                      </div>
                    )}
                  </div>
                  {showRequests && (
                    <div className={s.tableContainer}>
                      <Table
                        head={tableHeadRequests}
                        data={dataArrayRequests}
                        recordsPerPage={5}
                        theme={theme}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={ZeroRequestStyle}>
                <img
                  src={
                    theme === 'Light'
                      ? zerorequestslightimage
                      : zerorequestimage
                  }
                  alt=""
                  className={s.norequestimage}
                />
                <p>You have no requests</p>
                <div className={s.button}>
                  <button
                    className={s.addrooster}
                    onClick={this.handleModalOpenClose}
                  >
                    <img src={addicon} alt="" />
                    <span>Add Rooster</span>
                  </button>
                </div>
                <AddRooster
                  open={showAddRoosterModal}
                  addRoosterDialogClose={() => this.handleModalOpenClose()}
                  theme={theme}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    roostnetwork: state.collaborate,
    appPreferences: state.appPreferences,
    eventViewer: state.eventViewer,
    system: state.system,
    teamView: state.teamView,
  };
}

export default connect(mapStateToProps, {
  getMyPendingJoinRequests,
  getMyPendingInvites,
  deleteJoinRequest,
  respondInvitation,
  getMyRoostNetwork,
})(MyRequest);
