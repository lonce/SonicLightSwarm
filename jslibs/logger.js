'use strict';

var setup = function (appName) {
  return function (req, res, next) {
    if (req.hasLoggingBeenRun) {
      return next();
    }

    //console.log(appName + ': ' + req.method + ' ' + req.url);
    if (req.url === "/") { /// just responds to the initial access
    	console.log("----------------");
    	console.log(appName + '  user-agent: ' + req.headers['user-agent']);
    	console.log(appName + '  ip: ' + req.ip);
    	console.log(appName + '  host: ' + req.host);
    }
    req.hasLoggingBeenRun = true;
    next();
  };
};

module.exports = setup;
