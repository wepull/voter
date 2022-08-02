import React, {Component} from 'react';
import {connect} from 'react-redux';
import _ from 'lodash';
import cx from 'classnames';
import * as s from './shareImage.module.scss';
import {collaborateShareImage} from '../../../../utils/tableViewConfigs';
import Table from '../../../Table';
import Loader from '../../../Loader';
import {
  setSelectedImagesToSend,
  setYamlFilePath,
} from '../../../../actions/collaborateShare';

class ShareImage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      images: [],
    };

    this.handleInputChange = this.handleInputChange.bind(this);
  }

  async componentDidMount() {
    const {setSelectedImagesToSend, setYamlFilePath} = this.props;

    await setSelectedImagesToSend([]);
    await setYamlFilePath('');
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

    await setSelectedImagesToSend(imageArray);
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    const {selectedImagesToSend} = nextProps.collaborateShare;
    return {images: selectedImagesToSend};
  }

  getImages = () => {
    const {
      appPreferences: {theme},
    } = this.props;

    const tableImagesData = [];
    const imagesData =
      _.get(this.props, 'collaborateShare.shareImages.imagelist', []) || [];

    if (imagesData) {
      imagesData.forEach((data) => {
        if (_.get(data, 'Image') !== '<none>:<none>') {
          tableImagesData.push({
            image: data.Image,
            imageSize: Math.round(data.Size / (1024 * 1024)) || 'NA',
            datecreated: data.Created
              ? {
                  date: data.Created * 1000,
                  format: 'time-from-now',
                }
              : {},
            theme,
            isPresent: true,
            isChecked: this.state.images.indexOf(data.Image) > -1,
            handleChange: (e) => {
              this.handleInputChange(e, data.Id);
            },
            isCollabData: true,
          });
        }
      });
    }

    return tableImagesData;
  };

  render() {
    const {
      appPreferences: {theme},
      system: {
        loader: {fetchingImages},
      },
    } = this.props;

    const imageContainer = cx(s.imageContainer, {
      [s.imageContainerLight]: theme === 'Light',
    });

    const parentContainer = cx(s.parentContainer, {
      [s.parentContainerLight]: theme === 'Light',
    });

    return (
      <div className={parentContainer}>
        {fetchingImages && (
          <Loader loaderText={'Please wait while we fetch Images'} />
        )}
        {!fetchingImages && (
          <div className={imageContainer}>
            <Table
              collabShareWorkload
              head={collaborateShareImage}
              data={this.getImages()}
              recordsPerPage={6}
              theme={theme}
            />
          </div>
        )}
      </div>
    );
  }
}

const mapActionToProps = {
  setSelectedImagesToSend,
  setYamlFilePath,
};

export default connect((state) => state, mapActionToProps)(ShareImage);
