import React, {Component} from 'react';
import cx from 'classnames';
import {connect} from 'react-redux';
import * as _ from 'lodash';
import axios from 'axios';
import https from 'https';
import path from 'path';
import YAML from 'js-yaml';
import * as s1 from './shareHelmChart.module.scss';
// import * as s2 from './shareHelmChartLite.module.scss';
import Modal from '../../../Modal';
import Table from '../../../Table';
import Loader from '../../../Loader';
import Tooltip from '../../../Tooltip/tooltip';
import tableViewConfig from '../../../../utils/tableViewConfigs';
import {tdCollabCertify} from '../../../../utils/tableViewConfigs';
import RadioButton from '../../../RadioButton';
import {
  setSelectedNamespace,
  setSelectedImagesToSend,
  setYamlFilePath,
  setPushFileInfo,
  setProjectFilePath,
  setHelmChartArray,
  setReleaseName,
  setHelmChartPath,
  getCertifiedData,
} from '../../../../actions/collaborateShare';
import {setAppTheme} from '../../../../actions/appPreference';
import {
  receiveDataFromElectronMainThread,
  sendDataToElectronBrowserWindow,
} from '../../../../utils/electronBridges';
import {verifyWorkload} from '../../../../utils/apiConfig';
import addProjectIcon from '../../../../assets/svgs/Add_Project_selected.svg';
import {setLoader} from '../../../../actions/cluster';
import CertifiedIcon from '../../../../assets//svgs/icon-info.svg';

const agent = new https.Agent({
  rejectUnauthorized: false,
});

class ShareHelmChart extends Component {
  constructor(props) {
    super(props);
    this.state = {
      helmFile: '',
      helmPath: '',
      setNamespaceSearch: 'default',
      images: [],
      imagesArrayFromYAML: [],
      projectPath: '',
      selectedImages: {},
      parentDirectory: '',
      isImageListInRegistryChanged: false,
      tempImagesArray: [],
      setReleaseName: '',
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
    this.helmCheckImagesYaml = this.helmCheckImagesYaml.bind(this);
    this.returnValidImageName = this.returnValidImageName.bind(this);
    this.setReleaseName = this.setReleaseName.bind(this);
    this.getReleaseName = this.getReleaseName.bind(this);
  }

  setReleaseName(e) {
    const {value} = e.currentTarget;
    const {setReleaseName} = this.props;
    setReleaseName(value);
    this.setState({
      setReleaseName: value,
    });
  }

  openDialogBox() {
    const projectDir = window.ipcRenderer.sendSync('openDialogBox');

    if (projectDir !== undefined) {
      const projectName = path.basename(projectDir);

      this.setState({
        projectPath: projectDir,
        parentDirectory: projectName,
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
    const {setAppTheme} = this.props;

    this.setState({
      helmPath: '',
    });

    sendDataToElectronBrowserWindow('setTheme', ['collaborateWindow']);
    window.ipcRenderer.on('setTheme', (e, msg) => {
      setAppTheme(msg);
    });
  }

  returnValidImageName(img) {
    try {
      const regex = /.+(:s*)$/;
      return regex.test(img) ? img.slice(0, -1) : img;
    } catch (e) {
      console.log('regEx dockerCompose : ' + e);
      return '';
    }
  }

  helmCheckImagesYaml(obj) {
    try {
      let images = [];
      if (obj.kind === 'CronJob') {
        obj.spec.jobTemplate.spec.template.spec.containers.forEach((img) => {
          images.push(this.returnValidImageName(img.image));
        });
      } else if (
        obj.kind === 'DaemonSet' ||
        obj.kind === 'Deployment' ||
        obj.kind === 'Job' ||
        obj.kind === 'ReplicationController' ||
        obj.kind === 'ReplicaSet' ||
        obj.kind === 'StatefulSet'
      ) {
        obj.spec.template.spec.containers.forEach((img) => {
          images.push(this.returnValidImageName(img.image));
        });
      } else if (obj.kind === 'Pod') {
        obj.spec.containers.forEach((img) => {
          images.push(this.returnValidImageName(img.image));
        });
      }
      return images;
    } catch (e) {
      console.log('Error:', e);
      return [];
    }
  }
  getReleaseName(fileName) {
    const {setReleaseName} = this.props;

    const epoch = Math.round(new Date().getTime() / 1000);
    const search = /_/g;
    let releaseName = fileName.replace(search, '-') + '-' + epoch;
    setReleaseName(releaseName);
    this.setState({
      setReleaseName: releaseName.toString(),
    });
  }

  // Yaml yamlFile selection
  async onChange(helmPath, helmFile) {
    const {setSelectedImagesToSend, setHelmChartPath, setLoader} = this.props;
    const {helmChartPath} = this.props.data;
    const {
      cluster: {
        keys: {localApiAccessKey},
      },
      rcr: {dockerHostSelectedCluster},
    } = this.props.data;

    if (helmChartPath !== helmPath) {
      this.setState({
        helmPath,
        helmFile,
      });

      // clean cache images when yaml is changed
      this.getReleaseName(helmFile);
      setSelectedImagesToSend([]);
      setHelmChartPath(helmPath);
      setLoader('fetchingHelmImages', true);
      await sendDataToElectronBrowserWindow('sendHelmFolderFiles', [helmPath]);
      const tempYamlFile = await receiveDataFromElectronMainThread(
        'sendHelmFolderFiles',
      );
      setLoader('fetchingHelmImages', false);
      let svcDependecyList = [];

      await YAML.loadAll(
        tempYamlFile,
        (yaml) => {
          svcDependecyList = [
            ...svcDependecyList,
            ...this.helmCheckImagesYaml(yaml),
          ];
        },
        {json: true},
      );

      let tempImagesArrayFromHelm = [];
      tempImagesArrayFromHelm = svcDependecyList;

      let verifiedImageFromYaml = {};
      try {
        verifiedImageFromYaml = await axios.post(
          verifyWorkload,
          {
            httpsAgent: agent,
            ImageList: tempImagesArrayFromHelm,
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
          tempImagesArrayFromHelm.forEach((image) => {
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
        tempImagesArrayFromHelm.forEach((image) => {
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

    sendDataToElectronBrowserWindow('getHelmChartsFromProject', [projectFile]);
    sendDataToElectronBrowserWindow('sendHelmFolderFiles', [projectFile]);
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
    await sendDataToElectronBrowserWindow('getHelmChartsFromProject', [
      projectFile,
    ]);
    sendDataToElectronBrowserWindow('sendHelmFolderFiles', [projectFile]);
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

  async componentDidUpdate(prevProps, prevState) {
    const {helmPath} = prevState;
    const selectedFilePath = _.get(
      this.props,
      'data.collaborateShare.myPushFileInfo[0].filePath',
    );
    const selectedFileName = _.get(
      this.props,
      'data.collaborateShare.myPushFileInfo[0].fileName',
    );
    if (selectedFilePath && helmPath === '') {
      await this.onChange(selectedFilePath, selectedFileName);
    }
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    const {
      collaborateShare: {openProjectList = [], selectedProjectFilePath = ''},
    } = nextProps.data;

    const {setProjectFilePath} = nextProps;
    const {projectPath = ''} = prevState;

    if (
      openProjectList &&
      openProjectList.length > 0 &&
      projectPath !== selectedProjectFilePath
    ) {
      const newProjectPath =
        selectedProjectFilePath !== '/file'
          ? selectedProjectFilePath
          : openProjectList[0].projectPath;
      ShareHelmChart.onChangeProjectOnce(newProjectPath);
      sendDataToElectronBrowserWindow('sendHelmFolderFiles', newProjectPath);

      setProjectFilePath(newProjectPath);

      return {
        projectPath: newProjectPath,
      };
    }

    return null;
  }

  async showModal(helmPath) {
    const {getCertifiedData} = this.props;
    this.setState({
      showModal: !this.state.showModal,
    });
    const certifiedData = await getCertifiedData(helmPath, 'helm');
    this.setState({
      certifiedData: certifiedData,
    });
  }

  render() {
    const {
      collaborateShare: {
        openProjectList = [],
        helmChartArray = [],
        certifiedData = [],
      },
      appPreferences: {appName},
      system: {
        loader: {fetchingCertifiedData},
      },
    } = this.props.data;

    // const s = appName === 'Roost' ? s1 : s2;
    const s = s1;
    const {
      appPreferences: {theme},
    } = this.props.data;
    const helmArray = helmChartArray;
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

    const helmArrayList = helmArray.map((data, i) => {
      return (
        <div key={i} className={s.yamlIndividual}>
          <RadioButton
            theme={theme}
            name="yamlList"
            key={data.filePath}
            title={data.fileName}
            checked={this.state.helmPath === data.filePath}
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

            <div className={yamlHeading}>HelmCharts</div>
            <div className={s.yamlList}>
              {helmArrayList.length > 0 ? (
                helmArrayList
              ) : (
                <div className={noYamlFound}>No Helm Chart found</div>
              )}
            </div>
          </div>
          <div className={yamlData}>
            <div className={yamlName}>
              {this.state.helmFile || 'No Helm Chart '}
              <div
                className={infoIcon}
                onClick={() => {
                  this.showModal(this.state.helmPath);
                }}
              >
                <Tooltip content={'Certification Details'} direction="right">
                  <img
                    src={CertifiedIcon}
                    // className={s.infoIcon}
                    alt="More Details"
                  />
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

            <div className={yamlnamespace}>
              <p className={textHeadingNamespace}>Release Name </p>
              <div className={namespace}>
                <div className={namespaceInput}>
                  <input
                    type="text"
                    className={inputText}
                    value={this.state.setReleaseName}
                    onChange={(e) => {
                      this.setReleaseName(e);
                    }}
                  />
                </div>
              </div>
            </div>

            <p className={textHeadingPath}>Path:</p>
            <div className={yamlPath}>{this.state.helmPath}</div>

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
  setHelmChartArray,
  setReleaseName,
  setHelmChartPath,
  setLoader,
  getCertifiedData,
};

export default connect(mapStateToProps, mapActionToProps)(ShareHelmChart);
