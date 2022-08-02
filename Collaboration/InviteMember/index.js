import React, {Component} from 'react';
import {connect} from 'react-redux';
import _ from 'lodash';
import cx from 'classnames';
import axios from 'axios';
import https from 'https';

import Modal from '../../Modal';
import CollaborateButton from '../CollaborateButton';
import RadioButton from '../../RadioButton';
import RoosterInfo from '../../RoosterInfo';
import AvatarWithCross from '../../AvatarWithCross';

import * as s from '../AddTeam/addTeam.module.scss';

import {getPendingInvitesToTeam} from '../../../actions/teamView';

import {sendDataToElectronMainThread} from '../../../utils/electronBridges';
import {inviteToTeamUrl, roosterSearchUrl} from '../../../utils/apiConfig';
import {getProperRoosterName} from '../../../utils/computeHelpers';

const agent = new https.Agent({
  rejectUnauthorized: true,
});

let cancelToken;

class InviteMember extends Component {
  _isMounted = true;

  constructor(props) {
    super(props);
    this.state = {
      searchBy: 'username',
      searchByValue: '',
      connectMessage: '',
      errorMessage: '',

      showFirstMemberSearches: false,
      firstMemberSearchTerm: '',
      firstMemberSearchList: {data: [], count: 0, totalMembers: 2682},
      firstMemberValuesList: [],
    };

    this.triggerConnectRequest = this.triggerConnectRequest.bind(this);
    this.setSearchType = this.setSearchType.bind(this);
    this.handleInputTextChange = this.handleInputTextChange.bind(this);
    this.handleClickCancel = this.handleClickCancel.bind(this);
  }

  handleInputTextChange = (e, type) => {
    this.setState({
      [type]: _.get(e, 'target.value', ''),
    });
  };

  triggerConnectRequest = async () => {
    try {
      const {
        inviteMemberDialogClose,
        collaborate: {roostIOKey},
        teamVariables,
        getPendingInvitesToTeam,
      } = this.props;

      const {searchBy, searchByValue, firstMemberValuesList} = this.state;

      const checkValidEmail = (email) => {
        let mailFormat = /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,254})$/i;
        return mailFormat.test(email);
      };

      const reqBody = {team_id: teamVariables[0]};
      let len = 0;

      if (searchBy === 'emailid') {
        if (!searchByValue) {
          this.handleSetError('Please enter an email address to continue');
          return;
        }
        let emailArray = [];
        let flag = true;
        for (let em of searchByValue.split(',')) {
          em = em.trim();
          if (!em) continue;
          if (!checkValidEmail(em)) {
            this.handleSetError(em + ' : not a valid email address');
            flag = false;
            break;
          } else {
            emailArray.push(em);
          }
        }
        if (!flag) return;
        reqBody['email'] = emailArray;
        len = emailArray.length;
      } else {
        let firstMembers = [];
        firstMemberValuesList.forEach((key, i) => {
          if (key.username !== '') {
            firstMembers.push(key.username);
          }
        });
        if (firstMembers.length < 1) {
          this.handleSetError('Please select a rooster to continue');
          return;
        }
        reqBody['username'] = firstMembers;
        len = firstMembers.length;
      }

      await axios
        .post(inviteToTeamUrl(), reqBody, {
          httpsAgent: agent,
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + roostIOKey,
          },
        })
        .then(async (response) => {
          sendDataToElectronMainThread('addNotification', [
            {
              type: 'addSuccess',
              heading: `${'Invited ' + len + ' Members Successfully'}`,
              message: `${'Action Performed for team ' + teamVariables[1]}`,
            },
          ]);
          this.setState({
            searchBy: 'username',
            searchByValue: '',
            connectMessage: '',
            errorMessage: '',
            firstMemberValuesList: [],
          });
          inviteMemberDialogClose();
          getPendingInvitesToTeam(teamVariables[0]);
        })
        .catch((e) => {
          console.log(e);
          if (e.response && e.response.data && e.response.data.message) {
            this.handleSetError(e.response.data.message);
          }
        });
    } catch (e) {
      console.log(e);
    }
  };

  handleSetError(er) {
    this.setState({
      errorMessage: er,
    });
    setTimeout(() => {
      this.setState({errorMessage: ''});
    }, 5000);
  }

  setSearchType = (value) => {
    this.setState({
      searchBy: value,
      errorMessage: '',
    });
  };

  componentDidMount() {
    this._isMounted = true;
    window.addEventListener('click', (e) => {
      const inviteMemberDropdownClicked = e.target.closest(
        '#inviteMemberDropdown',
      );
      if (this._isMounted && !inviteMemberDropdownClicked) {
        this.setState({
          showFirstMemberSearches: false,
        });
      }
    });
  }

  componentDidUpdate(prevProps) {
    if (this.props.open !== prevProps.open) {
      this.handleClickCancel();
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  handleClickCancel = () => {
    this.setState({
      searchBy: 'username',
      searchByValue: '',
      connectMessage: '',
      errorMessage: '',
      firstMemberValuesList: [],
    });
  };

  async handleFirstMembersSearch(e) {
    const searchTerm = e.target.value;
    this.setState({
      showFirstMemberSearches: true,
      firstMemberSearchTerm: searchTerm,
    });
    if (searchTerm.length < 3) {
      this.setState({
        showFirstMemberSearches: false,
      });
      return;
    }

    const {
      collaborate: {roostIOKey},
    } = this.props;

    //Check if there are any previous pending requests
    if (typeof cancelToken != typeof undefined) {
      cancelToken.cancel('Operation canceled due to new request.');
    }

    //Save the cancel token for the current request
    cancelToken = axios.CancelToken.source();

    try {
      await axios
        .post(
          roosterSearchUrl(),
          {
            take: 10,
            skip: 0,
            username: searchTerm,
          },
          {
            cancelToken: cancelToken.token,
            headers: {
              Authorization: `Bearer ${roostIOKey}`,
              'Content-Type': 'application/json',
            },
          },
        )
        .then((response) => {
          this.setState({firstMemberSearchList: response.data});
        })
        .catch((error) => {
          console.log(error);
        });
    } catch (error) {
      console.log(error);
    }
  }

  handleFirstMembersPush(v) {
    const {firstMemberValuesList} = this.state;
    let flag = true;

    firstMemberValuesList.forEach((m, i) => {
      if (m.username === v.username) flag = false;
    });

    if (flag) {
      this.setState({firstMemberValuesList: [...firstMemberValuesList, v]});
    }
  }

  handleFirstMemberCross(username) {
    let memList = this.state.firstMemberValuesList;
    const index = memList.findIndex((m) => m.username === username);
    if (index > -1) {
      memList.splice(index, 1);
    }
    this.setState({firstMemberValuesList: memList});
  }

  render() {
    const {
      open = false,
      inviteMemberDialogClose = () => console.log('Close clicked'),
      theme,
    } = this.props;

    const {
      searchBy,
      searchByValue,
      errorMessage,

      showFirstMemberSearches,
      firstMemberSearchList,
      firstMemberSearchTerm,
      firstMemberValuesList,
    } = this.state;

    const firstMemberSearchOptions = (memberData) => {
      const fmArray = [];

      memberData.forEach((m, i) => {
        fmArray.push(
          <div key={i} className={s.listSelector}>
            <div
              value={m.username}
              onClick={() => this.handleFirstMembersPush(m)}
              className={s.listOption}
            >
              <RoosterInfo
                heading={getProperRoosterName(m)}
                subHeading={m.username}
                image={m.avatar_url}
                theme={theme}
                normalSubHeading={true}
              />
            </div>
          </div>,
        );
      });
      return [...fmArray];
    };

    const firstMemberValuesOptions = () => {
      const imageArray = [];

      firstMemberValuesList.forEach((m, i) => {
        imageArray.push(
          <AvatarWithCross
            key={i}
            theme={theme}
            name={getProperRoosterName(m)}
            avatar_url={m.avatar_url}
            username={m.username}
            handleCrossClick={() => {
              this.handleFirstMemberCross(m.username);
            }}
          />,
        );
      });
      return [...imageArray];
    };

    const addTeamFormStyles = cx(s.addTeamForm, {
      [s.addTeamFormLight]: theme === 'Light',
    });

    return (
      <Modal
        open={open}
        closeHandler={inviteMemberDialogClose}
        minHeight={'150px'}
        padding={'10px'}
        theme={theme}
      >
        <div className={addTeamFormStyles}>
          <div className={s.eachInputRow}>
            <div className={s.title}>Select :</div>
            <div className={s.typeInputs}>
              <RadioButton
                theme={theme}
                name="searchBy"
                title="Username"
                styles={{marginRight: '0'}}
                checked={searchBy === 'username'}
                onChangeFunction={() => {
                  this.setSearchType('username');
                }}
              />
              <RadioButton
                theme={theme}
                name="searchBy"
                title="Email ID"
                styles={{marginRight: '0'}}
                checked={searchBy === 'emailid'}
                onChangeFunction={() => {
                  this.setSearchType('emailid');
                }}
              />
            </div>
          </div>

          {searchBy === 'emailid' ? (
            <div className={s.eachInputRow}>
              <div className={s.title}>Invite* :</div>
              <div className={s.typeInputs}>
                <input
                  type="text"
                  onChange={(e) =>
                    this.handleInputTextChange(e, 'searchByValue')
                  }
                  value={searchByValue}
                  placeholder={"Enter rooster's email id separated by comma"}
                  style={{marginTop: '5px'}}
                />
              </div>
            </div>
          ) : (
            <div className={s.eachInputRow}>
              <div className={s.title}>Invite* :</div>
              <div className={s.typeInputs} id={'inviteMemberDropdown'}>
                <div className={s.IconAndInput}>
                  <div className={s.selectedIconList}>
                    {firstMemberValuesOptions()}
                  </div>
                  <input
                    type="text"
                    onChange={(e) => this.handleFirstMembersSearch(e)}
                    placeholder="Search for Roosters by name/username (min 3 chars) ..."
                    value={firstMemberSearchTerm}
                    onClick={() => {
                      if (firstMemberSearchTerm.length >= 3) {
                        this.setState({showFirstMemberSearches: true});
                      }
                    }}
                  />
                </div>
                {firstMemberSearchList.data.length > 0 &&
                  showFirstMemberSearches && (
                    <div className={s.listBox} style={{maxHeight: '160px'}}>
                      {firstMemberSearchOptions(firstMemberSearchList.data)}
                    </div>
                  )}
              </div>
            </div>
          )}

          <div className={s.eachInputRow}>
            <div className={s.title}>Message :</div>
            <div className={s.typeInputs}>
              <textarea
                placeholder="Add your message here"
                onChange={(e) =>
                  this.handleInputTextChange(e, 'connectMessage')
                }
                style={{height: '60px'}}
              />
            </div>
          </div>
          <div className={s.eachInputRow}>
            <div className={s.title}></div>
            <div className={s.typeInputs}>
              <div className={s.userIdErrorMsg400}>
                {errorMessage ? `* ${errorMessage}` : ''}
              </div>
            </div>
          </div>

          <div className={s.divider} />

          <div className={s.footer}>
            <div className={s.actionButtons}>
              <div
                className={s.cancel}
                onClick={this.props.inviteMemberDialogClose}
              >
                Cancel
              </div>
              <CollaborateButton
                styles={{margin: '9px 0 0 15px', padding: '2px 30px'}}
                clickHandler={() => this.triggerConnectRequest()}
              >
                Invite
              </CollaborateButton>
            </div>
          </div>
        </div>
      </Modal>
    );
  }
}

export default connect((state) => state, {getPendingInvitesToTeam})(
  InviteMember,
);
