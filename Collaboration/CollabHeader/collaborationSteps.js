import * as sMyRoostNetwork from '../MyRoostNetwork/myRoostNetwork.module.scss';
import * as sAddRooster from '../AddRooster/addRooster.module.scss';
import * as sIconList from '../../IconList/IconList.module.scss';
import * as sCollabOption from './collaborateOption/collabOption.module.scss';
import * as sOnGoingCollaboration from '../OnGoingCollab/onGoingcollab.module.scss';
import * as sMyTeam from '../MyTeam/myTeam.module.scss';
import * as sTable from '../../Table/table.module.scss';

import store from '../../../store';
import {FETCHED_SCREEN} from '../../../constants/collaborate';
const setScreenType = (screenView = 'network') => {
  store.dispatch({
    type: FETCHED_SCREEN,
    payload: screenView,
  });
};

// Write const for node Elements as "<stepID>+EL"
const noRoosterImageNetwork = `.${sMyRoostNetwork.norequestimage}`;
const addRoosterButtonNetwork = `.${sMyRoostNetwork.addrooster}`;
const addRoosterModalNetwork = `.${sAddRooster.addRoosterForm}`;
const tablecontainerNetwork = `.${sTable.tableContainer}`;
const tableContainerPushPullNetwork = `.${sIconList.container}`;
const tableContainerCollabIconNetwork = `.${sIconList.icons}`;
const createTeamButtonMyTeam = `.${sMyTeam.addrooster}`;

const headerMyNetworkEL = `.${sCollabOption.firstButton}`;
const headerRequestEL = `.${sCollabOption.middleButtonMyRequests}`;
const headerOngoingEL = `.${sCollabOption.middleButtonOngoingCollab}`;
const headerMyTeam = `.${sCollabOption.middleButtonMyTeam}`;
const headerAllTeam = `.${sCollabOption.lastButton}`;

const noRoosterImageCollaboration = `.${sOnGoingCollaboration.norequestimage}`;
const noRoosterImageMyTeam = `.${sMyTeam.norequestimage}`;
const tableContainerOnGoingCollaboration = `.${sOnGoingCollaboration.tableContainer}`;

export default [
  {
    id: 'collaborationWelcomePage',
    title: 'Welcome',
    text: 'You can collaborate with your colleagues and friends here',
    buttons: [
      {
        action() {
          return this.cancel();
        },
        classes: 'shepherd-button-secondary',
        text: 'Exit',
      },
      {
        action() {
          return this.next();
        },
        text: 'Next',
      },
    ],
  },
  {
    id: 'noRooster',
    title: 'Oops!',
    text:
      'You do not have any Rooster to collaborate with. Please continue to check how to add roosters.',
    attachTo: {element: noRoosterImageNetwork, on: 'right'},
    showOn() {
      return !!document.querySelector(noRoosterImageNetwork);
    },
    buttons: [
      {
        action() {
          return this.back();
        },
        classes: 'shepherd-button-secondary',
        text: 'Back',
      },
      {
        action() {
          return this.next();
        },
        text: 'Next',
      },
    ],
  },
  {
    id: 'AddRoosterButton',
    title: 'Add Rooster',
    text: 'Click on the button to add Rooster.',
    attachTo: {element: addRoosterButtonNetwork, on: 'bottom'},
    showOn() {
      return !!document.querySelector(noRoosterImageNetwork);
    },
    buttons: [
      {
        action() {
          return this.back();
        },
        classes: 'shepherd-button-secondary',
        text: 'Back',
      },
      {
        action() {
          return this.next();
        },
        text: 'Next',
      },
    ],
  },
  {
    id: 'addRoosterModal',
    title: 'Add Rooster',
    text:
      'You can collaborate with your colleagues and friends by adding them through Email ID or Username. You can continue tour now and add them later.',
    attachTo: {element: addRoosterModalNetwork, on: 'bottom'},
    showOn() {
      return !!document.querySelector(addRoosterModalNetwork);
    },
    buttons: [
      {
        action() {
          return this.back();
        },
        classes: 'shepherd-button-secondary',
        text: 'Back',
      },
      {
        action() {
          return this.next();
        },
        text: 'Next',
      },
    ],
  },
  {
    id: 'tableContainer',
    title: 'My Roost Network',
    text: 'You can see the Roosters with whom you can collaborate.',
    attachTo: {element: tablecontainerNetwork, on: 'bottom'},
    showOn() {
      return !!document.querySelector(tablecontainerNetwork);
    },
    buttons: [
      {
        action() {
          return this.back();
        },
        classes: 'shepherd-button-secondary',
        text: 'Back',
      },
      {
        action() {
          return this.next();
        },
        text: 'Next',
      },
    ],
  },
  {
    id: 'tableContainerPushPull',
    title: 'My Roost Network',
    text:
      'You can see the push permissions given to the Rooster in your network.',
    attachTo: {element: tableContainerPushPullNetwork, on: 'bottom'},
    showOn() {
      return !!document.querySelector(tableContainerPushPullNetwork);
    },
    buttons: [
      {
        action() {
          return this.back();
        },
        classes: 'shepherd-button-secondary',
        text: 'Back',
      },
      {
        action() {
          return this.next();
        },
        text: 'Next',
      },
    ],
  },
  {
    id: 'tableContainerCollabIcon',
    title: 'My Roost Network',
    text:
      'You can share files with the rooster and also, revoke the permissions from here.',
    attachTo: {element: tableContainerCollabIconNetwork, on: 'bottom'},
    showOn() {
      return !!document.querySelector(tableContainerCollabIconNetwork);
    },
    buttons: [
      {
        action() {
          return this.back();
        },
        classes: 'shepherd-button-secondary',
        text: 'Back',
      },
      {
        action() {
          return this.next();
        },
        text: 'Next',
      },
    ],
  },
  {
    id: 'headerMyNetwork',
    title: 'My Roost Network',
    text: 'You are currently viewing your Roost network',
    attachTo: {element: headerMyNetworkEL, on: 'bottom'},
    showOn() {
      setScreenType('network');
      return !!document.querySelector(headerMyNetworkEL);
    },
    buttons: [
      {
        action() {
          return this.back();
        },
        classes: 'shepherd-button-secondary',
        text: 'Back',
      },
      {
        action() {
          return this.next();
        },
        text: 'Next',
      },
    ],
  },
  {
    id: 'headerRequest',
    title: 'Requests',
    text:
      'Kindly click here to see the requests from roosters. <br>You can see the requests sent/recieved to/from the colleagues and friends.',
    attachTo: {element: headerRequestEL, on: 'bottom'},
    showOn() {
      setScreenType('request');
      return !!document.querySelector(headerRequestEL);
    },
    buttons: [
      {
        action() {
          return this.back();
        },
        classes: 'shepherd-button-secondary',
        text: 'Back',
      },
      {
        action() {
          return this.next();
        },
        text: 'Next',
      },
    ],
  },
  {
    id: 'headerOngoing',
    title: 'Ongoing Collaborations',
    text:
      'Kindly click here to see your ongoing collaborations with the roosters in your network.',
    attachTo: {element: headerOngoingEL, on: 'bottom'},
    showOn() {
      setScreenType('ongoing');
      return !!document.querySelector(headerOngoingEL);
    },
    buttons: [
      {
        action() {
          return this.back();
        },
        classes: 'shepherd-button-secondary',
        text: 'Back',
      },
      {
        action() {
          return this.next();
        },
        text: 'Next',
      },
    ],
  },
  {
    id: 'noCollaboration',
    title: 'Oops!',
    text:
      "You haven't collaborated with any rooster yet. Please share the workloads with the roosters in your network and see the Ongoing Collaborations.",
    attachTo: {element: noRoosterImageCollaboration, on: 'bottom'},
    showOn() {
      return !!document.querySelector(noRoosterImageCollaboration);
    },
    buttons: [
      {
        action() {
          return this.back();
        },
        classes: 'shepherd-button-secondary',
        text: 'Back',
      },
      {
        action() {
          return this.next();
        },
        text: 'Next',
      },
    ],
  },
  {
    id: 'tableContainerOnGoingCollaboration',
    title: 'Ongoing Collaborations',
    text: 'Here are your On Going Collaborations.',
    attachTo: {element: tableContainerOnGoingCollaboration, on: 'bottom'},
    showOn() {
      return !!document.querySelector(tableContainerOnGoingCollaboration);
    },
    buttons: [
      {
        action() {
          return this.back();
        },
        classes: 'shepherd-button-secondary',
        text: 'Back',
      },
      {
        action() {
          return this.next();
        },
        text: 'Next',
      },
    ],
  },
  {
    id: 'tableContainerPushPullCollab',
    title: 'Ongoing Collaborations',
    text: 'You can Deploy, Delete, and Abort the workloads from here.',
    attachTo: {element: tableContainerPushPullNetwork, on: 'bottom'},
    showOn() {
      setScreenType('ongoing');
      if (document.querySelector(tableContainerOnGoingCollaboration)) {
        return !!document.querySelector(tableContainerPushPullNetwork);
      }
      return false;
    },
    buttons: [
      {
        action() {
          return this.back();
        },
        classes: 'shepherd-button-secondary',
        text: 'Back',
      },
      {
        action() {
          return this.next();
        },
        text: 'Next',
      },
    ],
  },
  {
    id: 'headerMyTeam',
    title: 'My Teams',
    text: 'You can view your joined Teams, pending requests, pending invites.',
    attachTo: {element: headerMyTeam, on: 'bottom'},
    showOn() {
      setScreenType('myTeam');
      return !!document.querySelector(headerMyTeam);
    },
    buttons: [
      {
        action() {
          return this.back();
        },
        classes: 'shepherd-button-secondary',
        text: 'Back',
      },
      {
        action() {
          return this.next();
        },
        text: 'Next',
      },
    ],
  },
  {
    id: 'noTeams',
    title: 'Oops!',
    text: 'You have not joined any team',
    attachTo: {element: noRoosterImageMyTeam, on: 'bottom'},
    showOn() {
      return !!document.querySelector(noRoosterImageMyTeam);
    },
    buttons: [
      {
        action() {
          return this.back();
        },
        classes: 'shepherd-button-secondary',
        text: 'Back',
      },
      {
        action() {
          return this.next();
        },
        text: 'Next',
      },
    ],
  },
  {
    id: 'CreateTeamButton',
    title: 'Create Team',
    text: 'Click on the button to create Rooster.',
    attachTo: {element: createTeamButtonMyTeam, on: 'bottom'},
    showOn() {
      setScreenType('myTeam');
      return !!document.querySelector(createTeamButtonMyTeam);
    },
    buttons: [
      {
        action() {
          return this.back();
        },
        classes: 'shepherd-button-secondary',
        text: 'Back',
      },
      {
        action() {
          return this.next();
        },
        text: 'Next',
      },
    ],
  },
  {
    id: 'headerAllTeam',
    title: 'All Teams',
    text: 'You can view all the teams here.',
    attachTo: {element: headerAllTeam, on: 'bottom'},
    showOn() {
      setScreenType('allTeams');
      return !!document.querySelector(headerAllTeam);
    },
    buttons: [
      {
        action() {
          return this.back();
        },
        classes: 'shepherd-button-secondary',
        text: 'Back',
      },
      {
        action() {
          return this.complete();
        },
        text: 'Done',
      },
    ],
  },
];
