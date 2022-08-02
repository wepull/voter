import React, {Component} from 'react';
import * as _ from 'lodash';
import {connect} from 'react-redux';
import cx from 'classnames';
import * as s from './header.module.scss';
import expandArrowIcon from '../../../../assets/svgs/icon-infield-down-arrow.svg';
import {
  getPushNetwork,
  setShareFileType,
  shareWithRoosterName,
  shareWithTeamDetails,
  setCollabWithType,
  setTeamTargetUsers,
} from '../../../../actions/collaborateShare';
import DefaultProfilePic from '../../../DefaultProfilePic';
import {sendDataToElectronMainThread} from '../../../../utils/electronBridges';

import {
  getMyJoinedTeams,
  getDetailsTeam,
  setTeamContext,
} from '../../../../actions/teamView';

const collaborateOpt = ['Rooster', 'Team', 'Team Cluster'];
const artifactOpt = ['Image', 'Yaml', 'Helm Chart'];

class Header extends Component {
  _isMounted = false;
  constructor(props) {
    super(props);
    this.state = {
      collaborateWith: 'rooster',
      isHidden: true,
      isHiddenteammembers: true,
      setTextSearch: '',
      collabOptionSearch: 'Rooster',
      isHiddenCollabOptions: true,
      artifactOptionSearch: 'Yaml',
      isHiddenArtifactOptions: true,
      textSearchTeam: '',
      isHiddenTeam: true,
      members: [],
      selectedMembers: [],
      searchTeamMember: '',
      currentTeam: '',
      currentTeamid: '',
      clusterId: '',
      currentTeamClusterName: '',
    };

    this.onCheckRoosterName = this.onCheckRoosterName.bind(this);
    this.onCheckAll = this.onCheckAll.bind(this);
    this.checkRooster = this.checkRooster.bind(this);
    this.getTeamName = this.getTeamName.bind(this);
  }

  async componentDidMount() {
    this._isMounted = true;
    const {
      getPushNetwork,
      getMyJoinedTeams,
      collaborateShare: {myPushNetwork = []},
      setTeamContext,
    } = this.props;

    window.ipcRenderer.on('getTeamSwitch', async (e, msg, teamId) => {
      setTeamContext(msg[0]);
      await this.setState({
        currentTeam: msg[0],
        currentTeamid: msg[1],
        currentTeamClusterName: `team_${msg[0].replace(/ /g, '_')}`,
      });
      // if (msg[1] !== 'IndividualId') await getMyJoinedTeams();
      this.getTeamName(msg[0], msg[1]);
    });
    sendDataToElectronMainThread('getTeamSwitch');
    window.addEventListener('click', (e) => {
      const teamSearchSelectorClicked = e.target.closest('#teamSearchSelector');
      if (this._isMounted && !teamSearchSelectorClicked) {
        this.setState({
          isHiddenTeam: true,
          textSearchTeam: this.props.collaborateShare.shareWithTeamDetails.name
            ? this.props.collaborateShare.shareWithTeamDetails.name
            : '',
        });
      }
      const memberSearchSelectorClicked = e.target.closest(
        '#memberSearchSelector',
      );
      if (this._isMounted && !memberSearchSelectorClicked) {
        this.setState({
          isHiddenteammembers: true,
          // textSearchTeam: this.props.collaborateShare.shareWithTeamDetails.name
          //   ? this.props.collaborateShare.shareWithTeamDetails.name
          //   : '',
        });
      }
      const initUserInfo = _.get(
        this.props,
        'collaborateShare.shareWithRoosterName',
        {},
      );

      // console.log('initUserinfo: ', initUserInfo);
      let userName;

      const fName = _.get(initUserInfo, 'first_name', '');
      const lName = _.get(initUserInfo, 'last_name', '');
      if (!_.isEmpty(fName) && !_.isEmpty(lName)) {
        userName = `${fName} ${lName}`;
      } else {
        userName = _.get(initUserInfo, 'username', '');
      }

      const roosterSearchSelectorClicked = e.target.closest(
        '#roosterSearchSelector',
      );

      if (this._isMounted && !roosterSearchSelectorClicked) {
        this.setState({
          isHidden: true,
          setTextSearch: userName.trim(),
        });
      }
      const collabOptionSelectorClicked = e.target.closest(
        '#collabOptionSelector',
      );
      const artifactOptionSelectorClicked = e.target.closest(
        '#artifactOptionSelector',
      );
      if (this._isMounted && !collabOptionSelectorClicked) {
        this.setState({
          isHiddenCollabOptions: true,
        });
      }
      if (this._isMounted && !artifactOptionSelectorClicked) {
        this.setState({
          isHiddenArtifactOptions: true,
        });
      }
    });

    await getMyJoinedTeams();

    if (this.props.teamView.teamDetails.members) {
      this.setState({
        members: this.props.teamView.teamDetails.members.filter(
          (m) =>
            m.member_id !==
            this.props.teamView.myJoinedTeams.teams[0].member_id,
        ),
      });
    } else {
      this.setState({members: []});
    }
    let smarray = [];
    this.state.members.forEach((m) => smarray.push(m.username));
    this.setState({selectedMembers: smarray});
    if (myPushNetwork.length === 0) {
      await getPushNetwork();
    }
  }

  onCheckAll(event) {
    let smarray = [];
    if (event.currentTarget.checked) {
      this.state.members.forEach((m) => smarray.push(m.username));
      this.setState({selectedMembers: smarray});
      this.props.setTeamTargetUsers(smarray);
    } else {
      this.setState({selectedMembers: []});
      this.props.setTeamTargetUsers([]);
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate(nextProps, prevState) {
    const {shareFileType} = nextProps.collaborateShare;
    const {artifactOptionSearch} = prevState;

    if (shareFileType !== artifactOptionSearch) {
      this.setState({
        artifactOptionSearch: shareFileType,
      });
    }
  }

  onSearch(e) {
    const {value} = e.currentTarget;

    if (this.state.isHidden) {
      this.setState({
        isHidden: false,
        setTextSearch: '',
      });
    } else {
      this.setState({
        isHidden: false,
        setTextSearch: value,
      });
    }
  }

  onCheckRoosterName(member) {
    const {selectedMembers} = this.state;
    let selectedMembersArray = _.cloneDeep(selectedMembers);
    if (!selectedMembers.includes(member.username)) {
      selectedMembersArray.push(member.username);
    } else {
      selectedMembersArray = selectedMembersArray.filter(
        (d) => JSON.stringify(d) !== JSON.stringify(member.username),
      );
    }
    this.setState({selectedMembers: selectedMembersArray});
    this.props.setTeamTargetUsers(selectedMembersArray);
    this.setState({
      searchTeamMember: '',
    });
  }

  onSearchTeam(e) {
    const {value} = e.currentTarget;

    if (this.state.isHiddenTeam) {
      this.setState({
        isHiddenTeam: false,
        textSearchTeam: '',
      });
    } else {
      this.setState({
        isHiddenTeam: false,
        textSearchTeam: value,
      });
    }
  }
  onSearchTeamMember(e) {
    const {value} = e.currentTarget;

    if (this.state.isHiddenteammembers) {
      this.setState({
        isHiddenteammembers: false,
        searchTeamMember: '',
      });
    } else {
      this.setState({
        isHiddenteammembers: false,
        searchTeamMember: value,
      });
    }
  }

  checkRooster(member) {
    const {selectedMembers} = this.state;
    if (_.includes(selectedMembers, JSON.stringify(member)) === true) {
      return true;
    } else {
      return false;
    }
  }

  async getRoosterName(selectedUser) {
    const {shareWithRoosterName} = this.props;
    await shareWithRoosterName(selectedUser);

    this.setState({
      setTextSearch:
        selectedUser.first_name !== ''
          ? `${selectedUser.first_name} ${selectedUser.last_name}`
          : `${selectedUser.username}`,
      isHidden: true,
    });
  }

  async getTeamName(selectedTeam, selectedTeamId) {
    const {getDetailsTeam} = this.props;
    console.log('selectedTeamId', selectedTeamId);
    // await shareWithTeamDetails(selectedTeamId);
    await getDetailsTeam(selectedTeamId);

    this.setState({
      clusterId: _.get(
        this.props.teamView,
        'teamDetails.config.team_cluster_id',
        null,
      ),
    });
    this.setState({
      members:
        _.get(this.props, 'teamView.teamDetails.members', []).filter(
          (m) =>
            m.member_id !==
            this.props.teamView.myJoinedTeams.teams[0].member_id,
        ) || [],
      textSearchTeam: `${selectedTeam.name}` || '',
      isHiddenTeam: true,
    });
    let smarray = [];
    this.state.members.forEach((m) => smarray.push(m.username));
    this.setState({selectedMembers: smarray});
  }

  handleSourceIO = (event) => {};

  handleCollabOption = (e) => {
    const {setCollabWithType} = this.props;
    const {value} = e.target;
    this.setState({
      isHiddenCollabOptions: true,
    });
    setCollabWithType(value.toLowerCase());
  };

  handleArtifactOption = (e) => {
    const {setShareFileType} = this.props;
    const {value} = e.target;
    this.setState({
      artifactOptionSearch: value,
      isHiddenArtifactOptions: true,
    });
    setShareFileType(value.toLowerCase());
  };

  render() {
    const {
      collaborateShare: {myPushNetwork = [], collabWithType = 'rooster'},
      appPreferences: {theme},
      teamView: {myJoinedTeams = {teams: [], count: 0}},
    } = this.props;
    const {
      isHidden,
      setTextSearch,
      textSearchTeam,
      members,
      isHiddenCollabOptions,
      isHiddenArtifactOptions,
      artifactOptionSearch,
    } = this.state;

    let myPushRoostNetwork = myPushNetwork || [];
    if (setTextSearch && setTextSearch.length > 0) {
      myPushRoostNetwork = myPushRoostNetwork.filter((d) => {
        console.log('D: ', d);
        const user = d.toUser;
        // const {first_name: fName = '', last_name: lName = ''} = user || {};
        // const name = `${fName} ${lName}`;
        const fName = _.get(user, 'first_name', '');
        const lName = _.get(user, 'last_name', '');
        const username = _.get(user, 'username', '');
        let name;
        if (fName !== null && lName !== null) {
          name = `${fName} ${lName}`;
        } else {
          name = _.get(user, 'username', '');
        }
        return (
          name.toLowerCase().indexOf(setTextSearch.toLowerCase()) > -1 ||
          username.toLowerCase().indexOf(setTextSearch.toLowerCase()) > -1
        );
      });
    }

    let noTeamShow = '';
    let teamsList = myJoinedTeams.teams || [];
    if (teamsList.length === 0) {
      noTeamShow = 'No Joined Teams';
    }
    teamsList = teamsList.filter((item) => item.member_role === 'read-write');
    if (teamsList.length === 0 && noTeamShow === '') {
      noTeamShow = "You don't have Sharing Permission to your joined Teams";
    }

    if (textSearchTeam && textSearchTeam.length > 0) {
      teamsList = teamsList.filter((d) => {
        return d.name.toLowerCase().indexOf(textSearchTeam.toLowerCase()) > -1;
      });
    }
    let searchedMember = members;
    if (this.state.searchTeamMember && this.state.searchTeamMember.length > 0) {
      searchedMember = searchedMember.filter((d) => {
        return (
          d.username
            .toLowerCase()
            .indexOf(this.state.searchTeamMember.toLowerCase()) > -1 ||
          d.full_name
            .toLowerCase()
            .indexOf(this.state.searchTeamMember.toLocaleLowerCase()) > -1
        );
      });
    }

    const RoosterName = (props) => {
      const {
        avatar_url,
        name,
        username,
        sendRoosterName,
        onlyHeading = false,
      } = props;

      return (
        <div
          className={s.listContainer}
          onClick={() => {
            sendRoosterName();
          }}
        >
          <div className={s.userImage}>
            {avatar_url && <img src={avatar_url} alt="" />}
            {!avatar_url && <DefaultProfilePic name={name} />}
          </div>
          <div className={s.userNameHandle}>
            <div className={s.userName}> {name} </div>
            {!onlyHeading && <div className={s.userHandle}> {username} </div>}
          </div>
        </div>
      );
    };

    const network = myPushRoostNetwork
      .filter((data) => data.toUser)
      .map((each) => each.toUser);

    console.log('network: ', network);
    const roosterList = (
      <>
        {network.map((user, i) => {
          const {
            first_name: fName = '',
            last_name: lName = '',
            avatar_url = '',
            username = '',
          } = user || {};

          const Name = `${fName} ${lName}`;
          return (
            <RoosterName
              key={i}
              name={fName !== null && !_.isEmpty(Name.trim()) ? Name : username}
              avatar_url={avatar_url}
              username={username}
              sendRoosterName={() => {
                this.getRoosterName(user);
              }}
            />
          );
        })}

        {network.length === 0 && (
          <div className={s.noTeam}>
            No Rooster in your Network or You don't have Push Permissions to any
            Rooster
          </div>
        )}
      </>
    );
    let memberPlaceholder = '';
    this.state.members.forEach((m) => {
      if (this.state.selectedMembers.includes(m.username)) {
        memberPlaceholder = memberPlaceholder + m.full_name + ',';
      }
    });

    if (memberPlaceholder.length > 1) {
      memberPlaceholder = memberPlaceholder.slice(0, -1);
    }

    const teamMemberList = (membersOption) => {
      const sysSource = [];

      sysSource.push(
        <div key={'all'} className={s.memberSelector}>
          <input
            name="all"
            type="checkbox"
            checked={
              this.state.members.length === this.state.selectedMembers.length
            }
            onChange={(event) => this.onCheckAll(event)}
            id="all"
          />
          <label htmlFor="all" className={s.listContainer}>
            <p className={s.allLabel}>All</p>
          </label>
        </div>,
      );

      membersOption.forEach((key, i) => {
        const name = key.full_name;

        sysSource.push(
          <div
            key={key.member_id}
            className={s.memberSelector}
            onClick={() => this.onCheckRoosterName(key)}
          >
            <input
              name={name}
              type="checkbox"
              readOnly="readOnly"
              checked={this.state.selectedMembers.includes(key.username)}
              id={key.username}
            />
            <label htmlFor={name} className={s.listContainer}>
              <div className={s.userImage}>
                {key.avatar_url && <img src={key.avatar_url} alt="" />}
                {!key.avatar_url && <DefaultProfilePic name={name} />}
              </div>
              <div className={s.userNameHandle}>
                <div className={s.userName}> {name} </div>
              </div>
            </label>
          </div>,
        );
      });

      if (this.state.members.length === 0) {
        return [
          <div key="noTeam" className={s.noTeam}>
            Please add members to your Team
          </div>,
        ];
      }
      return [...sysSource];
    };

    const mainHeader = cx(s.mainHeader, {
      [s.mainHeaderLight]: theme === 'Light',
    });

    const CollabOptioins = (collaborateOpt) => {
      const collabOptions = [];
      collaborateOpt.forEach((key, i) => {
        if (key === 'Team Cluster') {
          //do nothing
        } else if (
          this.state.currentTeam === 'Individual' &&
          (key === 'Team' || key === 'Team Cluster')
        ) {
          //do nothing
        } else {
          if (!this.state.clusterId && key === 'Team Cluster') {
          } else {
            const name = key;
            collabOptions.push(
              <div key={key}>
                <option
                  value={`${name}`}
                  onClick={this.handleCollabOption.bind(name)}
                  className={s.collabOption}
                >
                  {name}
                </option>
              </div>,
            );
          }
        }
      });
      return [...collabOptions];
    };
    const ArtifactOptions = (artifactOpt) => {
      const artifactOptions = [];
      artifactOpt.forEach((key, i) => {
        const name = key;
        artifactOptions.push(
          <div key={key}>
            <option
              value={`${name}`}
              onClick={this.handleArtifactOption.bind(name)}
              className={s.artifactOption}
            >
              {name}
            </option>
          </div>,
        );
      });
      return [...artifactOptions];
    };

    return (
      <>
        <div className={mainHeader}>
          <div className={s.topDiv}>
            <p className={s.textHeading}>Collaborate with* : </p>
            <>
              <div id={'collabOptionSelector'} className={s.collabOptions}>
                <div className={s.collabName}>
                  <input
                    type="text"
                    className={s.inputText}
                    value={
                      collabWithType.charAt(0).toUpperCase() +
                      collabWithType.slice(1)
                    }
                    readOnly={true}
                    onClick={() => {
                      if (isHiddenCollabOptions === true) {
                        setCollabWithType('');
                        this.setState({
                          isHiddenCollabOptions: false,
                        });
                      }
                    }}
                  />
                  {!isHiddenCollabOptions && (
                    <div className={s.listOfCollabOptions}>
                      {CollabOptioins(collaborateOpt)}{' '}
                    </div>
                  )}
                </div>
                <div
                  className={s.dropdownOption}
                  onClick={() => {
                    if (isHiddenCollabOptions === true) {
                      this.setState({});
                    } else {
                      document.getElementById('root').click();
                    }
                    this.setState({
                      isHiddenCollabOptions: !isHiddenCollabOptions,
                    });
                  }}
                >
                  <img
                    src={expandArrowIcon}
                    alt=""
                    className={s.expandArrowIcon}
                  />
                </div>
              </div>
            </>
          </div>
          <div className={s.middleDiv}>
            {collabWithType === 'rooster' && (
              <>
                <p className={s.textHeading}>Rooster* : </p>
                <div id={'roosterSearchSelector'} className={s.singleInputDiv}>
                  <div className={s.roostersName}>
                    <input
                      type="text"
                      className={s.inputText}
                      value={setTextSearch}
                      onChange={(e) => this.onSearch(e)}
                      id="roosterInput"
                      onClick={() => {
                        if (isHidden === true) {
                          this.setState({
                            isHidden: false,
                            setTextSearch: '',
                          });
                        }
                      }}
                    />
                    {!isHidden && collabWithType === 'rooster' && (
                      <div className={s.listOfRooster}> {roosterList} </div>
                    )}
                  </div>
                  <div
                    className={s.dropdownOption}
                    onClick={() => {
                      if (isHidden === true) {
                        this.setState({
                          setTextSearch: '',
                        });
                        document.getElementById('roosterInput').focus();
                      } else {
                        document.getElementById('root').click();
                      }
                      this.setState({isHidden: !isHidden});
                    }}
                  >
                    <img
                      src={expandArrowIcon}
                      alt=""
                      className={s.expandArrowIcon}
                    />
                  </div>
                </div>
              </>
            )}
            {collabWithType === 'team' && (
              <>
                <div id={'teamSearchSelector'} className={s.singleInputDiv}>
                  <p className={s.textHeading}>Team* : </p>
                  <div className={cx(s.roostersName, s.teamName)}>
                    <label value={textSearchTeam} className={s.textHeading}>
                      {this.state.currentTeam}
                    </label>
                  </div>
                </div>
                <div id={'memberSearchSelector'} className={s.singleInputDiv}>
                  <p className={s.textHeading}>Members* : </p>
                  <div className={s.roostersName}>
                    <input
                      type="text"
                      className={s.inputText}
                      placeholder={
                        this.state.currentTeamid
                          ? this.state.members.length ===
                              this.state.selectedMembers.length &&
                            this.state.members.length > 0
                            ? 'All'
                            : memberPlaceholder
                          : ''
                      }
                      value={this.state.searchTeamMember}
                      onChange={(e) => {
                        this.onSearchTeamMember(e);
                      }}
                      onClick={() => {
                        this.setState({
                          isHiddenteammembers: !this.state.isHiddenteammembers,
                        });
                      }}
                    />
                    {!this.state.isHiddenteammembers && (
                      <>
                        {collabWithType === 'team' && (
                          <div className={s.listOfTeamMember}>
                            {teamMemberList(searchedMember)}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div
                    className={s.dropdownOption}
                    onClick={() => {
                      this.setState({
                        isHiddenteammembers: !this.state.isHiddenteammembers,
                      });
                    }}
                  >
                    <img
                      src={expandArrowIcon}
                      alt=""
                      className={s.expandArrowIcon}
                    />
                  </div>
                </div>
              </>
            )}
            {collabWithType === 'team cluster' && (
              <>
                <div id={'roosterSearchSelector'} className={s.singleInputDiv}>
                  <p className={s.textHeading}>Team Cluster* : </p>
                  <div className={s.roostersName}>
                    <label className={s.textHeading}>
                      {this.state.currentTeamClusterName}
                    </label>
                  </div>
                </div>
              </>
            )}
            {collabWithType === 'remote cluster' && (
              <>
                <div id={'roosterSearchSelector'} className={s.singleInputDiv}>
                  <p className={s.textHeading}>Remote Cluster* : </p>
                  <div className={s.roostersName}>
                    <input
                      type="text"
                      className={s.inputText}
                      value={setTextSearch}
                      onChange={(e) => this.onSearch(e)}
                      onClick={() => {
                        if (isHidden === true) {
                          this.setState({
                            isHidden: false,
                            setTextSearch: '',
                          });
                        }
                      }}
                    />
                    {!isHidden && collabWithType === 'remote cluster' && (
                      <div className={s.listOfRooster}> {roosterList} </div>
                    )}
                  </div>
                  <div
                    className={s.dropdownOption}
                    onClick={() => {
                      if (isHidden === true) {
                        this.setState({
                          setTextSearch: '',
                        });
                      } else {
                        document.getElementById('root').click();
                      }
                      this.setState({isHidden: !isHidden});
                    }}
                  >
                    <img
                      src={expandArrowIcon}
                      alt=""
                      className={s.expandArrowIcon}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          <div className={cx(s.topDiv, s.bottomDiv)}>
            <p className={cx(s.textHeading, s.artifactHeading)}>Artifact* :</p>
            <div id={'artifactOptionSelector'} className={s.artifactOptions}>
              <div className={s.artifactName}>
                <input
                  type="text"
                  className={s.inputText}
                  value={artifactOptionSearch}
                  readOnly={true}
                  onClick={() => {
                    if (isHiddenArtifactOptions === true) {
                      this.setState({
                        isHiddenArtifactOptions: false,
                        artifactOptionSearch: '',
                      });
                    }
                  }}
                />
                {!isHiddenArtifactOptions && (
                  <div className={s.listOfartifactOptions}>
                    {ArtifactOptions(artifactOpt)}{' '}
                  </div>
                )}
              </div>
              <div
                className={s.dropdownOption}
                onClick={() => {
                  if (isHiddenArtifactOptions === true) {
                    this.setState({});
                  } else {
                    document.getElementById('root').click();
                  }
                  this.setState({
                    isHiddenArtifactOptions: !isHiddenArtifactOptions,
                  });
                }}
              >
                <img
                  src={expandArrowIcon}
                  alt=""
                  className={s.expandArrowIcon}
                />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
}

const mapActionToProps = {
  getPushNetwork,
  setShareFileType,
  shareWithRoosterName,
  getMyJoinedTeams,
  shareWithTeamDetails,
  getDetailsTeam,
  setCollabWithType,
  setTeamTargetUsers,
  setTeamContext,
};

export default connect((state) => state, mapActionToProps)(Header);
