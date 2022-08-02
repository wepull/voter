import React, {Component} from 'react';
import cx from 'classnames';
import {connect} from 'react-redux';
import * as _ from 'lodash';
import axios from 'axios';
import https from 'https';
import path from 'path';
import * as s1 from './shareYaml.module.scss';
// import * as s2 from './shareYamlLite.module.scss';
import Modal from '../../../Modal';
import Table from '../../../Table';
import tableViewConfig from '../../../../utils/tableViewConfigs';
import {tdCollabCertify} from '../../../../utils/tableViewConfigs';
import RadioButton from '../../../RadioButton';
import {
  setSelectedNamespace,
  setSelectedImagesToSend,
  setYamlFilePath,
  setPushFileInfo,
  setProjectFilePath,
  getCertifiedData,
} from '../../../../actions/collaborateShare';
import {setAppTheme} from '../../../../actions/appPreference';
import {
  receiveDataFromElectronMainThread,
  sendDataToElectronBrowserWindow,
} from '../../../../utils/electronBridges';
import {verifyWorkload} from '../../../../utils/apiConfig';
import addProjectIcon from '../../../../assets/svgs/Add_Project_selected.svg';

import Loader from '../../../Loader';
import Tooltip from '../../../Tooltip/tooltip';

import CertifiedIcon from '../../../../assets//svgs/icon-info.svg';

const agent = new https.Agent({
  rejectUnauthorized: false,
});

class ShareYaml extends Component {
  constructor(props) {
    super(props);
    this.state = {
      yamlFile: '',
      yamlPath: '',
      setNamespaceSearch: 'default',
      images: [],
      imagesArrayFromYAML: [],
      projectPath: '',
      selectedImages: {},
      parentDirectory: '',
      isImageListInRegistryChanged: false,
      isHidden: false,
      showModal: false,
      certifiedData: [],
    };

    this.onChange = this.onChange.bind(this);
    this.onChangeProject = this.onChangeProject.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.onSearch = this.onSearch.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.openDialogBox = this.openDialogBox.bind(this);
  }

  openDialogBox() {
    const {setPushFileInfo} = this.props;
    const projectDir = window.ipcRenderer.sendSync('openDialogBox');

    if (projectDir !== undefined) {
      const projectName = path.basename(projectDir);

      this.setState({
        projectPath: projectDir,
        parentDirectory: projectName,
      });

      sendDataToElectronBrowserWindow('getYamlfromThisProject', [projectDir]);
      window.ipcRenderer.on('getYamlfromThisProject', (e, fileInfo) => {
        setPushFileInfo(fileInfo);
        this.onChange(fileInfo[0].filePath, fileInfo[0].fileName);
      });
    }
  }

  async handleInputChange(event, id) {
    const {target} = event;
    const {value} = target;
    let imageArray = this.state.images;
    const {setSelectedImagesToSend} = this.props;

    if (target.checked) {
      imageArray.push(value);
    } else {
      imageArray = imageArray.filter((d) => d !== value);
    }
    this.setState({
      images: imageArray,
    });

    this.setState({
      selectedImages: {
        ...this.state.selectedImages,
        [id]: target.checked,
      },
    });
    await setSelectedImagesToSend(imageArray);
  }

  async componentDidMount() {
    console.log('props', this.props);
    const {setAppTheme} = this.props;

    this.setState({
      yamlPath: '',
    });

    sendDataToElectronBrowserWindow('setTheme', ['collaborateWindow']);
    window.ipcRenderer.on('setTheme', (e, msg) => {
      setAppTheme(msg);
    });
  }

  // Yaml yamlFile selection
  async onChange(yamlPath, yamlFile) {
    const {setYamlFilePath, setSelectedImagesToSend} = this.props;
    const {yamlFilePath} = this.props.data;
    const {
      cluster: {
        keys: {localApiAccessKey},
      },
      rcr: {dockerHostSelectedCluster},
    } = this.props.data;

    if (yamlFilePath !== yamlPath) {
      this.setState({
        yamlPath,
        yamlFile,
      });

      setYamlFilePath(yamlPath);
      // clean cache images when yaml is changed
      setSelectedImagesToSend([]);
      const tempArray = [`collaborateWindow`, yamlPath];

      sendDataToElectronBrowserWindow('sendImageList', [tempArray]);
      const tempImagesArrayFromYAML = await receiveDataFromElectronMainThread(
        'imagesListSend',
      );

      let verifiedImageFromYaml = {};
      console.log(verifiedImageFromYaml);
      try {
        verifiedImageFromYaml = await axios.post(
          verifyWorkload,
          {
            httpsAgent: agent,
            ImageList: tempImagesArrayFromYAML,
            clusterAlias: dockerHostSelectedCluster,
          },
          {
            headers: {
              ZBIO_CLUSTER_KEY: `${localApiAccessKey}`,
            },
          },
        );
        if (_.isEmpty(verifiedImageFromYaml.data)) {
          let ImageList = [];
          tempImagesArrayFromYAML.forEach((image) => {
            ImageList.push({
              Created: 0,
              Id: '',
              Image: image,
              Size: 0,
              IsPresent: false,
            });
          });
          verifiedImageFromYaml.data = {};
          verifiedImageFromYaml.data.ImageList = ImageList;
        }
      } catch (e) {
        console.log('Catch image');
        let ImageList = [];
        tempImagesArrayFromYAML.forEach((image) => {
          ImageList.push({
            Created: 0,
            Id: '',
            Image: image,
            Size: 0,
            IsPresent: false,
          });
        });
        verifiedImageFromYaml.data = {};
        verifiedImageFromYaml.data.ImageList = ImageList;
      }
      console.log('verified Image', verifiedImageFromYaml);
      const selectedImages = {...this.state.selectedImages};
      const imageArray = [];

      if (verifiedImageFromYaml) {
        const verifiedImagesList =
          _.get(verifiedImageFromYaml, 'data.ImageList', []) || [];

        verifiedImagesList.forEach((image) => {
          if (!imageArray.includes(image.Image) && image.IsPresent) {
            imageArray.push(image.Image);
          }
          return (selectedImages[image.Id] = true);
        });
      }
      await setSelectedImagesToSend(imageArray);

      this.setState({
        imagesArrayFromYAML: verifiedImageFromYaml,
        selectedImages,
        images: imageArray,
        isImageListInRegistryChanged: false,
      });
    }
  }

  static onChangeProjectOnce(projectFile) {
    // clean cache images and yaml path
    setSelectedImagesToSend([]);
    setYamlFilePath('');

    sendDataToElectronBrowserWindow('getYamlfromThisProject', [projectFile]);
  }

  async onChangeProject(projectFile) {
    const {
      setYamlFilePath,
      setSelectedImagesToSend,
      setProjectFilePath,
    } = this.props;

    // clean cache images and yaml path
    setSelectedImagesToSend([]);
    setYamlFilePath('');
    await setProjectFilePath(projectFile);
    await sendDataToElectronBrowserWindow('getYamlfromThisProject', [
      projectFile,
    ]);
    this.setState({
      isImageListInRegistryChanged: false,
      projectPath: projectFile,
    });
  }

  onSearch(e) {
    const {value} = e.currentTarget;
    let {setNamespaceSearch} = this.state;

    if (value !== '') {
      setNamespaceSearch = value;
      this.setState({setNamespaceSearch});
    } else {
      setNamespaceSearch = value;
      this.setState({setNamespaceSearch});
    }
    this.sendNamespace(value);
  }

  async sendNamespace(ns) {
    const {setSelectedNamespace} = this.props;

    await setSelectedNamespace(ns);
    let {setNamespaceSearch} = this.state;
    setNamespaceSearch = ns;

    this.setState({setNamespaceSearch});
  }

  onKeyDown(e) {
    if (e.key === 'Enter' || e.keyCode === 13) {
      const {setNamespaceSearch} = this.state;
      this.sendNamespace(setNamespaceSearch);
    }
  }

  async componentDidUpdate(nextProps, prevState) {
    const {isImageListInRegistryChanged = false, yamlPath = ''} = prevState;
    const {
      setYamlFilePath,
      setSelectedImagesToSend,
      // setProjectFilePath,
    } = nextProps;
    const oldYamlFileObject = _.get(
      nextProps,
      'data.collaborateShare.myPushFileInfo',
    );
    // assigning value of YAML path for initial time
    if (oldYamlFileObject && oldYamlFileObject.length > 0 && yamlPath === '') {
      await this.onChange(
        _.get(oldYamlFileObject[0], 'filePath'),
        _.get(oldYamlFileObject[0], 'fileName'),
      );

      setYamlFilePath(_.get(oldYamlFileObject[0], 'filePath'));
      return {
        yamlPath: _.get(oldYamlFileObject[0], 'filePath'),
        yamlFile: _.get(oldYamlFileObject[0], 'fileName'),
      };
    }

    const newYamlfile =
      _.get(nextProps, 'data.collaborateShare.yamlFilePath', '') || '';

    const oldYamlfile = _.get(prevState, 'yamlPath', '') || '';

    if (!isImageListInRegistryChanged) {
      const {
        cluster: {
          keys: {localApiAccessKey},
        },
        rcr: {dockerHostSelectedCluster},
      } = this.props.data;

      let verifiedImageFromYaml = null;
      let tempImagesArrayFromYAML = null;
      let tempArray = [];

      if (
        yamlPath !== '' ||
        (newYamlfile !== '/yaml.yaml' && newYamlfile !== oldYamlfile)
      ) {
        tempArray = [`collaborateWindow`, yamlPath];
        sendDataToElectronBrowserWindow('sendImageList', [tempArray]);
        tempImagesArrayFromYAML = await receiveDataFromElectronMainThread(
          'imagesListSend',
        );
      }
      console.log('coming here ');
      try {
        if (tempImagesArrayFromYAML !== null) {
          verifiedImageFromYaml = await axios.post(
            verifyWorkload,
            {
              httpsAgent: agent,
              ImageList: tempImagesArrayFromYAML,
              clusterAlias: dockerHostSelectedCluster,
            },
            {
              headers: {
                ZBIO_CLUSTER_KEY: `${localApiAccessKey}`,
              },
            },
          );
          if (_.isEmpty(verifiedImageFromYaml.data)) {
            let ImageList = [];
            tempImagesArrayFromYAML.forEach((image) => {
              ImageList.push({
                Created: 0,
                Id: '',
                Image: image,
                Size: 0,
                IsPresent: false,
              });
            });
            verifiedImageFromYaml.data = {};
            verifiedImageFromYaml.data.ImageList = ImageList;
          }
          console.log('Hey', verifiedImageFromYaml);
        }
      } catch (e) {
        console.log('Catch image');
        let ImageList = [];
        tempImagesArrayFromYAML.forEach((image) => {
          ImageList.push({
            Created: 0,
            Id: '',
            Image: image,
            Size: 0,
            IsPresent: false,
          });
        });
        verifiedImageFromYaml.data = {};
        verifiedImageFromYaml.data.ImageList = ImageList;
      }

      const imageArray = this.state.images;

      if (verifiedImageFromYaml) {
        const selectedImages = {};
        const verifiedImagesList =
          _.get(verifiedImageFromYaml, 'data.ImageList', []) || [];

        verifiedImagesList.forEach((image) => {
          if (!imageArray.includes(image.Image) && image.IsPresent) {
            imageArray.push(image.Image);
          }
          return (selectedImages[image.Id] = true);
        });

        setYamlFilePath(yamlPath);
        await setSelectedImagesToSend(imageArray);

        this.setState({
          imagesArrayFromYAML: verifiedImageFromYaml,
          selectedImages,
          images: imageArray,
          yamlPath,
          isImageListInRegistryChanged: true,
        });
      }
    }
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    const {
      collaborateShare: {
        myPushFileInfo = [],
        openProjectList = [],
        selectedProjectFilePath = '',
      },
    } = nextProps.data;

    const {setProjectFilePath, setPushFileInfo, setYamlFilePath} = nextProps;
    const {projectPath = '', yamlPath = ''} = prevState;

    if (
      openProjectList &&
      openProjectList.length > 0 &&
      projectPath !== selectedProjectFilePath
    ) {
      console.log('selected projectFile', selectedProjectFilePath);
      const newProjectPath =
        selectedProjectFilePath !== '/file'
          ? selectedProjectFilePath
          : openProjectList[0].projectPath;

      ShareYaml.onChangeProjectOnce(newProjectPath);

      setProjectFilePath(newProjectPath);

      return {
        projectPath: newProjectPath,
      };
    }
    // assigning value of YAML path for initial time
    if (myPushFileInfo && myPushFileInfo.length > 0 && yamlPath === '') {
      const projectName = path.basename(myPushFileInfo[0].project);

      setPushFileInfo(myPushFileInfo);
      setYamlFilePath(myPushFileInfo[0].filePath);
      return {
        yamlPath: myPushFileInfo[0].filePath,
        yamlFile: myPushFileInfo[0].fileName,

        // added extra for roost lite
        parentDirectory: projectName,
        projectPath: myPushFileInfo[0].project,
      };
    }

    return null;
  }

  async showModal(yamlPath) {
    const {getCertifiedData} = this.props;
    this.setState({
      showModal: !this.state.showModal,
    });
    const certifiedData = await getCertifiedData(yamlPath, 'yaml');
    this.setState({
      certifiedData: certifiedData,
    });
  }

  render() {
    const {
      collaborateShare: {
        myPushFileInfo = [],
        openProjectList = [],
        certifiedData = [],
      },
      system: {
        loader: {fetchingCertifiedData},
      },
      appPreferences: {appName},
    } = this.props.data;

    // const s = appName === 'Roost' ? s1 : s2;
    const s = s1;
    const {
      appPreferences: {theme},
    } = this.props.data;

    const yamlArray = myPushFileInfo;
    const projectArray = openProjectList;

    const textHeadingNamespace = cx(s.textHeading, {
      [s.textHeadingLight]: theme === 'Light',
    });

    const textHeadingPath = cx(s.textHeading, {
      [s.textHeadingPath]: true,
      [s.textHeadingLight]: theme === 'Light',
    });

    const textHeadingImages = cx(s.textHeading, {
      [s.textHeadingImages]: true,
      [s.textHeadingLight]: theme === 'Light',
    });

    const infoIcon = cx(s.infoIcon, {
      [s.infoIconLight]: theme === 'Light',
    });

    const modalHeading = cx(s.modalHeading, {
      [s.modalHeadingLight]: theme === 'Light',
    });
    const modal = cx(s.modal, {
      [s.modalLight]: theme === 'Light',
    });

    let certifyDetails = certifiedData;
    let detailsList = [];
    if (certifyDetails) {
      certifyDetails.forEach((data) => {
        detailsList.push({
          roosterInfo: {
            name: data.full_name,
            roost_handle: data.username,
            image_url: data.avatar_url,
          },
          date: {
            date: data.certified_on,
            format: 'time-stamp',
          },
          message: data.certify_message,
        });
      });
    }

    const projectArrayList = projectArray.map((data, i) => {
      return (
        <div key={i} className={s.projectIndividual}>
          <RadioButton
            theme={theme}
            name="projectList"
            key={data.projectPath}
            title={data.projectName}
            checked={this.state.projectPath === data.projectPath}
            onChangeFunction={() => {
              this.onChangeProject(data.projectPath);
            }}
          />
        </div>
      );
    });

    const yamlArrayList = yamlArray.map((data, i) => {
      return (
        <div key={i} className={s.yamlIndividual}>
          <RadioButton
            theme={theme}
            name="yamlList"
            key={data.filePath}
            title={data.fileName}
            checked={this.state.yamlPath === data.filePath}
            onChangeFunction={() => {
              this.onChange(data.filePath, data.fileName);
            }}
          />
        </div>
      );
    });

    const yamlContainer = cx(s.yamlContainer, {
      [s.yamlContainerLight]: theme === 'Light',
    });

    const yamlData = cx(s.yamlData, {
      [s.yamlDataLight]: theme === 'Light',
    });

    const yamlName = cx(s.yamlName, {
      [s.yamlNameLight]: theme === 'Light',
    });

    const inputText = cx(s.inputText, {
      [s.inputTextLight]: theme === 'Light',
    });

    const namespaceInput = cx(s.namespaceInput, {
      [s.namespaceInputLight]: theme === 'Light',
    });

    const namespace = cx(s.namespace, {
      [s.namespaceLight]: theme === 'Light',
    });

    const yamlnamespace = cx(s.yamlnamespace, {
      [s.yamlnamespaceLight]: theme === 'Light',
    });

    const yamlPath = cx(s.yamlPath, {
      [s.yamlPathLight]: theme === 'Light',
    });

    const leftSideBlock = cx(s.leftSideBlock, {
      [s.leftSideBlockLight]: theme === 'Light',
    });

    const projectHeading = cx(s.projectHeading, {
      [s.projectHeadingLight]: theme === 'Light',
    });

    const yamlHeading = cx(s.yamlHeading, {
      [s.yamlHeadingLight]: theme === 'Light',
    });

    const noProjectFound = cx(s.noProjectFound, {
      [s.noProjectFoundLight]: theme === 'Light',
    });

    const noYamlFound = cx(s.noYamlFound, {
      [s.noYamlFoundLight]: theme === 'Light',
    });

    const parentDirectory = cx(s.parentDirectory, {
      [s.parentDirectoryLight]: theme === 'Light',
    });

    const selectProjectButton = cx(s.selectProjectButton, {
      [s.selectProjectButtonLight]: theme === 'Light',
    });

    let tempDataArray = {...this.state.imagesArrayFromYAML};
    const selectedImages = {...this.state.selectedImages};

    tempDataArray = _.get(tempDataArray, 'data.ImageList', []) || [];

    const dataArray = [];
    tempDataArray.forEach((d) => {
      const imageArr = {
        image: d.Image,
        present: d.IsPresent ? 'Yes' : 'No',
        size: Math.round(d.Size / (1024 * 1024)) || 'NA',
        date: d.IsPresent
          ? {
              date: d.Created * 1000,
              format: 'time-from-now',
            }
          : 'NA',
        isPresent: d.IsPresent,
        theme,
        isChecked: selectedImages[d.Id],
        handleChange: (e) => {
          this.handleInputChange(e, d.Id);
        },
        isCollabData: true,
      };
      dataArray.push(imageArr);
    });

    const namespaceSearch = this.state.setNamespaceSearch;

    return (
      <>
        <div className={yamlContainer}>
          <div className={leftSideBlock}>
            {appName === 'Roost-Lite-Desktop' ? (
              <>
                <div className={projectHeading}> Directory </div>
                <div className={s.projectList}>
                  <div
                    className={selectProjectButton}
                    onClick={this.openDialogBox}
                  >
                    <img alt="" src={addProjectIcon} />
                  </div>

                  {this.state.parentDirectory !== '' ? (
                    <div className={parentDirectory}>
                      {this.state.parentDirectory}
                    </div>
                  ) : (
                    <div className={noProjectFound}> No Project found</div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className={projectHeading}> Projects </div>
                <div className={s.projectList}>
                  {projectArrayList.length > 0 ? (
                    projectArrayList
                  ) : (
                    <div className={noProjectFound}> No Project found</div>
                  )}
                </div>
              </>
            )}

            <div className={yamlHeading}>YAMLs</div>
            <div className={s.yamlList}>
              {yamlArrayList.length > 0 ? (
                yamlArrayList
              ) : (
                <div className={noYamlFound}>No YAML found</div>
              )}
            </div>
          </div>
          <div className={yamlData}>
            <div className={yamlName}>
              {this.state.yamlFile || 'No YAML'}{' '}
              <div
                className={infoIcon}
                onClick={() => {
                  this.showModal(this.state.yamlPath);
                }}
              >
                <Tooltip content={'Certification Details'} direction="right">
                  <img src={CertifiedIcon} alt="More Details" />
                </Tooltip>
              </div>
              <div className={modal}>
                {this.state.showModal ? (
                  <Modal
                    open={this.state.showModal}
                    closeHandler={() => {
                      this.setState({
                        showModal: false,
                      });
                    }}
                    minHeight={'200px'}
                    minWidth={'500px'}
                    padding={'10px'}
                    theme={theme}
                  >
                    <div className={modalHeading}>Certification Details</div>
                    {fetchingCertifiedData ? (
                      <Loader loaderText={''} />
                    ) : (
                      <Table
                        head={tdCollabCertify}
                        data={detailsList}
                        recordsPerPage={4}
                        theme={theme}
                        initOnDataChange={true}
                      />
                    )}
                  </Modal>
                ) : null}
              </div>
            </div>

            <div className={yamlnamespace}>
              <p className={textHeadingNamespace}>Target Namespace </p>
              <div className={namespace}>
                <div className={namespaceInput}>
                  <input
                    type="text"
                    className={inputText}
                    value={namespaceSearch}
                    onChange={(e) => this.onSearch(e)}
                    onKeyDown={(e) => this.onKeyDown(e)}
                  />
                </div>
              </div>
            </div>

            <p className={textHeadingPath}>Path:</p>
            <div className={yamlPath}>{this.state.yamlPath}</div>

            <div className={s.ImageTable}>
              <p className={textHeadingImages}>Images to be Shared:</p>
              <div className={s.yamlImageList}>
                <Table
                  key={dataArray}
                  collabShareWorkload
                  head={tableViewConfig.collabShareYaml}
                  data={dataArray}
                  recordsPerPage={3}
                  theme={theme}
                />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    data: state,
  };
};

const mapActionToProps = {
  setSelectedNamespace,
  setSelectedImagesToSend,
  setYamlFilePath,
  setAppTheme,
  setProjectFilePath,
  setPushFileInfo,
  getCertifiedData,
};

export default connect(mapStateToProps, mapActionToProps)(ShareYaml);
