/* Global requirement */
const ipcRenderer = require('electron').ipcRenderer
const remote = require('electron').remote
const fs = require('fs')
var Gun = require('gun/gun')
require('gun/lib/unset.js')
require('gun-file')

/* Setting up Gun instance */
localStorage.clear()

var gun = new Gun( {
  'file-name': 'data.ppx',
  'file-mode' : 0666,
  'file-pretty' : true,
  'file-delay' : 100,
  file : false
})

/* Setting up root node for Kanban Data */

var kanbanData = gun.get('kanban').put({type:'root',id:'0'})

/*** Gun Helper Functions */

/* print function to print from once for easy debug */
function print(x,y) {
  console.log(`${y} : ${x}`)
}

/* Quick function to make a two-way link */
function linkItem (originId, originRoot, linkId, linkRoot) {
  originRoot.get(originId).get('linked').set(linkRoot.get(linkId))
  linkRoot.get(linkId).get('linked').set(originRoot.get(originId))
}


/*** Global Object to capture all columns and to save who is where by id */
var Kanban = function () {
  this.columns = [],
  this.projects = [],
  this.add = function(item) {
    this.columns.push(item)
    kanbanData.get(item.id).put(item)
  },
  this.delColumn = function (id){
    if(!this.hasChild(id)) {
      for(let i=0;i<this.columns.length;i++){
        if(id == this.columns[i].id){
          this.columns.splice(i,1)
        }
      }
    } else {
      console.log("None Empty");
    }
  },
  this.hasChild = function (id) {
    var temp = false;
    for(let i=0;i<this.projects.length;i++) {
      if(id == this.projects[i].parentID){
        temp = true
      }
    }
    return temp
  }
  this.getColumn = function (id){
    for(let i=0;i<this.columns.length;i++){
      if(id == this.columns[i].id){
        return this.columns[i]
      }
    }
  },
  this.editColumn = function (id, col){
    for(let i=0;i<this.columns.length;i++){
      if(id == this.columns[i].id){
        this.columns[i].name = col.name
      }
    }
  },
  this.getNextColID = function() {
    if(this.columns.length != 0){
      var last = this.columns[this.columns.length -1]
      var number = new Number(last.id.slice(1))
      return number + 1
    } else {
      return 0
    }
  },
  this.addProject = function(item) {
    var firstCol = this.columns[0].id
    this.projects.push({item:item, parentID: firstCol})
  },
  this.getNextPrID = function() {
    if(this.projects.length != 0){
      var last = this.projects[this.projects.length -1]
      var number = new Number(last.item.id.slice(1))
      return number + 1
    } else {
      return 0
    }
  },
  this.movProject = function(idChild, idParent) {
    for(let i=0; i < this.projects.length;i++) {
      if(idChild == this.projects[i].item.id){
        if(idParent){
          console.log(`Changing ${this.projects[i].parentID} to`);
          this.projects[i].parentID = idParent
          console.log(`${this.projects[i].parentID} as parent`);
        }
      }
    }
  },
  this.delProject = function(id) {
    for(let i=0;i<this.projects.length;i++) {
      if(id == this.projects[i].item.id){
        this.projects.splice(i,1)
      }
    }
  },
  this.getProject = function(id) {
    for(let i=0;i<this.projects.length;i++) {
      if(id == this.projects[i].item.id){
        return this.projects[i].item
      }
    }
  },
  this.editProject = function(id, proj) {
    for(let i=0;i<this.projects.length;i++) {
      if(id == this.projects[i].item.id){
        this.projects[i].item = proj
      }
    }
  }
}

const gkanban = new Kanban()

/**
* Project Object for purpose of saving and keeping track of
* id = system tracker of id
* name = Project name
* ord = order number or other text
* contr = contract date or other date
*/
var Project = function (id, name, ord, contr) {
  this.id = "p" + id,
  this.name = name,
  this.ord = ord,
  this.contr= contr
}

/**
* Column Object for purposes of saving and keeping track of
* id = system tracker of id
* name = display name
*/
var Column = function (id, name) {
  this.id = "c" + id,
  this.name = name
}

/* Argument ID of DOM object to make visible */
var makeVisi = function (id) {
  var id = id
  var field = document.getElementById(id)
  field.style.display = "flex"
}

/* Argument ID of DOM object to make invisible (hide) */
var makeInvisi = function (id) {
  var id = id
  var field = document.getElementById(id)
  field.style.display = "none"
}

/**
* Function to create new columns
* Name from Input, New id from gKanban
*/
var newCol = function () {
  makeInvisi('colM')
  var name = document.getElementById("input")
  var id = gkanban.getNextColID()
  var col = new Column(id, name.value)
  gkanban.add(col)
  name.value = ''
}

var cancelCol = function() {
  makeInvisi('colM')
  name.value = ''
}

/* Function to create new Project */
var newProj = function () {
  makeInvisi('projM')
  var id = gkanban.getNextPrID()
  var name = document.getElementById("prj")
  var ord = document.getElementById("ord")
  var contr = document.getElementById("contr")
  var contrd = parseDate(contr.value)
  let proj = new Project(id, name.value, ord.value, contrd)
  name.value = ''
  ord.value = ''
  contr.value = ''
  gkanban.addProject(proj)
}

var cancelProj = function() {
  makeInvisi('projM')
  name.value = ''
  ord.value = ''
  contr.value = ''
}


/* Parse Date Function */
function parseDate (text) {
  return text
}

/* Drag and Drop Functions */

function onDragOver(ev) {
  ev.preventDefault()
  ev.dataTransfer.dropEffect = "move"
}

function dropabble(ev) {
 ev.preventDefault();
}

function drag(ev) {
  ev.dataTransfer.setData("text/plain", ev.target.id)
}

/*
*function onDrop (document event)
* called whenever an item is dropped into a 'droppable' zone
* If a column is dropped, only move it if the target is the container
* If a 'card' is dropped, only move it into a column
* Save the new order of columns, and render or write the info to
* gkanban to save where the new 'card' is now at.
*/

/*
*ToDo
* find a spot for:
  this.insertAdjacentHTML('beforebegin',dropHTML);
      var dropElem = this.previousSibling;
      addDnDHandlers(dropElem);

    }
    this.classList.remove('over');
    return false;
  }
*/

function onDrop(ev) {
  ev.preventDefault()
  var data = ev.dataTransfer.getData("text/plain")
  var movedObject = document.getElementById(data)
  if (movedObject.className == "column") {
    if (ev.target.id == "container") {
      console.log(`Column ${data} cannot be moved`);
      /* Obsolete due to vue ordering columns by column id */
    }
  } else if(movedObject.className == "card") {
    if (ev.target.className == "column") {
      console.log(`Card ${data} moved`)
      gkanban.movProject(data, ev.target.id)
    }
  }
}

/*
* Function that opens a menu depending if the edited Item is a col or a row
* and proceeds to fillout the input fields with the values of the item,
* to allow for editing
*/
function edit(event, typeCR) {
  console.log(event.target.id)
  if(typeCR == "proj") {
    var project = gkanban.getProject(event.target.id)
    var id = document.getElementById("idProj")
    id.value = project.id
    var proj = document.getElementById("prjEdit")
    proj.value = project.name
    var ord = document.getElementById("ordEdit")
    ord.value = project.ord
    var contr = document.getElementById("contrEdit")
    contr.value = project.contr
    makeVisi('projEM')
  } else if (typeCR == "col") {
    console.log(event.target.parentNode.id);
    var column = gkanban.getColumn(event.target.parentNode.id)
    var id = document.getElementById("idCol")
    id.value = column.id
    var inputCol = document.getElementById("inputCol")
    inputCol.value = column.name
    makeVisi('colEM')
  }
}
/*
* Functions to save, delete or cancel the Edit Menu
*/

var saveProj = function () {
  var id = document.getElementById("idProj")
  id = id.value
  var idtemp = id.slice(1)
  var proj = document.getElementById("prjEdit")
  proj = proj.value
  var ord = document.getElementById("ordEdit")
  ord = ord.value
  var contr = document.getElementById("contrEdit")
  contr = contr.value
  var temp = new Project(idtemp, proj, ord, contr)
  gkanban.editProject(id, temp)
  cancelProjEM()
}

var delProj = function () {
  var id = document.getElementById("idProj")
  id = id.value
  gkanban.delProject(id)
  cancelProjEM()
}

var cancelProjEM = function () {
  var id = document.getElementById("idProj")
  id.value = ''
  var proj = document.getElementById("prjEdit")
  proj.value = ''
  var ord = document.getElementById("ordEdit")
  ord.value = ''
  var contr = document.getElementById("contrEdit")
  contr.value = ''
  makeInvisi('projEM')
}

var saveCol = function () {
  var id = document.getElementById("idCol")
  id = id.value
  var idtemp = id.slice(1)
  var inputCol = document.getElementById("inputCol")
  inputCol = inputCol.value
  var temp = new Column (idtemp, inputCol)
  gkanban.editColumn(id, temp)
  cancelColEM()
}

var delCol = function () {
  var id = document.getElementById("idCol")
  id = id.value
  gkanban.delColumn(id)
  cancelColEM()
}

var cancelColEM = function () {
  var id = document.getElementById("idCol")
  id.value = ''
  var inputCol = document.getElementById("inputCol")
  inputCol.value = ''
  makeInvisi('colEM')
}

/* Loading and Saving data file */
function backup() {
  var data = JSON.stringify(gkanban)
  console.log(`backed up: ${data}`);
  fs.writeFileSync('kanbanBackup.pxx', data, 'utf8')
}

function loadBackup() {
  fs.readFile('kanbanBackup.pxx', 'utf8', (err, data) => {
    if(err){console.log(err)} //Handle Error so it doesn't stop execution
    console.log(`Loaded from backup ${data}`);
    var data = JSON.parse(data)
    Object.assign(gkanban, data)
  })
}


document.addEventListener("DOMContentLoaded", (event) => {
  fs.readFile('kanban.pxx', 'utf8', (err, data) => {
    if(err){console.log(err)} //Handle Error so it doesn't stop execution
    console.log(`Loaded ${data}`);
    var data = JSON.parse(data)
    Object.assign(gkanban, data)
  })
})

window.addEventListener("beforeunload", (event) => {
  var data = JSON.stringify(gkanban)
  console.log(`Saved: ${data}`);
  fs.writeFileSync('kanban.pxx', data, 'utf8')
  return false
})

/*
* Vue instance created using global object. Let's try this
*/


var vm = new Vue({
  el: "#container",
  data: gkanban
})
