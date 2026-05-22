import EmbroiderRouter from "@embroider/router";

import config from "#config";

export default class Router extends EmbroiderRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function () {});
