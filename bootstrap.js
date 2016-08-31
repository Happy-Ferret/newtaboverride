/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const {utils: Cu} = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "CustomizableUI",
                                  "resource:///modules/CustomizableUI.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "AddonManager",
                                  "resource://gre/modules/AddonManager.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "ExtensionManagement",
                                "resource://gre/modules/ExtensionManagement.jsm");
XPCOMUtils.defineLazyServiceGetter(this, "aboutNewTabService",
                                 "@mozilla.org/browser/aboutnewtab-service;1",
                                 "nsIAboutNewTabService");

// set these to the proper addon id and path within the addon to the newtab page
const EXTENSION_OVERRIDE_ID = "simpleexample@mozilla.org";
const EXTENSION_OVERRIDE_URL = "test.html";

var Overlay = {
  startup() {
    CustomizableUI.addListener(this);
    AddonManager.addAddonListener(this);
    // if this addon is started after the override target addon, initialize now
    AddonManager.getAddonByID(EXTENSION_OVERRIDE_ID, (addon) => {
      if (addon)
        this.init(addon);
    });
  },
  init(addon) {
    let url = ExtensionManagement.getURLForExtension(addon.id, EXTENSION_OVERRIDE_URL);
    //dump("setting newTabURL for " + addon.id + " to " + url + "\n");
    aboutNewTabService.newTabURL = url;

    for (let win of CustomizableUI.windows) {
      this.onWindowOpened(win);
    }
  },
  onInstalled(addon) {
    // onEnabled is not called when an addon is installed
    this.onEnabled(addon);
  },
  onUninstalled(addon) {
    // onDisabled is not called when an addon is uninstalled
    this.onDisabled(addon);
  },
  // if the target addon is enabled/disabled then we init/shutdown the override
  onEnabled: function(addon) {
    if (addon.id == EXTENSION_OVERRIDE_ID)
      this.init(addon);
  },
  onDisabled: function(addon) {
    if (addon.id == EXTENSION_OVERRIDE_ID)
      this.uninit();
  },
  uninit() {
    if (!aboutNewTabService.overridden)
      return;
    for (let win of CustomizableUI.windows) {
      if (win.gInitialPages && win.gInitialPages.includes(aboutNewTabService.newTabURL)) {
        win.gInitialPages.splice(1, win.gInitialPages.indexOf(aboutNewTabService.newTabURL));
      }
    }
    aboutNewTabService.resetNewTabURL();
  },
  shutdown() {
    CustomizableUI.removeListener(this);
    AddonManager.removeAddonListener(this);
    this.uninit();
  },
  // new windows need the newTabUrl in gInitialPages
  onWindowOpened(window) {
    if (window.gInitialPages && !window.gInitialPages.includes(aboutNewTabService.newTabURL)) {
      window.gInitialPages.push(aboutNewTabService.newTabURL);
    }
  },

};

function startup() {
  Overlay.startup();
}

function shutdown(data, reason) {
  if (reason != APP_SHUTDOWN) {
    Overlay.shutdown();
  }
}

function install() {
}

function uninstall() {
}
