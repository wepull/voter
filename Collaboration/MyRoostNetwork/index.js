import React, {Component} from 'react';
import {connect} from 'react-redux';
import * as _ from 'lodash';
import cx from 'classnames';
import axios from 'axios';
import https from 'https';

import SearchBar from '../Search/index';
import CollaborateButton from '../CollaborateButton';
import AddRooster from '../AddRooster';

import Table from '../../Table';
import Loader from '../../Loader';
import ConfirmAction from '../../ConfirmAction';
import Chip from '../../Chip';
// import RadioButton from '../../RadioButton/index';
import CheckBox from '../../CheckBox/index';

import pushIcon from '../../../assets/svgs/push.svg';
import pushIconLight from '../../../assets/svgs/push.svg';

import pullIcon from '../../../assets/svgs/pull.svg';
import pullIconLight from '../../../assets/svgs/pull-light.svg';

import revokeIcon from '../../../assets/svgs/icon-revoke.svg';
import revokeIconLight from '../../../assets/svgs/icon-revoke-light.svg';

import addicon from '../../../assets/svgs/icon-folder.svg';
import heartIcon from '../../../assets/svgs/icon-heart.svg';
import heartIconLight from '../../../assets/svgs/icon-heart-light.svg';

import clubIcon from '../../../assets/svgs/icon-clove.svg';
import clubIconLight from '../../../assets/svgs/icon-clove-light.svg';

import spadeIcon from '../../../assets/svgs/icon-spade.svg';
import spadeIconLight from '../../../assets/svgs/icon-spade-light.svg';

import downArrowIcon from '../../../assets/svgs/arrowDown.svg';
import downArrowIconLight from '../../../assets/svgs/arrowdown-light.svg';

import diamondIcon from '../../../assets/svgs/icon-diamond.svg';
import diamondIconLight from '../../../assets/svgs/icon-diamond-light.svg';

import DeleteIcon from '../../../assets/svgs/icon-delete-dark.svg';
import collaborateIcon from '../../../assets/svgs/icon-collaborate.svg';
import DeleteIconLight from '../../../assets/svgs/icon-delete-light.svg';
import zeroRoostNetwork from '../../../assets/svgs/no-roost-network.svg';
import collaborateIconDark from '../../../assets/svgs/icon-collaborateDark.svg';
import zeroRoostNetworkLight from '../../../assets/svgs/no-roost-network-light.svg';
// import favoriteIcon from "../../../assets/svgs/icon-star.svg";
// import favoriteIconDark from "../../../assets/svgs/icon-starDark.svg";

import {
  sendDataToElectronMainThread,
  sendDataToElectronBrowserWindow,
} from '../../../utils/electronBridges';
import {roosterStatus} from '../../../utils/apiConfig';
import tableViewConfig from '../../../utils/tableViewConfigs';

import {
  getMyRoostNetwork,
  userAction,
  setTextSearchRoostNetwork,
  setRoostNeworkFilter,
} from '../../../actions/collaborate';
import {getPushNetwork} from '../../../actions/collaborateShare';

import * as s1 from './myRoostNetwork.module.scss';
// import * as s2 from './myRoostNetworkRdeLite.module.scss';

const agent = new https.Agent({
  rejectUnauthorized: false,
});

class MyRoostNetwork extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showAddRoosterModal: false,
      showConfirmRevokeModal: false,
      roostHandleToRevoke: '',
      roostHandleToRemove: '',
      selectedfilter: '',
      pushPullFilter: {
        Push: true,
        Pull: true,
      },
      showtypefilter: false,
    };

    this.handleModalOpenClose = this.handleModalOpenClose.bind(this);
    this.sendUsernameData = this.sendUsernameData.bind(this);
    this.handleTextSearch = this.handleTextSearch.bind(this);
    this.checkRoosterAvailable = this.checkRoosterAvailable.bind(this);
    this.sharePayloadWithRooster = this.sharePayloadWithRooster.bind(this);
    this.revokePushPermissionFromRooster = this.revokePushPermissionFromRooster.bind(
      this,
    );
    this.deleteRooster = this.deleteRooster.bind(this);
    this.onClickApplyFilter = this.onClickApplyFilter.bind(this);
    this.onClickClearFilter = this.onClickClearFilter.bind(this);
    this.closeSelector = this.closeSelector.bind(this);
  }

  closeSelector(e) {
    const typeSelectorClicked = e.target.closest('#typeFilter');
    let {
      collaborate: {selectedRoostNetworkFilter},
    } = this.props;
    const selectedRoostNetworkFilterArray = _.cloneDeep(
      selectedRoostNetworkFilter,
    );
    if (!typeSelectorClicked) {
      if (
        selectedRoostNetworkFilterArray.length !==
        this.state.selectedfilter.length
      ) {
        this.setState({selectedfilter: selectedRoostNetworkFilterArray});
      }
      this.setState({showtypefilter: false});
    }
  }

  escFunction(e) {
    let {
      collaborate: {selectedRoostNetworkFilter},
    } = this.props;
    const selectedRoostNetworkFilterArray = _.cloneDeep(
      selectedRoostNetworkFilter,
    );
    if (e.keyCode === 27) {
      this.setState({
        showtypefilter: false,
        selectedfilter: selectedRoostNetworkFilterArray,
      });
    }
  }

  componentDidMount() {
    const {getMyRoostNetwork, getPushNetwork} = this.props;

    getPushNetwork();
    getMyRoostNetwork();
    window.addEventListener('click', (e) => this.closeSelector(e));
    window.addEventListener('keyup', (e) => {
      this.escFunction(e);
    });
  }

  componentDidUpdate(prevProps, prevState) {
    const {pushPullFilter} = this.state;
    if (prevState.pushPullFilter !== pushPullFilter) {
      if (pushPullFilter.Push && pushPullFilter.Pull) {
        this.setState({selectedfilter: ''});
      } else if (pushPullFilter.Push) {
        this.setState({selectedfilter: 'Push'});
      } else if (pushPullFilter.Pull) {
        this.setState({selectedfilter: 'Pull'});
      }
    }
  }

  onClickClearFilter() {
    this.setState({pushPullFilter: {Push: true, Pull: true}});
    this.setState({selectedfilter: ''});
  }

  componentWillUnmount() {
    window.removeEventListener('click', this.closeSelector);
  }

  onClickApplyFilter() {
    const {setRoostNeworkFilter} = this.props;
    const {selectedfilter} = this.state;

    setRoostNeworkFilter(selectedfilter);
    this.setState({showtypefilter: false});
  }

  handleTextSearch(e) {
    const {setTextSearchRoostNetwork} = this.props;
    const {value} = e.currentTarget;
    setTextSearchRoostNetwork(value);
  }

  handleModalOpenClose = (type) => {
    if (type === 'addRooster') {
      this.setState({
        showAddRoosterModal: !this.state.showAddRoosterModal,
      });
    } else if (type === 'confirmRevoke') {
      this.setState({
        showConfirmRevokeModal: !this.state.showConfirmRevokeModal,
      });
    }
  };

  sharePayloadWithRooster = async (data) => {
    try {
      const {
        cluster: {
          keys: {localApiAccessKey},
        },
      } = this.props;

      const roostHandle = _.get(data, 'roosterInfo.roost_handle') || '';
      const roosterName = _.get(data, 'roosterInfo.name') || '';
      if (roostHandle !== '') {
        const roosterAvailable = await axios.post(
          roosterStatus,
          {httpsAgent: agent, RoostHandle: roostHandle},
          {
            headers: {
              'Content-Type': 'application/json',
              ZBIO_CLUSTER_KEY: `${localApiAccessKey}`,
              ZBIO_CLUSTER_NAME: ``,
            },
          },
        );
        const status = _.get(roosterAvailable, 'data.Status');
        // Status is 1 which means rooster is online else not online, so send notifiation.
        if (status === 1) {
          sendDataToElectronMainThread('openCollaborateWindow', [data]);
        } else {
          sendDataToElectronMainThread('addNotification', [
            {
              type: 'addError',
              heading: 'Collaboration Share',
              message: `${`${roosterName} is not online at this moment`}`,
            },
          ]);
        }
      }
    } catch (e) {
      console.log(e);
    }
  };

  revokePushPermissionFromRooster = (data) => {
    this.setState({
      showConfirmRevokeModal: true,
      roostHandleToRevoke: _.get(data, 'roosterInfo.roost_handle', ''),
    });
  };

  deleteRooster = (data) => {
    this.setState({
      showConfirmRevokeModal: true,
      roostHandleToRemove: _.get(data, 'roosterInfo.roost_handle', ''),
    });
  };

  async checkRoosterAvailable(targetUser) {
    const {
      cluster: {
        keys: {localApiAccessKey},
      },
    } = this.props;

    const roosterAvailable = await axios.post(
      roosterStatus,
      {httpsAgent: agent, RoostHandle: targetUser},
      {
        headers: {
          'Content-Type': 'application/json',
          ZBIO_CLUSTER_KEY: `${localApiAccessKey}`,
          ZBIO_CLUSTER_NAME: ``,
        },
      },
    );
    if (roosterAvailable) {
      const status = _.get(roosterAvailable, 'data.Status') || 0;
      if (status === 1) {
        return true;
      }
      return false;
    }
    return false;
  }

  sendUsernameData = async (data) => {
    const targetUser = _.get(data, 'roosterInfo.roost_handle') || '';
    const name = _.get(data, 'roosterInfo.name') || '';
    const isOnline = await this.checkRoosterAvailable(targetUser);
    if (isOnline) {
      sendDataToElectronMainThread('openCollaborateWindow', [data]);
    } else {
      sendDataToElectronBrowserWindow('addNotification', [
        {
          type: 'addError',
          heading: 'Collaboration Share',
          message: `${name} Rooster is not online.`,
        },
      ]);
    }
  };

  render() {
    let {
      collaborate: {
        myRoostNetwork = [],
        textSearchRoostNetwork,
        selectedRoostNetworkFilter,
      },
      collaborateShare: {myPushNetwork = []},
      system: {
        loader: {fetchingMyRoostNetwork},
      },
      eventViewer: {eventViewerStatus = false},
      appPreferences: {theme},
      userAction,
    } = this.props;

    const s = s1;

    const {
      showAddRoosterModal,
      showConfirmRevokeModal,
      roostHandleToRevoke,
      roostHandleToRemove,
      showtypefilter,
      pushPullFilter,
    } = this.state;
    let dataArray = [];
    let filteredRoostNetwork = _.cloneDeep(myRoostNetwork);
    if (textSearchRoostNetwork.length > 0) {
      filteredRoostNetwork = filteredRoostNetwork.filter((d) => {
        const user = d.toUser || d.fromUser;
        const {
          first_name = '',
          last_name = '',
          company_name = '',
          username,
        } = user;
        const name = `${first_name} ${last_name}`;
        return (
          ((name &&
            name.toLowerCase().indexOf(textSearchRoostNetwork.toLowerCase()) >
              -1) ||
            (company_name &&
              company_name
                .toLowerCase()
                .indexOf(textSearchRoostNetwork.toLowerCase()) > -1) ||
            (username &&
              username
                .toLowerCase()
                .indexOf(textSearchRoostNetwork.toLowerCase()) > -1)) &&
          d.approval_status === 1
        );
      });
    }

    filteredRoostNetwork.forEach((d) => {
      const userInfo = d.toUser || d.fromUser || {};

      const {first_name: firstName = '', last_name: lastName = ''} = userInfo;
      let flag = 0;

      dataArray.forEach((data) => {
        if (data.roosterInfo.roost_handle === userInfo.username) {
          if (_.has(d, 'toUser') && d.approval_status === 1) {
            data.permissions.push({
              src: theme === 'Light' ? pushIconLight : pushIcon,
            });

            data.permval.push('send');
          } else if (_.has(d, 'fromUser') && d.approval_status === 1) {
            data.permissions.push({
              src: theme === 'Light' ? pullIconLight : pullIcon,
            });
            data.permval.push('receive');
          }
          flag = 1;
        }
      });

      if (flag === 0) {
        let name;
        if (!firstName && !lastName) {
          name = userInfo.username;
        } else if (firstName && !lastName) {
          name = firstName.trim();
        } else if (lastName && !firstName) {
          name = lastName.trim();
        } else if (firstName && lastName) {
          name = `${firstName.trim()} ${lastName.trim()}`;
        }

        const permissions = [];
        const permval = [];
        if (_.has(d, 'toUser')) {
          permissions.push({src: theme === 'Light' ? pushIconLight : pushIcon});

          permval.push('send');
        } else {
          permissions.push({src: theme === 'Light' ? pullIconLight : pullIcon});

          permval.push('receive');
        }

        if (d.approval_status !== 1) return;
        const iconList = [];
        const roles = (_.get(userInfo, 'role_ids', '') || '').split(',');

        roles.forEach((role) => {
          switch (role) {
            case 'cloud-native-developer':
              return iconList.push({
                src: theme === 'Light' ? diamondIconLight : diamondIcon,
              });
            case 'cloud-native-evangelist':
              return iconList.push({
                src: theme === 'Light' ? heartIconLight : heartIcon,
              });
            case 'cloud-native-executive':
              return iconList.push({
                src: theme === 'Light' ? spadeIconLight : spadeIcon,
              });
            case 'cloud-native-investor':
              return iconList.push({
                src: theme === 'Light' ? clubIconLight : clubIcon,
              });
            default:
              return iconList;
          }
        });

        const actionArray = [
          // {
          //   src: theme === "Dark" ? favoriteIcon : favoriteIconDark,
          // },
          {
            src: theme === 'Dark' ? collaborateIcon : collaborateIconDark,
            handler: (data) => this.sharePayloadWithRooster(data),
            message: 'Collaborate',
          },
          {
            src: theme === 'Dark' ? revokeIcon : revokeIconLight,
            handler: (data) => this.revokePushPermissionFromRooster(data),
            message: 'Revoke',
          },
          {
            src: theme === 'Dark' ? DeleteIcon : DeleteIconLight,
            handler: (data) => this.deleteRooster(data),
            message: 'Remove Permanently',
          },
        ];

        dataArray.push({
          roosterInfo: {
            name,
            roost_handle: userInfo.username,
            image_url: userInfo.avatar_url,
          },
          permissions,
          permval,
          role: iconList,
          company: userInfo.company_name,

          actions: actionArray,
        });
      }
    });

    dataArray.forEach((data) => {
      if (!_.includes(data.permval, 'receive')) {
        data.actions.pop();
        data.actions.pop();
      } else if (!_.includes(data.permval, 'send')) {
        data.actions.shift();
      }
    });

    const pushusers = [];

    if (myPushNetwork.length > 0) {
      myPushNetwork.forEach((d) => {
        pushusers.push(_.get(d, 'toUser.username', ''));
      });
    }

    dataArray.forEach((data) => {
      if (
        pushusers.indexOf(data.roosterInfo.roost_handle) === -1 &&
        _.includes(data.permval, 'send')
      ) {
        data.actions.shift();
      }
    });

    const MyRoostNetworkStyles = cx(s.container, {
      [s.containerLight]: theme === 'Light',
      [s.containerEventViewer]: eventViewerStatus === true,
    });

    const zeroRoostNetworkStyles = cx(s.zeroRoostNetwork, {
      [s.zeroRoostNetworkLight]: theme === 'Light',
    });

    const typeTogglerStyles = cx(s.typeToggler, {
      [s.toggleBorder]: showtypefilter === true,
    });

    const TypeArray = ['Push', 'Pull'];

    const TypeFilter = () => {
      const TypeFilter = TypeArray.map((n, i) => (
        <div className={s.radioButtonsContainer}>
          <div className={s.radioButton}>
            {/* <RadioButton
              title={n}
              theme={theme}
              checked={selectedfilter === n}
              name={n}
              key={i}
              onChangeFunction={() => this.setState({selectedfilter: n})}
            /> */}
            <CheckBox
              onChangeFunction={() => {
                if (n === 'Push' && pushPullFilter[n] && !pushPullFilter.Pull) {
                  this.setState({pushPullFilter: {Pull: true, Push: false}});
                } else if (
                  n === 'Pull' &&
                  pushPullFilter[n] &&
                  !pushPullFilter.Push
                ) {
                  this.setState({pushPullFilter: {Push: true, Pull: false}});
                } else {
                  this.setState({
                    pushPullFilter: {
                      ...pushPullFilter,
                      [n]: !pushPullFilter[n],
                    },
                  });
                }
              }}
              checked={pushPullFilter[n]}
              styles={{paddingLeft: '25px', paddingBottom: '5px'}}
              theme={theme}
              title={n}
              // labelStyle={true}
            />
          </div>
          <hr />
        </div>
      ));
      return TypeFilter;
    };

    if (selectedRoostNetworkFilter.length > 0) {
      if (selectedRoostNetworkFilter === 'Pull') {
        dataArray = dataArray.filter((d) => _.includes(d.permval, 'receive'));
      } else if (selectedRoostNetworkFilter === 'Push') {
        dataArray = dataArray.filter((d) => _.includes(d.permval, 'send'));
      }
    }

    const totalRoostNetwork = myRoostNetwork.length;

    return (
      <div>
        {fetchingMyRoostNetwork && (
          <Loader
            loaderText={
              'Please wait while we fetch your Roost Network for you...'
            }
          />
        )}
        {!fetchingMyRoostNetwork && (
          <>
            {totalRoostNetwork > 0 ? (
              <div className={MyRoostNetworkStyles}>
                {totalRoostNetwork > 0 && (
                  <div className={s.filterAndSearch}>
                    <div className={s.textSearch}>
                      <SearchBar
                        theme={theme}
                        handleTextSearch={(e) => this.handleTextSearch(e)}
                        searchValue={
                          this.props.collaborate.textSearchRoostNetwork
                        }
                        placeholder={'Search by Name, Roost handle, Company'}
                        height={'18px'}
                        width={'400px'}
                      />
                    </div>
                    {selectedRoostNetworkFilter && (
                      <div className={s.filterChip}>
                        <Chip
                          text={`Permission : ${selectedRoostNetworkFilter}`}
                          showCrossIcon={false}
                          theme={theme}
                        />
                      </div>
                    )}
                    <div className={s.filtersContainer}>
                      <div className={s.typeFilter} id="typeFilter">
                        <div
                          className={typeTogglerStyles}
                          onClick={() =>
                            this.setState({showtypefilter: !showtypefilter})
                          }
                        >
                          Permissions
                          <img
                            src={
                              theme === 'Light'
                                ? downArrowIconLight
                                : downArrowIcon
                            }
                            alt=""
                            className={s.downArrowIcon}
                          />
                        </div>
                        {showtypefilter && (
                          <div className={s.typeFilterBox}>
                            {TypeFilter()}

                            <div className={s.actionButtons}>
                              <button
                                className={s.clearall}
                                onClick={() => this.onClickClearFilter()}
                              >
                                Clear All
                              </button>
                              <button
                                className={s.apply}
                                onClick={() => this.onClickApplyFilter()}
                              >
                                Apply
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <CollaborateButton
                        clickHandler={() =>
                          this.handleModalOpenClose('addRooster')
                        }
                        theme={theme}
                      >
                        Add Rooster
                      </CollaborateButton>
                    </div>
                  </div>
                )}
                <div className={s.tableContainer}>
                  <Table
                    head={tableViewConfig.myRoostNetwork}
                    data={dataArray}
                    recordsPerPage={10}
                    theme={theme}
                  />

                  <AddRooster
                    open={showAddRoosterModal}
                    addRoosterDialogClose={() =>
                      this.handleModalOpenClose('addRooster')
                    }
                    theme={theme}
                  />
                  <ConfirmAction
                    open={showConfirmRevokeModal}
                    dialogClose={() =>
                      this.handleModalOpenClose('confirmRevoke')
                    }
                    theme={theme}
                    consentMessage={
                      roostHandleToRemove.length > 0
                        ? `Are you sure you want to remove "${roostHandleToRemove}" from your network?`
                        : `Are you sure you want to remove "${roostHandleToRevoke}" from your network?`
                    }
                    confirmConsentYes={() => {
                      if (roostHandleToRevoke) {
                        userAction(roostHandleToRevoke, 0);
                        this.setState({
                          showConfirmRevokeModal: false,
                          roostHandleToRevoke: '',
                        });
                      } else if (roostHandleToRemove) {
                        userAction(roostHandleToRemove, 2);
                        this.setState({
                          showConfirmRevokeModal: false,
                          roostHandleToRemove: '',
                        });
                      }
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className={zeroRoostNetworkStyles}>
                <img
                  src={
                    theme === 'Light' ? zeroRoostNetworkLight : zeroRoostNetwork
                  }
                  alt=""
                  className={s.norequestimage}
                />
                <p>Your Roost Network is empty </p>
                <div className={s.button}>
                  <button
                    className={s.addrooster}
                    onClick={() => this.handleModalOpenClose('addRooster')}
                  >
                    <img src={addicon} alt="" />
                    <span>Add Rooster</span>
                  </button>
                </div>
                <AddRooster
                  open={showAddRoosterModal}
                  addRoosterDialogClose={() =>
                    this.handleModalOpenClose('addRooster')
                  }
                  theme={theme}
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  }
}

const mapActionsToProps = {
  getMyRoostNetwork,
  userAction,
  setTextSearchRoostNetwork,
  getPushNetwork,
  setRoostNeworkFilter,
};

export default connect((state) => state, mapActionsToProps)(MyRoostNetwork);
