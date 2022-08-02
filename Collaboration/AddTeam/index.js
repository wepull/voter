import React, {Component, createRef} from 'react';
import {connect} from 'react-redux';
import axios from 'axios';
import https from 'https';
import cx from 'classnames';

import Modal from '../../Modal';
import CollaborateButton from '../CollaborateButton';
import CheckBox from '../../CheckBox';
import RadioButton from '../../RadioButton';
import RoosterInfo from '../../RoosterInfo';
import AvatarWithCross from '../../AvatarWithCross';

// import FolderIcon from '../../../assets/svgs/folder.svg';

import * as s from './addTeam.module.scss';

import {getMyJoinedTeams} from '../../../actions/teamView';

import {createTeamUrl, roosterSearchUrl} from '../../../utils/apiConfig';
import {sendDataToElectronMainThread} from '../../../utils/electronBridges';
import {getProperRoosterName} from '../../../utils/computeHelpers';
import {configArray} from '../../../utils/configUtils';
import {
  versionarray,
  clustersizingarray,
  vCpuArray,
  diskArray,
  memoryArray,
} from '../../../utils/preferenceUtils';

const agent = new https.Agent({
  rejectUnauthorized: true,
});

let cancelToken;

class AddTeam extends Component {
  _isMounted = false;
  constructor(props) {
    super(props);
    this.state = {
      flag: false,
      errorMessage: '',
      errorMessageOrg: '',
      name: '',
      description: '',
      visibility: 'private',
      org: '',
      config: {},

      showK8sVersionToggler: false,
      showClusterSizeToggler: false,
      showVCpuToggler: false,
      showDiskToggler: false,
      showMemoryToggler: false,
      firstMemberValuesFlag: false,

      showFirstMemberSearches: false,
      firstMemberSearchTerm: '',
      firstMemberSearchList: {data: [], count: 0, totalMembers: 2682},
      firstMemberValuesList: [],
    };
    this.openFileRef = createRef();

    this.triggerConnectRequest = this.triggerConnectRequest.bind(this);
    this.handleInputTextChange = this.handleInputTextChange.bind(this);
    this.handleClickCancel = this.handleClickCancel.bind(this);
    this.handleConfigChange = this.handleConfigChange.bind(this);
    this.onChangeFile = this.onChangeFile.bind(this);
  }

  handleInputTextChange = (e, type) => {
    const regexName = /^[a-zA-Z]+(( |'|-|_)?[a-zA-Z0-9])+( )*$/;
    if (type === 'is_auto_sync') {
      this.setState({
        [type]: e.target.value === 'true',
      });
      this.setState({
        config: {
          ...this.state.config,
          is_auto_sync: e.target.value === 'true',
        },
      });
    } else if (type === 'name') {
      if (e.target.value.length < 3 || e.target.value.length > 200) {
        this.setState({
          name: e.target.value,
          errorMessage: 'Please enter at least 3-200 characters',
          flag: false,
        });
      } else if (/^[0-9]+/.test(e.target.value)) {
        this.setState({
          name: e.target.value,
          errorMessage: 'Team name should not begin with number',
          flag: false,
        });
      } else {
        if (!regexName.test(e.target.value)) {
          if (e.target.value.includes('_ ') || e.target.value.includes(' _')) {
            this.setState({
              name: e.target.value,
              errorMessage: 'Space is not allowed before or after _',
              flag: false,
            });
          } else if (
            e.target.value.startsWith('_') ||
            e.target.value.startsWith('-') ||
            e.target.value.startsWith("'") ||
            e.target.value.startsWith(' ')
          ) {
            this.setState({
              name: e.target.value,
              errorMessage: "Team name cannot start with - ' _ and whitespace",
              flag: false,
            });
          } else if (
            e.target.value.includes('- ') ||
            e.target.value.includes(' -')
          ) {
            this.setState({
              name: e.target.value,
              errorMessage: 'Space in not allowed before or after -',
              flag: false,
            });
          } else if (
            e.target.value.endsWith("' ") ||
            e.target.value.endsWith(" '")
          ) {
            this.setState({
              name: e.target.value,
              errorMessage: "Space is not allowed before or after '",
              flag: false,
            });
          } else if (e.target.value.includes('  ')) {
            this.setState({
              name: e.target.value,
              errorMessage:
                'More than one whitespace is not allowed between words',
              flag: false,
            });
          } else if (
            e.target.value.endsWith('_') ||
            e.target.value.endsWith('-') ||
            e.target.value.endsWith("'") ||
            e.target.value.endsWith(' ')
          ) {
            this.setState({
              name: e.target.value,
              errorMessage: "Team name cannot end with - ' _ and whitespace",
              flag: false,
            });
          } else {
            this.setState({
              name: e.target.value,
              errorMessage: "Only - ' _ and whitespace allowed",
              flag: false,
            });
          }
        } else {
          this.setState({
            name: e.target.value,
            errorMessage: '',
            flag: true,
          });
        }
      }
    } else {
      this.setState({
        [type]: e.target.value,
      });
    }
  };

  handleVisibilityChange(type) {
    this.setState({
      visibility: type,
      config: {
        ...this.state.config,
        visibility: type,
      },
    });
  }

  handleConfigChange = (e, type) => {
    this.setState({config: {...this.state.config, [type]: e.target.value}});
  };

  triggerConnectRequest = async () => {
    try {
      const {
        addTeamDialogClose = () => console.log('Close Happened by Send'),
        getMyJoinedTeams = () => console.log('Refresh My Joined Teams Data'),
        handleApplyResetSearchFilter = () => console.log('Reset Search Data'),
        collaborate: {roostIOKey},
      } = this.props;

      const {
        name,
        description,
        firstMemberValuesList,
        visibility,
        org,
        config,
        flag,
      } = this.state;

      let configValues = {};

      Object.keys(config).forEach((k, i) => {
        if (!(config[k] === null || config[k] === 'null' || config[k] === '')) {
          configValues = {...configValues, [k]: config[k]};
        }
      });

      let firstMembers = [];
      firstMemberValuesList.forEach((key, i) => {
        if (key.username !== '') {
          firstMembers.push(key.username);
        }
      });

      if (name === '') {
        this.setState({
          errorMessage: 'Please enter a team name',
          flag: false,
        });
      }
      if (name.length < 3 || name.length > 200) {
        this.setState({
          errorMessage: 'Please enter at least 3-200 characters',
          flag: false,
        });
      }
      if (flag) {
        await axios
          .post(
            createTeamUrl(),
            {
              name: name,
              description: description,
              firstMembers: firstMembers,
              visibility: visibility,
              org: org,
              config: configValues,
            },
            {
              httpsAgent: agent,
              headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + roostIOKey,
              },
            },
          )
          .then(async (response) => {
            sendDataToElectronMainThread('updateTeamMenu');
            sendDataToElectronMainThread('addNotification', [
              {
                type: 'addSuccess',
                header: 'Collaboration',
                message: `Team ${name} Created Successfully`,
              },
            ]);
            this.setState({
              errorMessage: '',
              errorMessageOrg: '',
              name: '',
              description: '',
              visibility: 'private',
              org: '',
              firstMemberValuesList: [],
              flag: false,
            });
            getMyJoinedTeams();
            handleApplyResetSearchFilter();
            addTeamDialogClose();
          })
          .catch((e) => {
            console.log(e.response);
            if (e.response && e.response.data && e.response.data.message) {
              this.setState({
                errorMessageOrg: e.response.data.message,
              });
              setTimeout(() => {
                this.setState({errorMessageOrg: ''});
              }, 5000);
            }
          });
      }
    } catch (e) {
      console.log(e);
    }
  };

  editOrgTerm = (e) => {
    this.setState({org: e.target.value});
  };

  componentDidUpdate(prevProps) {
    if (this.props.open !== prevProps.open) {
      this.handleClickCancel();
    }
  }

  componentDidMount() {
    this._isMounted = true;
    window.addEventListener('click', (e) => {
      const configTableAddTeamClicked = e.target.closest('#configTableAddTeam');
      if (this._isMounted && !configTableAddTeamClicked) {
        this.setState({
          showClusterSizeToggler: false,
          showVCpuToggler: false,
          showDiskToggler: false,
          showMemoryToggler: false,
          showK8sVersionToggler: false,
        });
      }

      const firstMemberDropdownClicked = e.target.closest(
        '#firstMemberDropdown',
      );
      if (this._isMounted && !firstMemberDropdownClicked) {
        this.setState({
          showFirstMemberSearches: false,
        });
      }
    });

    if (this._isMounted && configArray) {
      let configObj = {};
      configArray.forEach((cf, i) => {
        if (cf.enable === false) return null;
        configObj = {...configObj, [cf.id]: cf.default_value};
      });
      this.setState({config: configObj});
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  handleClickCancel = () => {
    this.setState({
      flag: false,
      errorMessage: '',
      errorMessageOrg: '',
      name: '',
      description: '',
      visibility: 'private',
      org: '',
      firstMemberValuesList: [],
    });
  };

  handleArrayType = (e, k) => {
    const {value} = e.target;

    if (k === 'k8s_version') {
      this.setState({
        config: {...this.state.config, k8s_version: value},
        showK8sVersionToggler: false,
      });
    } else if (k === 'cluster_size') {
      this.setState({
        config: {...this.state.config, cluster_size: value},
        showClusterSizeToggler: false,
      });
    } else if (k === 'vcpu_per_node') {
      this.setState({
        config: {...this.state.config, vcpu_per_node: value},
        showVCpuToggler: false,
      });
    } else if (k === 'disk_per_node') {
      this.setState({
        config: {...this.state.config, disk_per_node: value},
        showDiskToggler: false,
      });
    } else if (k === 'memory_per_node') {
      this.setState({
        config: {...this.state.config, memory_per_node: value},
        showMemoryToggler: false,
      });
    }
  };

  handleInputClick(k) {
    const {
      showK8sVersionToggler,
      showClusterSizeToggler,
      showVCpuToggler,
      showDiskToggler,
      showMemoryToggler,
    } = this.state;

    if (k === 'k8s_version') {
      this.setState({
        showClusterSizeToggler: false,
        showVCpuToggler: false,
        showDiskToggler: false,
        showMemoryToggler: false,
        showK8sVersionToggler: !showK8sVersionToggler,
      });
    } else if (k === 'cluster_size') {
      this.setState({
        showK8sVersionToggler: false,
        showVCpuToggler: false,
        showDiskToggler: false,
        showMemoryToggler: false,
        showClusterSizeToggler: !showClusterSizeToggler,
      });
    } else if (k === 'vcpu_per_node') {
      this.setState({
        showK8sVersionToggler: false,
        showClusterSizeToggler: false,
        showDiskToggler: false,
        showMemoryToggler: false,
        showVCpuToggler: !showVCpuToggler,
      });
    } else if (k === 'disk_per_node') {
      this.setState({
        showK8sVersionToggler: false,
        showClusterSizeToggler: false,
        showVCpuToggler: false,
        showMemoryToggler: false,
        showDiskToggler: !showDiskToggler,
      });
    } else if (k === 'memory_per_node') {
      this.setState({
        showK8sVersionToggler: false,
        showClusterSizeToggler: false,
        showVCpuToggler: false,
        showDiskToggler: false,
        showMemoryToggler: !showMemoryToggler,
      });
    }
  }

  handleCheckBoxClick(k) {
    const {config} = this.state;
    this.setState({
      config: {...this.state.config, [k]: config[k] ? !config[k] : true},
    });
  }

  onChangeFile(event) {
    event.stopPropagation();
    event.preventDefault();
    var file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.addEventListener('load', (event) => {
        this.setState({
          config: {...this.state.config, opa_policy: event.target.result},
        });
      });
      reader.readAsText(file);
    }
  }

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
          console.log(response.data);
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
      addTeamDialogClose = () => console.log('Close clicked'),
      theme,
    } = this.props;
    const {
      visibility,
      errorMessage,
      errorMessageOrg,
      config,

      showK8sVersionToggler,
      showClusterSizeToggler,
      showVCpuToggler,
      showDiskToggler,
      showMemoryToggler,

      showFirstMemberSearches,
      firstMemberSearchList,
      firstMemberSearchTerm,
      firstMemberValuesList,
    } = this.state;

    const addTeamFormStyles = cx(s.addTeamForm, {
      [s.addTeamFormLight]: theme === 'Light',
    });

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

    const arrayTypeOptions = (arrayTypeOpt, type) => {
      const arrayType = [];

      arrayTypeOpt.forEach((key, i) => {
        const name = key;
        const arrayTypeStyles = cx(s.menuSelector, {
          [s.menuSelectorApplied]:
            (type === 'k8s_version' && name === config.k8s_version) ||
            (type === 'cluster_size' && name === config.cluster_size) ||
            (type === 'vcpu_per_node' && name === config.vcpu_per_node) ||
            (type === 'disk_per_node' && name === config.disk_per_node) ||
            (type === 'memory_per_node' && name === config.memory_per_node),
        });

        arrayType.push(
          <div key={key} className={arrayTypeStyles}>
            <option
              value={name}
              onClick={(e) => this.handleArrayType(e, type)}
              className={s.menuOption}
            >
              {name}
            </option>
          </div>,
        );
      });

      return [...arrayType];
    };

    const configTable = () => {
      const tableArray = [];

      configArray.forEach((cf, i) => {
        if (cf.enable === false) return null;
        if (cf.type === 'none') {
          return null;
        } else if (cf.type === 'checkbox') {
          tableArray.push(
            <div key={i} className={s.tableLeft}>
              <div className={s.checkBoxInput}>
                <CheckBox
                  theme={theme}
                  styles={{height: '20px', justifyContent: 'flex-end'}}
                  name="fileType"
                  key={i}
                  title={cf.title}
                  checked={config[cf.id] ? true : false}
                  onChangeFunction={() => {
                    this.handleCheckBoxClick(cf.id);
                  }}
                />
              </div>
            </div>,
          );
        } else if (cf.type === 'dropdown') {
          tableArray.push(
            <div key={i} className={s.tableLeft}>
              <div className={s.title}>{cf.title} :</div>
              <div className={s.typeInputs} id={`${cf.id}Selector`}>
                <input
                  type="text"
                  readOnly="readOnly"
                  onClick={() => this.handleInputClick(cf.id)}
                  value={config[cf.id] ? config[cf.id].toString() : ''}
                />
                {showK8sVersionToggler && cf.id === 'k8s_version' && (
                  <div className={s.menuListBox}>
                    {arrayTypeOptions(versionarray, cf.id)}
                  </div>
                )}
                {showClusterSizeToggler && cf.id === 'cluster_size' && (
                  <div className={s.menuListBox}>
                    {arrayTypeOptions(clustersizingarray, cf.id)}
                  </div>
                )}
                {showVCpuToggler && cf.id === 'vcpu_per_node' && (
                  <div className={s.menuListBox}>
                    {arrayTypeOptions(vCpuArray, cf.id)}
                  </div>
                )}
                {showDiskToggler && cf.id === 'disk_per_node' && (
                  <div className={s.menuListBox}>
                    {arrayTypeOptions(diskArray, cf.id)}
                  </div>
                )}
                {showMemoryToggler && cf.id === 'memory_per_node' && (
                  <div className={s.menuListBox}>
                    {arrayTypeOptions(memoryArray, cf.id)}
                  </div>
                )}
              </div>
            </div>,
          );
        } else {
          tableArray.push(
            <div key={i} className={s.tableLeft}>
              <div className={s.title}>{cf.title} :</div>
              <div className={s.typeInputs} id={`${cf.id}Selector`}>
                <input
                  type="text"
                  placeholder={cf.default_value}
                  onChange={(e) => this.handleConfigChange(e, cf.id)}
                  value={config[cf.id] ? config[cf.id].toString() : ''}
                />
              </div>
            </div>,
          );
        }
      });

      return [...tableArray];
    };

    return (
      <Modal
        open={open}
        closeHandler={addTeamDialogClose}
        minHeight={'150px'}
        padding={'10px'}
        theme={theme}
      >
        <div className={addTeamFormStyles}>
          <div className={s.eachInputRow}>
            <div className={s.title}>Name* :</div>
            <div className={s.typeInputs}>
              <input
                type="text"
                autoFocus={true}
                onChange={(e) => this.handleInputTextChange(e, 'name')}
                placeholder="Team name"
                value={this.state.name}
              />
              <div className={s.userIdErrorMsg}>
                {errorMessage ? `* ${errorMessage}` : ''}
              </div>
            </div>
          </div>
          <div className={s.eachInputRow}>
            <div className={s.title}>Description :</div>
            <div className={s.typeInputs}>
              <textarea
                placeholder="Team Description"
                onChange={(e) => this.handleInputTextChange(e, 'description')}
                value={this.state.description}
              />
            </div>
          </div>
          <div className={s.eachInputRow}>
            <div className={s.title}>First Members :</div>
            <div className={s.typeInputs} id={'firstMemberDropdown'}>
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
                  <div className={s.listBox}>
                    {firstMemberSearchOptions(firstMemberSearchList.data)}
                  </div>
                )}
            </div>
          </div>

          <div className={s.eachInputRow}>
            <div className={s.title}>OPA :</div>
            <div className={s.typeInputs}>
              <textarea
                placeholder="Open Policy Agent"
                onChange={(e) => this.handleConfigChange(e, 'opa_policy')}
                value={config.opa_policy}
              />
              {/* <div
                className={s.openFileIcon}
                onClick={() => {
                  this.openFileRef.current.click();
                }}
              >
                <img src={FolderIcon} alt="" />
                <input
                  hidden
                  type="file"
                  id="file"
                  ref={this.openFileRef}
                  accept="text/*,application/JSON"
                  onChange={this.onChangeFile.bind(this)}
                />
              </div> */}
            </div>
          </div>

          <div className={s.eachInputRow}>
            <div className={s.title}>Visibility :</div>
            <div className={s.typeInputs}>
              <RadioButton
                theme={theme}
                name="visibility"
                title="All Users"
                styles={{marginRight: '0'}}
                checked={visibility === 'public'}
                onChangeFunction={() => {
                  this.handleVisibilityChange('public');
                }}
              />
              <RadioButton
                theme={theme}
                name="visibility"
                title="Team Members"
                styles={{marginRight: '0'}}
                checked={visibility === 'private'}
                onChangeFunction={() => {
                  this.handleVisibilityChange('private');
                }}
              />
            </div>
          </div>
          <div className={s.heading}>
            Recommended Cluster Configuration for Team Members
          </div>
          <div className={s.tableInput} id="configTableAddTeam">
            {configTable()}
          </div>
          <div className={s.eachInputRow}>
            <div className={s.title}></div>
            <div className={s.typeInputs}>
              <div className={s.userIdErrorMsg400}>
                {errorMessageOrg ? `* ${errorMessageOrg}` : ''}
              </div>
            </div>
          </div>
          <div className={s.divider} />
          <div className={s.footer}>
            <div className={s.leftButtons}></div>
            <div className={s.actionButtons}>
              <div className={s.cancel} onClick={() => addTeamDialogClose()}>
                Cancel
              </div>
              <CollaborateButton
                styles={{margin: '9px 0 0 15px', padding: '2px 30px'}}
                clickHandler={() => this.triggerConnectRequest()}
              >
                Create
              </CollaborateButton>
            </div>
          </div>
        </div>
      </Modal>
    );
  }
}
export default connect((state) => state, {
  getMyJoinedTeams,
})(AddTeam);
