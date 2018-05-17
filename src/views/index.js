/* Global requirement */
const ipcRenderer = require('electron').ipcRenderer
const remote = require('electron').remote
const fs = require('fs')
var Gun = require('gun/gun')
const $ = require("jquery")
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

var kanbanData = gun.get('kanban')
kanbanData.put({type:'root',id:'0'})

/*** Gun Helper Functions */

/* Get all columns and projects from database for rendering*/
function getData() {
  $('.container').empty()
  kanbanData.map().once((node,key)=>{
    if(node && node.type == 'column'){
      var title = $("<div></div>").text(node.name).attr('class','title').attr('ondblclick',"edit(event, 'col')")
      var column = $("<div></div>").attr('class','column').attr('id',node.id).attr('ondrop',"onDrop(event)").attr('ondragover',"onDragOver(event)")
      column.append(title)
      $('.container').append(column)
    } else if (node && node.type == 'project') {
      var card = $('<div></div>').attr('class','card').attr('id', node.id).attr('draggable',"true").attr('ondragstart',"drag(event)").attr('ondblclick',"edit(event, 'proj')")
      card.html(node.name+"<br>"+node.ord+"<br>"+node.contr)
      $("#"+node.parent).append(card)
    }
  })
}


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
  this.add = function(item) {
    item.type = 'column'
    kanbanData.get(item.id).put(item)
    this.render()
  },
  this.delColumn = function (id){
    /*kanbanData.get(id).put(null)
    this.render()*/ /* add disallowing delete if children reference */
  },
  this.hasChild = function (id) {
    /* find a way to quickly check */
  },
  this.editColumn = function (id, col){
    kanbanData.get(id).put(col)
    this.render()
  },
  this.getNextColID = function() {
    var d = new Date()
    return d.getTime()
  },
  this.addProject = function(item) {
    console.log('adding item: ', item);
    var firstCol = this.columns[0].id
    item.type = 'project'
    item.parent = firstCol
    kanbanData.get(item.id).put(item)
    this.render()
  },
  this.getNextPrID = function() {
    var d = new Date()
    return d.getTime()
  },
  this.movProject = function(idChild, idParent) {
    kanbanData.get(idChild).put({parent: idParent})
    this.render()
  },
  this.delProject = function(id) {
    kanbanData.get(id).put(null)
    this.render()
  },
  this.editProject = function(item) {
    kanbanData.get(item.id).put(item)
    this.render()
  },
  this.render = function(){
    getData() /* async function to get and render data */
  }
}

const gkanban = new Kanban()
gkanban.render()

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
* Name from Input, New id from gkanban
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
    kanbanData.get(event.target.id).once((node, key)=>{
      var id = document.getElementById("idProj")
      id.value = node.id
      var proj = document.getElementById("prjEdit")
      proj.value = node.name
      var ord = document.getElementById("ordEdit")
      ord.value = node.ord
      var contr = document.getElementById("contrEdit")
      contr.value = node.contr
      makeVisi('projEM')
    })
  } else if (typeCR == "col") {
    console.log(event.target.parentNode.id);
    kanbanData.get(event.target.parentNode.id).once((node, key)=>{
      var id = document.getElementById("idCol")
      id.value = node.id
      var inputCol = document.getElementById("inputCol")
      inputCol.value = node.name
      makeVisi('colEM')
    })
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
  gkanban.editProject(temp)
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
/*
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
*/
