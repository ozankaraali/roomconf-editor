"use strict";

import { Network } from "vis-network/peer/esm/vis-network";
import { DataSet } from "vis-data/peer/esm/vis-data";
import config from "./config";
import jQuery from "jquery";

let lastFpCount = 0;
let currentChain = [];
let currentSelectedNode = "";
let clusteringAgraphml = "";
let autocompletionsMsg = "";
let skipBlocks = false;

if (typeof String.prototype.startsWith != "function") {
  String.prototype.startsWith = function (str) {
    return this.slice(0, str.length) == str;
  };
}

let debug = config.debug;

// create empty nodes array
let nodes = new DataSet([
  // {id: 1, label: 'Node 1', title: 'I have a popup!'},
]);
// also create zones nodes array
let zonesNodes = new DataSet([]);

// create empty edges array
let edges = new DataSet([
  // {id: 2, label: 'Edge 1', from: 1, to: 2},
]);

let data = {
  nodes: nodes,
  edges: edges,
};

let locales = {
  en: {
    addNode: "Add Room",
    addEdge: "Add Edge",
    editNode: "Edit Room",
    editEdge: "Edit Edge",
    addDescription: "Click in an empty space to place a new room.",
    edgeDescription: "Click on a room and drag the edge to another room to connect them.",
    del: "Delete selected",
    back: "Back",
  },
};

let options = {
  manipulation: {
    enabled: true,
    initiallyActive: true,
    addNode: function (nodeData, callback) {
      nodeData.label = "ROOM";
      nodeData.roomType = "ROOM";
      nodeData.title = "Double-click to edit";
      callback(nodeData);
    },
    deleteNode: function (nodeData, callback) {
      if (currentSelectedNode !== "ROOM") {
        currentChain.push("r0" + currentSelectedNode);
      } else {
        if (network.getConnectedEdges(nodeId).length > 0) {
          currentChain.push("r0" + currentSelectedNode);
        }
      }
      callback(nodeData);
    },
    addEdge: function (edgeData, callback) {
      if (edgeData.from === edgeData.to) {
        userView.print('<span class="warning">Cannot connect the room to itself.</span>');
      } else {
        edgeData.label = "EDGE";
        edgeData.edgeType = "EDGE";
        if (edges.get().length === 0 && nodes.get().length === 2) {
          callback(edgeData);
        } else {
          let tos = edges
            .get()
            .filter(function (e) {
              return e.from === edgeData.from;
            })
            .map(function (e) {
              return e.to;
            })
            .map(function (to) {
              return to === edgeData.to;
            });
          let froms = edges
            .get()
            .filter(function (e) {
              return e.to === edgeData.from;
            })
            .map(function (e) {
              return e.from;
            })
            .map(function (from) {
              return from === edgeData.to;
            });
          if (tos.includes(true) || froms.includes(true)) {
            userView.print('<span class="warning">Rooms are already connected.</span>');
          } else {
            callback(edgeData);
          }
        }
      }
    },
    editEdge: false,
  },
  nodes: {
    shape: "dot",
    size: 30,
    font: {
      size: 18,
      color: "#000000",
      background: "#ffffffd5",
      strokeWidth: 0,
      face: "Inconsolata, monospace",
    },
    borderWidth: 2,
  },
  edges: {
    width: 3,
    smooth: false,
    font: {
      size: 18,
      align: "middle",
      color: "#000000",
      background: "#ffffffd5",
      strokeWidth: 0,
      face: "Inconsolata, monospace",
    },
  },
  locale: "en",
  locales: locales,
  interaction: {
    dragView: true,
    zoomView: true,
    tooltipDelay: 0,
    multiselect: true,
  },
};

// create vis network
let container = document.querySelector("#metiscbr-graphui");
let network = new Network(container, data, options);
network.setOptions({
  physics: { enabled: false },
});

const freezeNetwork = function (order) {
  if (order === "freeze") {
    network.setOptions({
      interaction: {
        dragNodes: false,
        selectable: false,
      },
    });
  } else {
    network.setOptions({
      interaction: {
        dragNodes: true,
        selectable: true,
      },
    });
  }
};

let disableManipulation = document.querySelector("#disableManipulation");
let disableActions = document.querySelector("#disableActions");
let disableDownload = document.querySelector("#disableDownload");
const toggleManipulation = function (order) {
  if (order === "hide") {
    disableManipulation.classList.add("show");
    disableActions.classList.add("show");
    disableDownload.classList.add("show");
    freezeNetwork("freeze");
  } else {
    disableManipulation.classList.remove("show");
    disableActions.classList.remove("show");
    disableDownload.classList.remove("show");
    freezeNetwork("unfreeze");
  }
};

let overlay = document.querySelector("#overlay");
let selectType = document.querySelector(".selectType");

const showOverlay = function (cls1, cls2) {
  overlay.classList.remove(cls1);
  overlay.classList.add(cls2);
  selectType.classList.remove(cls1);
  selectType.classList.add(cls2);
};

const hideWithSelected = function (selector) {
  document.querySelectorAll(selector).forEach((el) => {
    el.classList.remove("show");
    el.classList.add("hide");
    el.classList.remove("type-selected");
  });
};

const showTypes = function (order, type, concept) {
  if (order === "show") {
    showOverlay("hide", "show");
    document.querySelectorAll("." + type).forEach((el) => {
      el.classList.remove("hide");
      el.classList.add("show");
      if (el.innerHTML === concept["roomType"] || el.innerHTML === concept["edgeType"]) {
        el.classList.add("type-selected");
      } else {
        el.classList.remove("type-selected");
      }
    });
    if (type === "room-type") {
      selectType.classList.remove("edge-overlay");
      document.querySelector("#areaInput").value = concept["area"];
      document.querySelector("#windowsInput").checked = concept["windowsExist"];
      let label = concept["label"];
      document.querySelector("#roomLabelText").value =
        label.indexOf('"') > -1 ? label.substring(label.indexOf('"') + 1, label.length - 1) : "";
    } else {
      selectType.classList.add("edge-overlay");
    }
  } else if (order === "hide") {
    showOverlay("show", "hide");
    if (type !== undefined) {
      hideWithSelected("." + type);
    } else {
      hideWithSelected(".room-type, .edge-type");
    }
  }
};

document.querySelector("#closeTypes").onclick = function () {
  showTypes("hide");
  toggleManipulation("show");
};

let roomColors = {
  ROOM: "#96c2fc",
  LIVING: "#e9f1b5",
  SLEEPING: "#cef1b5",
  WORKING: "#f1e5b5",
  KITCHEN: "#dbb5f1",
  CORRIDOR: "#f1b5d5",
  BATH: "#b5ebf1",
  TOILET: "#b7b5f1",
  PARKING: "#b5f1d1",
  CHILDREN: "#aad2e6",
  EXTERIOR: "#b5f1d1",
  STORAGE: "#f1c4b5",
  BUILDINGSERVICES: "#b5f1d1",
};

let edgeColors = {
  DOOR: '#009900',
  PASSAGE: '#009900',
  WALL: '#bb0000',
  ENTRANCE: '#009900',
  SLAB: '#bb0000',
  STAIRS: '#009900',
  WINDOW: '#bb0000',
  EDGE: '#96c2fc'
}

let allClusterColors = {
  0: "#96c2fc", // blue
  1: "#e9f1b5", // green
  2: "#cef1b5", // yellow
  3: "#f1e5b5", // brown
  4: "#dbb5f1", // violet
  5: "#f1b5d5", // pink
  6: "#b5ebf1", // azure
  7: "#b7b5f1", // purple
  8: "#b5f1d1", // light green
  9: "#aad2e6"  // türkis
}

const getRandomColor = function () {
  let color = Math.floor(Math.random() * 16777215).toString(16);
  return "#" + (color.length === 6 ? color : color + "0");
};

let nodeId = "";
let edgeId = "";
document.querySelector(".saveType").onclick = function () {
  let type = document.querySelectorAll(".type-selected")[0].innerHTML;
  if (document.querySelectorAll(".room-type")[0].classList.contains("show")) {
    let a = document.querySelector("#areaInput").value;
    let w = document.querySelector("#windowsInput").checked;
    let l = document.querySelector("#roomLabelText").value;
    let currentType = nodes.get(nodeId).label;
    if (currentType === "ROOM") {
      currentChain.push("a0" + type);
    } else {
      currentChain.push("t0" + currentType); // TODO: + ':(' + type + ')');
    }
    currentSelectedNode = type;
    nodes.update({
      id: nodeId,
      label: l === undefined || l === "" ? type : type + '\n"' + l.trim() + '"',
      roomType: type,
      color: roomColors[type],
      area: a,
      size: isNaN(parseInt(a)) ? 30 : parseInt(a) * 3 >= 81 ? 81 : parseInt(a) * 3 < 21 ? 21 : parseInt(a) * 3,
      windowsExist: w,
      title: (debug ? nodeId + "<br>" : "") + "Area: "
        + (isNaN(parseInt(a)) ? "undefined" : a + " m<sup>2</sup>") + "<br>Windows exist: " + w,
    });
    showTypes("hide", "room-type");
    toggleManipulation("show");
  } else if (document.querySelectorAll(".edge-type")[0].classList.contains("show")) {
    edges.update({
      id: edgeId,
      label: type,
      edgeType: type,
      color: edgeColors[type],
    });
    showTypes("hide", "edge-type");
    toggleManipulation("show");
  }
};

network.on("doubleClick", function (params) {
  let n = params.nodes;
  let e = params.edges;
  if (n.length === 1) {
    nodeId = n[0];
    showTypes("show", "room-type", nodes.get(nodeId));
    toggleManipulation("hide");
  } else if (e.length === 1) {
    edgeId = e[0];
    showTypes("show", "edge-type", edges.get(edgeId));
    toggleManipulation("hide");
  }
});
network.on("selectNode", function (params) {
  nodeId = params.nodes[0];
  currentSelectedNode = nodes.get(nodeId).roomType;
});
network.on("deselectNode", function (params) {
  currentSelectedNode = "";
  nodeId = "";
});

const renderResponse = function (el, parentEl, msg) {
  document.querySelector(parentEl).innerHTML = "";
  let element = document.createElement(el);
  element.innerHTML = msg;
  document.querySelector(parentEl).appendChild(element);
};

let userView = {
  print: function (msg) {
    if (msg.startsWith("<suggestion>")) {
      showSuggestion(msg);
    } else if (msg.startsWith("<adaptation>")) {
      drawAdaptation(msg);
    } else if (msg.startsWith("<zones>")) {
      inspectZones(msg);
    } else if (msg.startsWith('<span class="connection')) {
      // display connection message
      document.querySelector("#connMessages p").innerHTML = msg;
    } else if (msg.startsWith("<clustering>")) {
      clusteringAgraphml = msg;
      if (skipBlocks) {
        getAutocompletionForBlocks();
      } else {
        activateAutocompletionNotifier('show');
      }
    } else if (msg.includes('<autocompletions>')) {
      autocompletionsMsg = msg;
      if (skipBlocks) {
        activateAutocompletionNotifier('show');
      } else {
        showAutocompletions();
        autocompletionsMsg = "";
      }
    } else {
      // display retrieval results or error message
      showRetrievalResults(msg);
    }
  },
};

let server = config.server;
if (typeof config.port === "number") {
  server += ":" + config.port;
}

let req = {
  socket: null,
  connect: function (host) {
    if ("WebSocket" in window) {
      req.socket = new WebSocket(host);
    } else if ("MozWebSocket" in window) {
      req.socket = new MozWebSocket(host);
    } else {
      userView.print('<span class="connection red">' + "Your browser doesn't support websocket connections.</span>");
      return;
    }
    req.socket.onopen = function () {
      userView
        .print('<span class="connection green">' + "&#9679;</span> Connected via websocket to <b>" + server + "</b>");
      jQuery("#send2, #getAdaptation, #getSuggestion").prop("disabled", false).removeClass("disabled");
    };
    req.socket.onclose = function () {
      userView.print('<span class="connection red">' + "&#9679;</span> Not connected.");
      jQuery("#send2, #getAdaptation, #getSuggestion, #getAutocompletion").prop("disabled", true).addClass("disabled");
    };
    req.socket.onmessage = function (msg) {
      userView.print(msg.data);
    };
  },
  init: function () {
    if (window.location.protocol === "http:" || window.location.protocol === "file:") {
      req.connect("ws://" + server + "/request");
    } else {
      req.connect("wss://" + server + "/request");
    }
  },
};

let start = '<?xml version="1.0" encoding="UTF-8"?><searchrequest>';
let head = '<agraphml><graphml xmlns="http://graphml.graphdrawing.org/xmlns" '
    + 'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
    + 'xsi:schemalocation="http://graphml.graphdrawing.org/xmlns '
    + 'http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">'
    + '<graph id="searchGraph1" edgedefault="undirected">'
    + '<key id="imageUri" for="graph" attr.name="imageUri" attr.type="string"></key>'
    + '<key id="imageMD5" for="graph" attr.name="imageMD5" attr.type="string"></key>'
    + '<key id="validatedManually" for="graph" attr.name="validatedManually" attr.type="boolean"></key>'
    + '<key id="floorLevel" for="graph" attr.name="floorLevel" attr.type="float"></key>'
    + '<key id="buildingId" for="graph" attr.name="buildingId" attr.type="string"></key>'
    + '<key id="ifcUri" for="graph" attr.name="ifcUri" attr.type="string"></key>'
    + '<key id="bimServerPoid" for="graph" attr.name="bimServerPoid" attr.type="long"></key>'
    + '<key id="alignmentNorth" for="graph" attr.name="alignmentNorth" attr.type="float"></key>'
    + '<key id="geoReference" for="graph" attr.name="geoReference" attr.type="string"></key>'
    + '<key id="name" for="node" attr.name="name" attr.type="string"></key>'
    + '<key id="roomType" for="node" attr.name="roomType" attr.type="string"></key>'
    + '<key id="center" for="node" attr.name="center" attr.type="string"></key>'
    + '<key id="corners" for="node" attr.name="corners" attr.type="string"></key>'
    + '<key id="windowExist" for="node" attr.name="windowExist" attr.type="boolean"></key>'
    + '<key id="enclosedRoom" for="node" attr.name="enclosedRoom" attr.type="boolean"></key>'
    + '<key id="area" for="node" attr.name="area" attr.type="float"></key>'
    + '<key id="cluster" for="node" attr.name="cluster" attr.type="string"></key>'
    + '<key id="problematicCluster" for="node" attr.name="problematicCluster" attr.type="string"></key>'
    + '<key id="edgeType" for="edge" attr.name="edgeType" attr.type="string"></key>'
    + '<data key="imageUri"></data><data key="imageMD5"></data>'
    + '<data key="validatedManually">false</data>'
    + '<data key="floorLevel">0.0</data>'
    + '<data key="buildingId">0</data>'
    + '<data key="ifcUri"></data>'
    + '<data key="bimServerPoid">0</data>'
    + '<data key="alignmentNorth">0.0</data>'
    + '<data key="geoReference">null</data>';
let foot = "</graph></graphml></agraphml>";
let end = "</searchrequest>";

const getNodesAndEdges = function () {
  let queryElements = "";
  let positions = network.getPositions();
  nodes.get().forEach((node) => {
    let nodeId = node["id"];
    let group = "";
    try {
      group = zonesNodes.get(nodeId).group;
    } catch (e) {
      // pass
    }
    let zone = group !== "" ? ' zone="' + group + '"' : "";
    let roomType = node["roomType"];
    let label = node["label"];
    label = label.indexOf('"') > -1 ? label.substring(label.indexOf('"') + 1, label.length - 1) : "";
    let area = node["area"] === undefined || node["area"] === "" ? 0 : node["area"];
    let windowsExist = node["windowsExist"] === undefined ? false : node["windowsExist"];
    let center = "(" + positions[nodeId].x + " " + positions[nodeId].y + ")";
    queryElements += '<node id="' + nodeId + '"' + zone + ">" +
      '<data key="roomType">' + roomType + "</data>" +
      '<data key="name">' + label + "</data>" + '<data key="area">' + area + "</data>" +
      '<data key="windowExist">' + windowsExist + "</data>" + '<data key="center">' + center +
      "</data></node>";
  });
  edges.get().forEach((edge) => {
    let edgeId = edge["id"];
    let source = edge["from"];
    let sourceGroup = "";
    try {
      sourceGroup = zonesNodes.get(source).group;
    } catch (e) {
      // pass
    }
    let sourceZone = sourceGroup !== "" ? ' sourceZone="' + sourceGroup + '"' : "";
    let target = edge["to"];
    let targetGroup = "";
    try {
      targetGroup = zonesNodes.get(target).group;
    } catch (e) {
      // pass
    }
    let targetZone = targetGroup !== "" ? ' targetZone="' + targetGroup + '"' : "";
    let edgeType = edge["edgeType"];
    queryElements += '<edge id="' + edgeId + '" source="' + source + '" target="' + target + '"'
      + sourceZone + targetZone + ">" + '<data key="edgeType">' + edgeType + "</data>" + "</edge>";
  });
  return queryElements;
};

const getGraphML = function (ev) {
  let nodesAndEdges = getNodesAndEdges();
  let msg2 = start + head + nodesAndEdges + foot;
  let filters = document.querySelectorAll(".filterCheckbox");
  let weights = document.querySelectorAll(".weightValue");
  let fingerprints = "";
  for (let i = 0; i < filters.length; i++) {
    if (filters[i].checked === true) {
      if (weights[i].value !== "") {
        let wt = parseFloat(weights[i].value);
        fingerprints +=
          '<fingerprint name="' + filters[i].value + '" weight="' + weights[i].value + '"></fingerprint>';
      } else {
        fingerprints += '<fingerprint name="' + filters[i].value + '" weight="1"></fingerprint>';
      }
    }
  }
  fingerprints = '<fingerprints search="' + ev + '">' + fingerprints + "</fingerprints>";
  let inspectZones = "";
  let analyzeGraph = "";
  if (ev === "search-graphmatch") {
    let inspect = document.querySelector("#inspectZones");
    if (inspect.checked) {
      let zonesSet = nodesAndEdges.indexOf('zone="') > -1 &&
        nodesAndEdges.indexOf('sourceZone="') > -1 &&
        nodesAndEdges.indexOf('targetZone="') > -1;
      inspectZones += '<inspectZones zonesSet="' + zonesSet + '"></inspectZones>';
    }
    let analyze = document.querySelector("#analyzeGraph");
    if (analyze.checked) {
      analyzeGraph += '<analyzeGraph analyzeGraph="true"></analyzeGraph>';
    }
  }
  return msg2 + fingerprints + inspectZones + analyzeGraph + end;
};

const disableSearch = function () {
  jQuery("#send2").prop("disabled", true).addClass("disabled");
  document.querySelector("#sendAgraphml .loading").classList.remove("ready");
  document.querySelector("#sendAgraphml .loading").classList.remove("error");
  document.querySelector("#sendAgraphml .loading").classList.add("active");
};

const sendQuery = function (ev, continueSearch) {
  // Clear retrieval messasges field first
  renderResponse("form", "#retrievalMessages", "");
  let filters = jQuery(".filterCheckbox");
  let count = filters.filter(function (index) {
    return jQuery(filters[index]).prop("checked");
  }).length;
  if (getNodesAndEdges() != "") {
    if (ev === "download") {
      let graphML = getGraphML();
      document.querySelector("#showAgraphml").value =
        graphML.substring(graphML.indexOf("<graphml"), graphML.lastIndexOf("</graphml") + 10);
    } else if (ev === "search-cbr") {
      if (count === 0) {
        userView.print("<error>Please select fingerprints.</error>");
      } else if (count === 1) {
        lastFpCount = 1;
        disableSearch();
        req.socket.send(getGraphML(ev));
      }
    } else if (ev === "search-graphmatch") {
      if (count === 1) {
        lastFpCount = 1;
        disableSearch();
        let graphML = getGraphML(ev);
        if (graphML.indexOf('zonesSet="true"') > -1) {
          if (continueSearch) {
            zonesView.classList.add("hide");
            req.socket.send(graphML);
          } else {
            inspectZones(graphML);
          }
        } else {
          zonesView.classList.add("hide");
          req.socket.send(graphML);
        }
      } else if (count === 0) {
        userView.print("<error>Please select fingerprints.</error>");
      }
    }
  } else {
    if (ev !== "download") {
      userView.print("<error>Query is empty.</error>");
    }
  }
};

const getSuggestion = function () {
  let roomCount = nodes.get().length;
  if (roomCount < 2) {
    userView.print("<suggestion><error>At least two rooms should be "
      + "available to produce a suggestion.</error></suggestion>");
  } else {
    userView.print("<suggestion></suggestion>"); // Clear suggestion field
    let edgeCount = edges.get().length;
    let actionCount = currentChain.length;
    let nodeIds = nodes.get().map(function (n) {
      return n.id;
    });
    let roomsAndEdges = [];
    nodeIds.forEach((id) => {
      let e = network.getConnectedEdges(id).map(function (id) {
        return edges.get(id).label;
      });
      roomsAndEdges.push(nodes.get(id).label + "-" + e.join("/"));
    });
    let chainMetaMsg = "<chainMeta>" + currentChain.join(";") + "," + roomCount + "," + edgeCount
      + "," + actionCount + "," + lastFpCount + "," + roomsAndEdges.join("_") + "</chainMeta>";
    let suggMsgBody = head + getNodesAndEdges() + foot;
    let suggestionMsg = suggMsgBody.replace("<agraphml>", "<suggestion>")
      .replace("</agraphml>", "</suggestion>");
    document.querySelector("#suggestion .loading").classList.remove("ready");
    document.querySelector("#suggestion .loading").classList.remove("error");
    document.querySelector("#suggestion .loading").classList.add("active");
    jQuery("#getSuggestion").prop("disabled", true).addClass("disabled");
    req.socket.send(chainMetaMsg + suggestionMsg);
    toggleManipulation();
  }
};

const getAdaptation = function () {
  userView.print("<adaptation></adaptation>"); // Clear suggestion field
  if (getNodesAndEdges() != "") {
    let adaptationMsg = (head + getNodesAndEdges() + foot)
      .replace("<agraphml>", "<adaptation>")
      .replace("</agraphml>", "</adaptation>");
    document.querySelector("#adaptation .loading").classList.remove("error");
    document.querySelector("#adaptation .loading").classList.add("active");
    jQuery("#getAdaptation").prop("disabled", true).addClass("disabled");
    req.socket.send(adaptationMsg);
  } else {
    userView.print("<adaptation><error>Room configuration is empty.</error></adaptation>");
  }
};

const activateAutocompletionNotifier = function (order) {
  if (order === 'show') {
    document.querySelector("#autocompletion .loading").classList.remove("active");
    document.querySelector("#autocompletion .loading").classList.remove("error");
    document.querySelector('#autocompletionNotifier').classList.add('show');
    document.querySelector('#notifier').classList.add('highlight');
    setTimeout(function () {
      document.querySelector('#notifierText').classList.remove('hide');
    }, 300);
  } else {
    setTimeout(function () {
      document.querySelector('#autocompletionNotifier').classList.remove('show');
      document.querySelector('#notifier').classList.remove('highlight');
      document.querySelector('#notifierText').classList.add('hide');
    }, 300);
  }
}

const activateGetAutocompletion = function (activate) {
  let getAutocompletionButton = document.querySelector('#getAutocompletion');
  if (activate) {
    getAutocompletionButton.disabled = false;
    getAutocompletionButton.classList.remove('disabled');
  } else {
    getAutocompletionButton.disabled = true;
    getAutocompletionButton.classList.add('disabled');
  }
}

const getAutocompletion = function (blocks) {
  renderResponse("form", "#autocompletionMessages", "");
  document.querySelector("#autocompletion .loading").classList.remove("error");
  if (typeof blocks !== "object" && blocks.indexOf("<clustering>") === 0) {
    let selectedClusters = [];
    document.querySelectorAll(".clusterSelect").forEach((el) => {
      if (el.checked) {
        selectedClusters.push(el.value);
      }
    });
    let clusters = "<selectedClusters>" + selectedClusters.join(",") + "</selectedClusters>";
    let fingerprints = '<fingerprints><fingerprint name="Room_Graph" weight="1">'
          + '</fingerprint></fingerprints>';
    req.socket.send("<autocompletion>" + blocks + clusters + fingerprints + "</autocompletion>");
  } else if (getNodesAndEdges() != "") {
    clearAllClusters();
    let clusteringMethod = document.querySelector('#clusterings').selectedOptions[0].value;
    let clusteringOption; // Distance function or number rooms in cluster
    let df = document.querySelector('#distanceFunctions').selectedOptions[0].value;
    let count = document.querySelector('#clusterCount').value;
    if (clusteringMethod == "distance-based" || clusteringMethod === "force-directed") {
      clusteringOption = df;
    } else if (clusteringMethod === "hierarchical") {
      clusteringOption = df + '#' + count;
    } else {
      clusteringOption = count;
    }
    let clusteringEl =  '<clusteringMethod>' + clusteringMethod + '@' + clusteringOption + '</clusteringMethod>';
    let autocompletionMsg = (head + getNodesAndEdges() + foot)
        .replace("<agraphml>", '<autocompletion>')
        .replace("</agraphml>", clusteringEl + "</autocompletion>");
    req.socket.send(autocompletionMsg);
    activateGetAutocompletion(false);
  }
  document.querySelector("#autocompletion .loading").classList.add("active");
}

const getAutocompletionForBlocks = function () {
  getAutocompletion(clusteringAgraphml);
  if (!skipBlocks) {
    closeClustering();
  }
}

const showAutocompletions = function () {
  document.querySelector("#autocompletion .loading").classList.remove("active");
  if (autocompletionsMsg.includes("<autocompletions><error>")) {
    document.querySelector("#autocompletion .loading").classList.add("error");
    renderResponse("form", "#autocompletionMessages", autocompletionsMsg);
    activateGetAutocompletion(true);
  } else {
    document.querySelector("#output").classList.remove("hide");
    document.querySelector("#output").classList.add("show");
    let autocomnpletionCount = autocompletionsMsg.match(/<\/tr>/g).length;
    jQuery("#result").css("width", autocomnpletionCount * 250 + "px");
    let index1 = autocompletionsMsg.indexOf("<autocompletions>") + 17;
    let index2 = autocompletionsMsg.indexOf("</autocompletions>");
    let autocompletions = autocompletionsMsg.substring(index1, index2);
    renderResponse("tbody", "#result", autocompletions);
    jQuery("tr").append('<td class="showExplanation">Info</td>');
    let applyMessage = 'Apply <span style="color:#3a1ccc;font-weight:600">autocompletion</span> '
     + 'on the right side or select another result.';
    agraphmlToRoomConf(applyMessage);
  }
}

let cl = document.querySelector("#showAgraphml").classList;
let cl_ag = document.querySelector("#agraphmlControls").classList;

document.querySelector("#downloadAgraphml").onclick = function () {
  if (cl.contains("hide")) {
    cl.remove("hide");
    cl_ag.remove("hide");
    cl.add("show");
    cl_ag.add("show");
    sendQuery("download");
  } else {
    cl.remove("show");
    cl_ag.remove("show");
    cl.add("hide");
    cl_ag.add("hide");
  }
};

// Initalize objects for zonesView
let groups = {};
const updateZonesLegend = function () {
  jQuery(".zonesLegendEntry").remove();
  Object.keys(groups).forEach((groupId) => {
    let entry = '<div class="zonesLegendEntry"><span class="zoneColor" style="background:' +
      groups[groupId].color.background + '"></span> <span>("' + groups[groupId].count +
      ")</span> <span>" + groupId + " <i>" + groups[groupId].name + "<i></span></div>";
    jQuery("#zonesLegend").append(entry);
  });
};

let currentClusters = {};
let problematicClusters = new Set();
const updateClustersSelection = function () {
  if (problematicClusters.size === 0) {
    document.getElementById("noClusters").classList.remove("hide");
    document.getElementById("clustersAvailable").classList.add("hide");
    document.getElementById("send4").classList.add("disabled");
    document.getElementById("send4").disabled = true;
  } else {
    document.getElementById("clustersAvailable").classList.remove("hide");
    document.getElementById("noClusters").classList.add("hide");
    document.getElementById("send4").classList.remove("disabled");
    document.getElementById("send4").disabled = false;
    jQuery(".clusterSelectionEntry").remove();
    Object.keys(currentClusters).forEach((clusterId) => {
      if (problematicClusters.has(parseInt(clusterId))) {
        let clId = "cluster" + clusterId;
        let clInput = '<div class="clusterSelectionEntry"><input  class="clusterSelect" type="checkbox" checked id="'
        + clId + '" name="' + clId + '" value="' + clusterId + '">';
        let clRooms = currentClusters[clusterId].join(", ");
        let clLabel = '<label for="' + clId + '">&nbsp;<span class="zoneColor redBorder" style="background:'
        + allClusterColors[clusterId] + '"></span> ' + clusterId + ' (' + clRooms + ")</label></div>";
        let entry = clInput + clLabel;
        jQuery("#clusterSelection").append(entry);
      }
    });
  }
}

const clearAllClusters = function () {
  if (Object.keys(currentClusters).length > 0) {
    Object.keys(currentClusters).forEach((clusterId) => {
      delete currentClusters[clusterId];
    });
  }
  if (problematicClusters.size > 0) {
    problematicClusters.clear();
  }
}

// Apply AGraphML to a network
const applyAgraphml = function (agraphml,
                                nodesToUpdate,
                                edgesToUpdate,
                                networkToUpdate,
                                mappingColors,
                                factor,
                                ignoreClustering) {
  let currentFactor = factor !== undefined ? factor : 1;
  let mapping = mappingColors !== undefined && Object.entries(mappingColors).length > 0;
  let zonesAvailable = false;
  // first clear existing nodes, edges, and groups
  nodesToUpdate.clear();
  edgesToUpdate.clear();
  zonesNodes.clear();
  for (let g in groups) {
    delete groups[g];
  }
  // parse AGraphML
  let doc = jQuery.parseXML(agraphml);
  let xml = jQuery(doc);
  let agraphmlNodes = xml.find("node");
  let agraphmlEdges = xml.find("edge");
  agraphmlNodes.each(function () {
    let roomId = jQuery(this).attr("id");
    let color = "";
    let zone = jQuery(this).attr("zone");
    let zoneExists = zone !== undefined;
    let group = "";
    if (zoneExists) {
      let zoneName = jQuery(this).attr("zoneName");
      if (!zonesAvailable) {
        zonesAvailable = true;
      }
      group = "<br>Zone: " + zone;
      if (Object.keys(groups).includes(zone)) {
        let currentCount = groups[zone].count;
        groups[zone].count = currentCount + 1;
      } else {
        groups[zone] = {
          name: zoneName !== undefined ? "~ " + zoneName : "custom",
          color: {
            background: getRandomColor(),
          },
          count: 1,
        };
      }
      color = groups[zone].color.background;
    }
    let roomType = "";
    let label = "";
    let center = {};
    let area = "";
    let windowsExist = "";
    let replacementText = "";
    let cluster = "";
    let problematicCluster = "";
    let partOfCompletion = "";
    let data = jQuery(this).find("data");
    // TODO sort data to ensure that roomType is parsed before cluster?
    data.each(function () {
      let key = jQuery(this).attr("key");
      let text = jQuery(this).first().text();
      if (key === "roomType") {
        roomType = text.toUpperCase();
      }
      if (key === "name") {
        label = text;
      }
      if (key === "center" && text !== undefined && text !== "") {
        let xy = text.substring(text.indexOf("(") + 1, text.indexOf(")")).split(" ");
        center.x = parseFloat(xy[0]) * currentFactor;
        center.y = parseFloat(xy[1]) * currentFactor;
      }
      if (key === "area") {
        area = "Area: " + text + " m<sup>2</sup><br>";
      }
      if (key === "windowExist") {
        windowsExist = "Windows exist: " + text;
      }
      if (!ignoreClustering) {
        if (key === "cluster") {
          cluster = text;
          if (currentClusters[parseInt(cluster)] === undefined) {
            currentClusters[parseInt(cluster)] = [roomType];
          } else {
            currentClusters[parseInt(cluster)].push(roomType);
          }
        }
        if (key === "problematicCluster") {
          problematicCluster = text;
          problematicClusters.add(parseInt(cluster));
        }
        if (key === "autocompletion") {
          partOfCompletion = text;
        }
      }
    });
    let replacement = jQuery(this).find("replacement");
    replacement.each(function () {
      let text = jQuery(this).first().text();
      replacementText = "<b>Replaces: </b><i>" + text + "</i><br>";
    });
    if (area === "") {
      area = "Area: undefined<br>";
    }
    if (windowsExist === "") {
      windowsExist = "Windows exist: undefined";
    }
    if (roomId !== undefined && roomId !== "" && roomType !== undefined && roomType != "") {
      if (label !== "") {
        label = roomType + '\n"' + label + '"';
      } else {
        label = roomType;
      }
      let newNode = {
        id: roomId,
        label: label,
        roomType: roomType,
        color: color !== "" ? color : mapping ?
          (roomId in mappingColors ? mappingColors[roomId] : "#eeeeee") : roomColors[roomType],
        title: replacementText + area + windowsExist + group,
        borderWidth: (replacementText !== "" || problematicCluster !== "") ? 5 : 2,
        group: zone,
        shapeProperties: {
          borderDashes: replacementText !== "" ? true : false,
        },
      };
      if (cluster !== "") {
        newNode.color = {
          background: allClusterColors[parseInt(cluster)],
          border: problematicCluster != "" ? (partOfCompletion === "true" ? "#3a1ccc" : "#ec0000") : "#090"
        }
      }
      if (center.x !== undefined && center.y !== undefined) {
        newNode.x = center.x;
        newNode.y = center.y;
      }
      nodesToUpdate.update(newNode);
    }
  });
  agraphmlEdges.each(function () {
    let edgeId = jQuery(this).attr("id");
    let source = jQuery(this).attr("source");
    let target = jQuery(this).attr("target");
    let edgeType = "";
    let data = jQuery(this).find("data");
    data.each(function () {
      let key = jQuery(this).attr("key");
      if (key === "edgeType") {
        edgeType = jQuery(this).first().text().toUpperCase();
      }
    });
    let idAvailable = edgeId !== undefined && edgeId !== "";
    let sourceAvailable = source !== undefined && source !== "";
    let targetAvailable = target !== undefined && target !== "";
    let typeAvailable = edgeType !== undefined && edgeType !== "";
    if (idAvailable && sourceAvailable && targetAvailable && typeAvailable) {
      let newEdge = {
        id: edgeId,
        from: source,
        to: target,
        edgeType: edgeType,
        label: edgeType,
        color: mapping ? (source in mappingColors && target in mappingColors ? edgeColors[edgeType] : "#dddddd") : edgeColors[edgeType],
      };
      edgesToUpdate.update(newEdge);
    }
  });
  try {
    // update vis network data
    networkToUpdate.setData({ nodes: nodesToUpdate, edges: edgesToUpdate, groups: groups });
    // set nodes for zonesView
    if (zonesAvailable) {
      zonesNodes = nodesToUpdate;
      updateZonesLegend();
    }
  } catch (e) {
    console.log(e);
  }
};

document.querySelector("#applyAgraphml").onclick = function () {
  let agraphmlText = document.querySelector("#showAgraphml").value;
  let scaleFactor;
  let scale = jQuery(".scaleFactor");
  scale.each(function () {
    if (jQuery(this).prop("checked")) {
      scaleFactor = parseInt(jQuery(this).val());
    }
  });
  applyAgraphml(agraphmlText, nodes, edges, network, "", scaleFactor !== undefined ? scaleFactor : 1);
  cl.remove("show");
  cl_ag.remove("show");
  cl.add("hide");
  cl_ag.add("hide");
};

const immutableNetwork = function(container) {
  let immutableNetwork = new Network(container, {}, options);
  immutableNetwork.setOptions({
    height: "600px",
    width: "1302px",
    interaction: {
      dragView: false,
      dragNodes: false,
      zoomView: false,
    },
    physics: {
      enabled: false,
    },
    manipulation: {
      enabled: false,
    },
  });
  return immutableNetwork;
}

const showImmutableNetwork = function(network, agraphml, viewTypeTag) {
  document.querySelector("#sendAgraphml .loading").classList.remove("active");
  let graphML = agraphml.indexOf("<" + viewTypeTag + ">") > -1 ?
    agraphml.substring(agraphml.indexOf("<graphml"), agraphml.lastIndexOf("</" + viewTypeTag)) : agraphml;
  let view = document.querySelector("#" + viewTypeTag + "View");
  view.classList.remove("hide");
  applyAgraphml(graphML, new DataSet([]), new DataSet([]), network);
}

const showClustering = function(msg) {
  let clusteringViewContainer = document.querySelector("#clusteringViewContainer");
  showImmutableNetwork(immutableNetwork(clusteringViewContainer), msg, "clustering");
  updateClustersSelection(currentClusters);
}

const closeClustering = function() {
  document.querySelector("#clusteringView").classList.add("hide");
  clusteringAgraphml = "";
}

const queryTypes = {
  Graph_Match_Exact: "Exact Graph Matching",
  Graph_Match_Inexact: "Inexact Graph Matching",
  Graph_Match_Structure: "Structure Matching",
  Subgraph_Match_Exact: "Exact Subgraph Matching",
  Subgraph_Match_Inexact: "Inexact Subgraph Matching",
};

let availableResultAgraphmls = {}
const applyRoomconf = function (mappingId) {
  let resultAgraphml = availableResultAgraphmls[mappingId];
  let ignoreClustering = true;
  applyAgraphml(resultAgraphml, nodes, edges, network, "", 1, true);
  // clear all available result Agraphmls
  for (const id of Object.getOwnPropertyNames(availableResultAgraphmls)) {
    delete availableResultAgraphmls[id];
  }
  // TODO set position of the added node(s) from the current position in mapping view
  // NOTE: do not try to add all nodes to main network, applyAgraphml does this already,
  // just try to transfer position from the mapping network from the availableMappingNetworks object
}

const agraphmlToRoomConf = function (applyMessage) {
  let controls = '<div class="overViewControls">'
   + '<span class="overViewMessage">' + applyMessage + '</span>'
   + '<div class="overViewButtons">'
   + '<input type="button" value="Apply design" class="applyRoomconf"/>'
   + '</div></div>';
  let results = jQuery("#result tr");
  // remove available mappings
  jQuery(".mappingsView").remove();
  results.each(function (result) {
    let visualResultsContainer = jQuery(results[result]).children().get(4);
    let resultAgraphmlContainer = jQuery(visualResultsContainer).children().get(0);
    let resultAgraphmlElement = jQuery(resultAgraphmlContainer);
    let resultAgraphml = resultAgraphmlElement.html();
    if (resultAgraphml.startsWith("<graph") || resultAgraphml.startsWith("[")) {
      let resultId = "resultAgraphml_" + result;
      resultAgraphmlElement.prop("id", resultId);
      resultAgraphmlElement.prop("class", "resultAgraphml");
      let resultNodes = new DataSet([]);
      let resultEdges = new DataSet([]);
      let resultContainer = document.querySelector("#" + resultId);
      let resultNetwork = new Network(resultContainer, {}, options);
      resultNetwork.setOptions({
        height: "180px",
        physics: {
          enabled: false,
        },
        interaction: {
          hover: false,
          dragNodes: false,
          selectable: false,
        },
        manipulation: {
          enabled: false,
        },
      });
      // add mappings view
      if (resultAgraphml.includes("<mappings>")) {
        jQuery("#resultMappings")
          .append('<div id="mappingsView_' + result + '" class="mappingsView hide"></div>');
        let res = resultAgraphml.split("],[");
        let query = res[0].substring(1);
        let graphml = res[1];
        let nameExists = graphml.includes('<data key="name">');
        let mappings = res[2].substring(0, res[2].length - 1);
        if (mappings.includes("no_mappings")) {
          let queryId = "query_" + result;
          let resultId = "result_" + result;
          jQuery("#mappingsView_" + result).append(
            '<div id="mappings_' + result + '" class="mappings hide">' +
              '<div class="mapping-header">Result ' + (result + 1) + '</div>' +
              '<agraphml id="' + queryId + '" class="mapping left"></agraphml>' +
              '<agraphml id="' + resultId + '" class="mapping right"></agraphml>' +
              controls + "</div>"
          );
          availableResultAgraphmls[resultId] = graphml;
          let containers = {
            containerQuery: document.querySelector("#" + queryId),
            containerResult: document.querySelector("#" + resultId),
          };
          createMappingsView(query, graphml, containers);
        } else {
          let json = mappings.substring(10, mappings.lastIndexOf("</mappings"));
          let allMappings = JSON.parse(json);
          let availableMappings = [];
          for (let queryType in queryTypes) {
            let mapping = allMappings[queryType];
            if (mapping !== undefined && mapping.length > 0) {
              for (let index = 0; index < mapping.length; index++) {
                let mp = mapping[index];
                let mps = JSON.stringify(mp);
                if (!availableMappings.includes(mps)) {
                  availableMappings.push(mps);
                  let queryId = "query_" + queryType + "_" + result + index;
                  let resultId = "result_" + queryType + "_" + result + index;
                  jQuery("#mappingsView_" + result).append(
                    '<div id="mappings_' + queryType + "_" + result + index +
                      '" class="mappings hide">' + '<div class="mapping-header">' +
                      queryTypes[queryType] + " " + (index + 1) + "</div>" +
                      '<agraphml id="' + queryId + '" class="mapping left"></agraphml>' +
                      '<agraphml id="' + resultId + '" class="mapping right"></agraphml>' +
                      controls + '</div>'
                  );
                  availableResultAgraphmls[resultId] = graphml;
                  let containers = {
                    containerQuery: document.querySelector("#" + queryId),
                    containerResult: document.querySelector("#" + resultId),
                  };
                  createMappingsView(query, graphml, containers, mp, queryType);
                }
              }
            }
          }
        }
        applyAgraphml(graphml, resultNodes, resultEdges, resultNetwork, "", nameExists ? 40 : 1);
        jQuery("#" + resultId + " .vis-manipulation").hide();
      } else {
        applyAgraphml(resultAgraphml, resultNodes, resultEdges, resultNetwork);
      }
    }
    jQuery(visualResultsContainer).show();
  });
};

let availableMappingNetworks = {};
const getNetworkForMapping = function (container) {
  let mappingNetwork = new Network(container, {}, options);
  mappingNetwork.setOptions({
    height: "600px",
    width: "650px",
    physics: {
      enabled: false,
    },
    manipulation: {
      enabled: false,
    },
  });
  availableMappingNetworks[container.id] = {
    network: mappingNetwork,
    fit: false,
  };
  return mappingNetwork;
};

const createMappingsView = function (query, result, containers, mapping, queryType) {
  let resultNodeIds = {};
  let queryNodeIds = {};
  if (queryType !== undefined && queryType !== "Graph_Match_Structure") {
    for (const [resultNodeId, queryNodeId] of Object.entries(mapping)) {
      let color = getRandomColor();
      resultNodeIds[resultNodeId] = color;
      queryNodeIds[queryNodeId] = color;
    }
  }
  let nameExists = result.includes('<data key="name">');
  applyAgraphml(query, new DataSet([]), new DataSet([]),
    getNetworkForMapping(containers.containerQuery), queryNodeIds);
  applyAgraphml(result, new DataSet([]), new DataSet([]),
    getNetworkForMapping(containers.containerResult), resultNodeIds, nameExists ? 40 : 1);
};

const showRetrievalResults = function (msg) {
  let loading = document.querySelector("#sendAgraphml .loading");
  loading.classList.remove("active");
  if (msg.indexOf("error") > -1) {
    loading.classList.add("error");
    renderResponse("form", "#retrievalMessages", msg);
    jQuery("#send2").prop("disabled", false).removeClass("disabled");
  } else if (msg.startsWith("<result>") || msg.startsWith("<?xml")) {
    document.querySelector("#output").classList.remove("hide");
    document.querySelector("#output").classList.add("show");
    loading.classList.add("ready");
    let resultCount = msg.match(/<\/tr>/g).length;
    jQuery("#result").css("width", resultCount * 250 + "px");
    renderResponse("tbody", "#result", msg);
    let applyMessage = 'You can continue with the search result on the right side as your current room configuration.';
    agraphmlToRoomConf(applyMessage);
    jQuery("tr").append('<td class="showExplanation">Info</td>');
  }
};

let closeOutput = document.querySelector("#closeOutput");
closeOutput.onclick = function () {
  document.querySelector("#output").classList.remove("show");
  document.querySelector("#output").classList.add("hide");
  jQuery("#send2").prop("disabled", false).removeClass("disabled");
  let loading = document.querySelector("#sendAgraphml .loading");
  loading.classList.remove("ready");
  // clear all available mapping networks
  for (const id of Object.getOwnPropertyNames(availableMappingNetworks)) {
    delete availableMappingNetworks[id];
  }
  // clear all clusters
  clearAllClusters();
  activateGetAutocompletion(true);
};

const showSuggestion = function (msg) {
  let loading = document.querySelector("#suggestion .loading");
  loading.classList.remove("active");
  renderResponse("div", "#suggestions", msg);
  if (msg.indexOf("error") > -1) {
    loading.classList.add("error");
    jQuery("#getSuggestion").prop("disabled", false).removeClass("disabled");
  } else {
    loading.classList.add("ready");
  }
  if (msg.indexOf("from") > -1) {
    let from = jQuery("from").text();
    let nodeFrom = nodes.get(from);
    // Re-adding x and y is necessary for node to appear at the same position
    let xFrom = nodeFrom.x;
    let yFrom = nodeFrom.y;
    nodeFrom.x = xFrom;
    nodeFrom.y = yFrom;
    nodeFrom.borderWidth = 6;
    nodeFrom.borderWidthSelected = 6;
    nodes.update(nodeFrom);
    jQuery("room1").css("background", nodeFrom.color);
    let to = jQuery("to").text();
    if (to !== "") {
      let nodeTo = nodes.get(to);
      let xTo = nodeTo.x;
      let yTo = nodeTo.y;
      nodeTo.x = xTo;
      nodeTo.y = yTo;
      nodeTo.borderWidth = 6;
      nodeTo.borderWidthSelected = 6;
      nodes.update(nodeTo);
      jQuery("room2").css("background", nodeTo.color);
    }
    let action = jQuery("action").text();
    if (action === "add") {
      let roomType = jQuery("roomType").text();
      let uuid = jQuery("uuidRoom").text();
      let newNode = {
        id: uuid,
        label: roomType,
        color: roomColors[roomType],
      };
      nodes.update(newNode);
      let uuidEdge1 = jQuery("uuidEdge1").text();
      let newEdge1 = {
        id: uuidEdge1,
        label: "EDGE",
        from: uuid,
        to: from,
      };
      edges.update(newEdge1);
      if (to !== "") {
        let uuidEdge2 = jQuery("uuidEdge2").text();
        let newEdge2 = {
          id: uuidEdge2,
          label: "EDGE",
          from: uuid,
          to: to,
        };
        edges.update(newEdge2);
      }
    }
  }
};

const resetSuggestion = function () {
  jQuery("#suggestions").children().remove();
  jQuery("#getSuggestion").prop("disabled", false).removeClass("disabled");
  jQuery("#suggestion .loading").removeClass("ready");
};

const addReplacements = function (adaptation) {
  let doc = jQuery.parseXML(adaptation);
  let xml = jQuery(doc);
  let replacements = xml.find("replacement");
  if (replacements.length > 0) {
    replacements.each(function (index) {
      let replacement = replacements[index];
      let oldRoom = jQuery(replacement).find("old").text();
      let newRoom = jQuery(replacement).find("new").text();
      try {
        let oldNode = nodes.get(oldRoom);
        let oldLabel = oldNode.label;
        xml.find("node#" + newRoom)
          .append("<replacement>" + oldLabel.replace("\n", " ") + "</replacement>");
      } catch (e) {
        userView.print("<adaptation>Some adaptations might be displayed incompletely.</adaptation>");
      }
    });
  }
  return xml.find("graphml").html();
};

let currentConfigAndAdaptations = [];
let closeAdaptation = document.querySelector("#closeAdaptation");

const drawAdaptation = function (msg) {
  let loading = document.querySelector("#adaptation .loading");
  loading.classList.remove("active");
  let agraphml = msg.substring(12, msg.lastIndexOf("</adaptation>"));
  if (agraphml.startsWith("<agraphml")) {
    loading.classList.add("ready");
    let currentConfig = head + getNodesAndEdges() + foot;
    let adaptationsAndReplacements = agraphml.split(";");
    let adaptations = [];
    adaptationsAndReplacements.forEach((adaptationAndReplacement) => {
      adaptations.push(addReplacements(adaptationAndReplacement));
    });
    adaptations.unshift(currentConfig);
    currentConfigAndAdaptations = adaptations;
    for (let i = 0; i < adaptations.length; i++) {
      let adaptation = i == 0 ? "Original" : "Adaptation " + i;
      jQuery("#adaptations")
        .append('<input type="radio" name="adaptations" value="'
        + i + '" id="adaptation_' + i + '"><label for="adaptation_'
        + i + '">' + adaptation + "</label><br>");
    }
    closeAdaptation.classList.remove("hide");
    closeAdaptation.classList.add("show");
  } else {
    loading.classList.add("error");
    renderResponse("div", "#adaptations", msg);
  }
};

closeAdaptation.onclick = function () {
  document.querySelector("#adaptation .loading").classList.remove("ready");
  document.querySelector("#adaptation .loading").classList.remove("error");
  closeAdaptation.classList.remove("show");
  closeAdaptation.classList.add("hide");
  jQuery("#adaptations").children().remove();
  jQuery("#getAdaptation").prop("disabled", false).removeClass("disabled");
};

const inspectZones = function(msg) {
  let zonesViewContainer = document.querySelector("#zonesViewContainer");
  showImmutableNetwork(immutableNetwork(zonesViewContainer), msg, "zones");
}

let availableZones = jQuery("#availableZones");
const appendNewZone = function () {
  availableZones.append('<div id="newZone" class="type zone">Add new zone</div>');
};

let zonesOverlay = document.querySelector("#zonesOverlay");
document.querySelector("#setZone").onclick = function () {
  let selectedNodes = zonesNetwork.getSelectedNodes();
  zonesOverlay.classList.remove("hide");
  availableZones.find(".type.zone").remove();
  Object.keys(groups).forEach((groupId) => {
    let allInSameGroup = true;
    for (let id of selectedNodes) {
      let groupIdOfNode = zonesNodes.get(id).group;
      if (groupIdOfNode !== groupId) {
        allInSameGroup = false;
        break;
      }
    }
    if (!allInSameGroup) {
      availableZones.append('<div class="type zone">' + groupId + "</div>");
    }
  });
  if (selectedNodes.length === 1) {
    let currentGroup = zonesNodes.get(selectedNodes[0]).group;
    if (groups[currentGroup].count > 1) {
      appendNewZone();
    }
  } else {
    appendNewZone();
  }
};

let zonesNetwork = immutableNetwork(document.querySelector("#zonesViewContainer"));
zonesNetwork.on("selectNode", function (params) {
  setZone.removeAttribute("disabled");
});
zonesNetwork.on("deselectNode", function (params) {
  if (zonesNetwork.getSelectedNodes().length === 0) {
    setZone.setAttribute("disabled", "disabled");
  }
});

let saveZone = document.querySelector("#saveZone");
saveZone.onclick = function () {
  let selectedNodes = zonesNetwork.getSelectedNodes();
  let newZone = jQuery(".type.zone.type-selected").get(0).innerHTML;
  if (newZone === "Add new zone") {
    newZone = (jQuery(".type.zone").length + 1).toString();
    groups[newZone] = {
      color: {
        background: getRandomColor(),
      },
      count: selectedNodes.length,
    };
  } else {
    let currentCount = groups[newZone].count;
    groups[newZone].count = currentCount + selectedNodes.length;
  }
  selectedNodes.forEach((id) => {
    let currentGroup = zonesNodes.get(id).group;
    let currentCount = groups[currentGroup].count;
    groups[currentGroup].count = currentCount - 1;
  });
  Object.keys(groups).forEach((groupId) => {
    if (groups[groupId].count <= 0) {
      delete groups[groupId];
    }
  });
  updateZonesLegend();
  zonesNodes.forEach((node) => {
    let newNode = node;
    let title = node.title;
    let newTitle = title.substring(0, title.lastIndexOf("Zone: ") + 6) + newZone;
    if (selectedNodes.includes(newNode.id)) {
      newNode.group = newZone;
      newNode.color = groups[newZone].color.background;
      newNode.title = newTitle;
    }
    zonesNodes.update(newNode);
  });
  zonesOverlay.classList.add("hide");
};

document.querySelector("#closeZonesOverlay").onclick = function () {
  zonesOverlay.classList.add("hide");
};

const initApp = function () {
  // read the config
  if (!config.retrieval) {
    document.querySelector("#sendAgraphml").classList.add("hide");
    document.querySelector("#output").classList.add("hide");
  }
  if (!config.suggestion) {
    document.querySelector("#suggestion").classList.add("hide");
  }
  if (!config.adaptation) {
    document.querySelector("#adaptation").classList.add("hide");
  }
  if (!config.autocompletion) {
    document.querySelector("#autocompletion").classList.add("hide");
  }
  // Initialize WebSocket
  if (config.retrieval || config.suggestion || config.adaptation || config.autocompletion) {
    req.init();
  }
};

const ready = function (fn) {
  if (document.readyState != "loading") {
    fn();
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
};

ready(initApp);

jQuery(function ($) {
  let useCbrCheck = $("#useCbr");
  let useCbrLabel = $("#useCbrLabel");
  let inspectZonesCheck = $("#inspectZones");
  let inspectZonesLabel = $("#inspectZonesLabel");
  let analyzeGraphCheck = $("#analyzeGraph");
  let analyzeGraphLabel = $("#analyzeGraphLabel");
  $(".retrievalSetting").on("change", function () {
    let settingId = $(this).prop("id");
    let checked = $(this).prop("checked");
    if (settingId === "useCbr") {
      if (checked) {
        inspectZonesCheck.prop("disabled", "disabled");
        analyzeGraphCheck.prop("disabled", "disabled");
        $("#send2").data("search-mode", "search-cbr");
      } else {
        inspectZonesCheck.prop("disabled", "");
        analyzeGraphCheck.prop("disabled", "");
        $("#send2").data("search-mode", "search-graphmatch");
      }
    } else if (settingId === "inspectZones") {
      if (checked) {
        useCbrCheck.prop("disabled", "disabled");
        analyzeGraphCheck.prop("checked", true);
        analyzeGraphCheck.prop("disabled", "disabled");
      } else {
        useCbrCheck.prop("disabled", "");
        analyzeGraphCheck.prop("disabled", "");
      }
    } else {
      if (checked) {
        useCbrCheck.prop("disabled", "disabled");
      } else {
        useCbrCheck.prop("disabled", "");
      }
    }
  });
  $(".sendQuery").on("click", function () {
    let continueSearch = $(this).prop("id") === "send3";
    let searchMode = $(this).data("search-mode");
    sendQuery(searchMode, continueSearch);
  });
  $("#getSuggestion").on("click", getSuggestion);
  $("#getAdaptation").on("click", getAdaptation);
  $("#getAutocompletion").on("click", getAutocompletion);
  $("#send4").on("click", getAutocompletionForBlocks);
  $("#result, #suggestion").on("click", "button", function () {
    $(this).siblings("p, ol").slideToggle(200);
  });
  $("#result, #suggestion").on("click", "button.see-more", function () {
    $(this).parent().parent()
      .siblings(".show-justification, .show-contexts, .show-stats").slideToggle(200);
  });
  $(".vis-close").remove();
  $("body").on("change", "#adaptations input", function () {
    let adaptationIndex = parseInt($(this).val());
    let selectedAdaptation = currentConfigAndAdaptations[adaptationIndex];
    applyAgraphml(selectedAdaptation, nodes, edges, network);
  });
  $("body").on("click", ".type", function () {
    let types = $(this).parents(".types").find(".type");
    types.removeClass("type-selected");
    $(this).addClass("type-selected");
  });
  $("body").on("click", "#accept", function () {
    resetSuggestion();
    toggleManipulation();
  });
  $("body").on("click", "#deny", function () {
    let uuid = $("uuidRoom").text();
    nodes.remove(uuid);
    resetSuggestion();
    toggleManipulation();
  });
  $("body").on("click", ".showExplanation", function () {
    let tr = $(this).parent();
    let tdFirst = tr.children("td").first();
    tdFirst.show();
    if (!tdFirst.hasClass("explanation")) {
      tdFirst.addClass("explanation");
      tr.append('<div class="closeExplanation">&times;</div>');
    } else {
      tr.children(".closeExplanation").show();
    }
  });
  $("body").on("click", ".closeExplanation", function () {
    $(this).siblings(".explanation").hide();
    $(this).hide();
  });
  $("#navigateOutput .navigate.right").on("click", function () {
    let scroll = $("#outputResults").scrollLeft();
    $("#outputResults").scrollLeft(scroll + 50);
  });
  $("#navigateOutput .navigate.left").on("click", function () {
    let scroll = $("#outputResults").scrollLeft();
    $("#outputResults").scrollLeft(scroll - 50);
  });
  const fitNetworks = function (mappingsEl) {
    mappingsEl.find(".mapping").each(function () {
      let id = $(this).prop("id");
      let n = availableMappingNetworks[id];
      if (!n.fit) {
        n.network.fit();
      }
    });
  };
  $("body").on("click", ".resultAgraphml", function () {
    $(this).addClass("selectedMapping");
    $("#resultMappings").removeClass("hide");
    let index = $(".resultAgraphml").index($(this));
    let mv = $(".mappingsView").eq(index);
    mv.removeClass("hide").addClass("active");
    let count = mv.find(".mappings").length;
    $("#totalMappings").text(count);
    $("#currentMapping").text("1");
    let mv0 = mv.find(".mappings").eq(0);
    mv0.removeClass("hide").addClass("active");
    fitNetworks(mv0);
  });
  const navigateMappings = function (direction) {
    let mpa = $(".mappingsView.active .mappings");
    let index = -2;
    mpa.each(function (i) {
      if ($(this).hasClass("active")) {
        index = i;
      }
    });
    let nextOrPrev = direction === "next" ? index + 1 : index - 1;
    if (nextOrPrev >= 0 && nextOrPrev < mpa.length) {
      let current = nextOrPrev + 1;
      $("#currentMapping").text(current);
      let mp = mpa.eq(nextOrPrev);
      mp.removeClass("hide").addClass("active");
      fitNetworks(mp);
      mpa.eq(index).removeClass("active").addClass("hide");
    }
  };
  $("#navigateMappings .navigate.right").on("click", function () {
    navigateMappings("next");
  });
  $("#navigateMappings .navigate.left").on("click", function () {
    navigateMappings("prev");
  });
  $("#autocompletionNotifier").on("click", function () {
    if (skipBlocks) {
      showAutocompletions();
      autocompletionsMsg = "";
    } else if (clusteringAgraphml !== "") {
      showClustering(clusteringAgraphml);
    }
    activateAutocompletionNotifier('hide');
  });
  $("#closeClustering").on("click", function () {
    closeClustering();
    clearAllClusters();
    activateGetAutocompletion(true);
  });
  $("#skipBlocks").on("change", function () {
    skipBlocks = $(this).prop("checked");
    if (skipBlocks) {
      $('#clusterings, #clusterCount').prop('disabled', true);
    } else {
      $('#clusterings, #clusterCount').prop('disabled', false);
    }
  });
  $("body").on("change", ".clusterSelect", function () {
    let checkedStates = new Set();
    $(".clusterSelect").each(function() {
      let c = $(this).prop("checked");
      checkedStates.add(c);
    });
    if (checkedStates.has(true)) {
      $("#send4").removeClass("disabled");
      $("#send4").prop("disabled", false);
    } else if (checkedStates.size === 1 && checkedStates.has(false)) {
      $("#send4").addClass("disabled");
      $("#send4").prop("disabled", true);
    }
  });
  $('#clusterings').on('change', function () {
    if ($(this).val() === 'distance-based' || $(this).val() === 'force-directed') {
      $('#distanceFunctionsWrapper').removeClass('hide');
      $('#clusterCountWrapper').addClass('hide');
    } else if ($(this).val() === 'hierarchical') {
      $('#distanceFunctionsWrapper').removeClass('hide');
      $('#clusterCountWrapper').removeClass('hide');
    } else {
      $('#distanceFunctionsWrapper').addClass('hide');
      $('#clusterCountWrapper').removeClass('hide');
    }
  });
  $("#closeMappings").on("click", function () {
    let rm = $("#resultMappings");
    rm.find(".active").removeClass("active").addClass("hide");
    rm.addClass("hide");
    $(".resultAgraphml").removeClass("selectedMapping");
    clearAllClusters();
  });
  $("#showRetrievalSettings").on("click", function () {
    $("#retrievalSettingsWrapper").toggleClass("hide");
  });
  $("body").on("click", ".applyRoomconf", function () {
    let controls = $(this).parents('.overViewControls').get(0);
    let mappingId = $(controls).siblings('.mapping.right').prop('id');
    applyRoomconf(mappingId);
    $("#closeMappings, #closeOutput").click();
  });
});
