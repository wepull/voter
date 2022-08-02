import React, {Component} from 'react';
import {connect} from 'react-redux';
import axios from 'axios';
import https from 'https';
import _ from 'lodash';
import cx from 'classnames';

import * as s from './addRooster.module.scss';

import Modal from '../../Modal';
import RoosterInfo from '../../RoosterInfo';
import RadioButton from '../../RadioButton';
import AvatarWithCross from '../../AvatarWithCross';
import CollaborateButton from '../CollaborateButton';

import {getMyRoostNetwork, setScreenType} from '../../../actions/collaborate';

import {addRoosterUrl, roosterSearchUrl} from '../../../utils/apiConfig';
import {getProperRoosterName} from '../../../utils/computeHelpers';
import {sendDataToElectronMainThread} from '../../../utils/electronBridges';

const agent = new https.Agent({
  rejectUnauthorized: true,
});

let cancelToken;

class AddRooster extends Component {
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
        getMyRoostNetwork,
        addRoosterDialogClose,
        collaborate: {roostIOKey},
        setScreenType,
      } = this.props;

      const {
        connectMessage,
        searchBy,
        searchByValue,
        firstMemberValuesList,
      } = this.state;

      const checkValidEmail = (email) => {
        let mailFormat = /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,254})$/i;
        return mailFormat.test(email);
      };

      const reqBody = {};
      if (connectMessage) reqBody['description'] = connectMessage;

      if (searchBy === 'emailid') {
        if (!searchByValue) {
          this.handleSetError('Please enter an email address to continue');
          return;
        }

        if (!checkValidEmail(searchByValue)) {
          this.handleSetError('Please enter a valid email address to continue');
          return;
        }

        reqBody['toEmail'] = searchByValue;
      } else {
        if (firstMemberValuesList.length < 1) {
          this.handleSetError('Please select a rooster to continue');
          return;
        }

        if (firstMemberValuesList[0] && firstMemberValuesList[0].username) {
          reqBody['toUser'] = firstMemberValuesList[0].username;
        } else {
          this.handleSetError('Please select a rooster to continue');
          return;
        }
      }

      await axios
        .post(addRoosterUrl(), reqBody, {
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
              header: 'Collaboration',
              message: `${'Added Rooster Successfully'}`,
            },
          ]);
          this.setState({
            searchBy: 'username',
            searchByValue: '',
            connectMessage: '',
            errorMessage: '',
            firstMemberValuesList: [],
          });
          addRoosterDialogClose();
          // fetching my updated network
          getMyRoostNetwork();
          // closing the add rooster modal
          setScreenType('request');
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
    window.addEventListener('click', (e) => {
      const addRoosterCollabDropdownClicked = e.target.closest(
        '#addRoosterCollabDropdown',
      );
      if (!addRoosterCollabDropdownClicked) {
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
          // console.log(response.data);
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
    this.setState({firstMemberValuesList: [v]});
  }
  handleFirstMemberCross(username) {
    this.setState({firstMemberValuesList: []});
  }

  render() {
    const {
      open = false,
      addRoosterDialogClose = () => console.log('Close clicked'),
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

    const addRoosterFormStyles = cx(s.addRoosterForm, {
      [s.addRoosterFormLight]: theme === 'Light',
    });

    return (
      <Modal
        open={open}
        closeHandler={addRoosterDialogClose}
        minHeight={'150px'}
        padding={'10px'}
        theme={theme}
      >
        <div className={addRoosterFormStyles}>
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
              <div className={s.title}>Collaborate With* :</div>
              <div className={s.typeInputs}>
                <input
                  type="text"
                  autoFocus={true}
                  onChange={(e) =>
                    this.handleInputTextChange(e, 'searchByValue')
                  }
                  value={searchByValue}
                  placeholder={"Enter rooster's email id"}
                  style={{marginTop: '5px'}}
                />
              </div>
            </div>
          ) : (
            <div className={s.eachInputRow}>
              <div className={s.title}>Collaborate With* :</div>
              <div className={s.typeInputs} id={'addRoosterCollabDropdown'}>
                <div className={s.IconAndInput}>
                  <div className={s.selectedIconList}>
                    {firstMemberValuesOptions()}
                  </div>
                  <input
                    type="text"
                    autoFocus={true}
                    onChange={(e) => this.handleFirstMembersSearch(e)}
                    placeholder={
                      'Search for Roosters by name/username (min 3 chars) ...'
                    }
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
                    <div className={s.listBox}>
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
            <div
              className={s.cancel}
              onClick={this.props.addRoosterDialogClose}
            >
              Cancel
            </div>
            <CollaborateButton
              styles={{margin: '9px 0 0 15px', padding: '2px 30px'}}
              clickHandler={() => this.triggerConnectRequest()}
            >
              Send
            </CollaborateButton>
          </div>
        </div>
      </Modal>
    );
  }
}

export default connect((state) => state, {
  getMyRoostNetwork,
  setScreenType,
})(AddRooster);
