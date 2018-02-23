/* Global requirement */
const ipcRenderer = require('electron').ipcRenderer
const remote = require('electron').remote
const fs = require('fs')

/* Global Object to capture all columns and to save who is where by id */
var Kanban = function () {
  this.columns = [],
  this.projects = [],
  this.add = function(item) {
    this.columns.push(item)
  },
  this.movColumn = function() {
    var cont = document.getElementById('container')
    if (cont.hasChildNodes()) {
      var children = cont.childNodes;
      var temp = this.columns
      this.columns = []
      for (var i = 0; i < children.length; i++) {
        for(var y=0; y<temp.length;y++){
          var testId = children[i].getAttribute("id")
          if(temp[y].id == testId){
            this.add(temp[y])
          }
        }
      }
    }
  },
  this.addProject = function(item) {
    var firstCol = this.columns[0].id
    this.projects.push({item:item, parentID: firstCol})
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
        console.log(`Found a match ${this.projects[i].item.id}`);
        this.projects.splice(i,1)
      }
    }
  },
  this.render = function() {
    var cont = document.getElementById("container")
    cont.innerHTML = '' //clear all columns
    this.columns.forEach( (el, ind) => {
      var name = el.name
      var id = el.id
      var col = document.createElement("div")
      col.setAttribute("class","column")
      col.setAttribute("draggable","true")
      col.setAttribute("ondragstart","drag(event)")
      col.setAttribute("ondrop","onDrop(event)")
      col.setAttribute("ondragover","onDragOver(event)")
      col.setAttribute("id", id)
      var title = document.createElement("div") //render name as title
      title.setAttribute("class","title")
      title.innerHTML = name
      col.appendChild(title)
      //check if a project is saved in this column, then append it
      for(let i =0; i < this.projects.length;i++){
        if(this.projects[i].parentID == id) {
          let tempP = this.projects[i].item
          let tempH = document.createElement("div")
          tempH.setAttribute("class", "card")
          tempH.setAttribute("draggable","true")
          tempH.setAttribute("ondragstart","drag(event)")
          tempH.setAttribute("ondblclick", "del(event)") /* Think about changing*/
          tempH.setAttribute("id", tempP.id)
          tempH.innerHTML = tempP.name + "<br>" + tempP.ord + "<br>" + tempP.contr
          col.appendChild(tempH)
        }
      }
      cont.appendChild(col)
    })
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
  var id = gkanban.columns.length
  var col = new Column(id, name.value)
  gkanban.add(col)
  name.value = ''
  gkanban.render()
}

/* Function to create new Project */
var newProj = function () {
  makeInvisi('projM')
  var id = gkanban.projects.length
  var name = document.getElementById("prj")
  var ord = document.getElementById("ord")
  var contr = document.getElementById("contr")
  var contrd = parseDate(contr.value)
  contrd = contrd.toDateString()
  let proj = new Project(id, name.value, ord.value, contrd)
  name.value = ''
  ord.value = ''
  contr.value = ''
  gkanban.addProject(proj)
  gkanban.render()
}


/* Parse Date Function */
function parseDate (text) {
  var b = text.split("-");
  return new Date(b[0], --b[1], b[2]);
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
  ev.dataTransfer.dropEffect = "move"
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
      console.log(`Column ${data} moved`);
      ev.target.appendChild(movedObject)
      gkanban.movColumn()
      gkanban.render()
    }
  } else if(movedObject.className == "card") {
    if (ev.target.className == "column") {
      console.log(`Card ${data} moved`)
      ev.target.appendChild(movedObject)
      gkanban.movProject(data, ev.target.id)
    }
  }
}

function del(ev) {
  gkanban.delProject(event.target.id)
  gkanban.render()
}

/* Loading and Saving data file */
function backup() {
  var data = JSON.stringify(gkanban)
  console.log(`backed up: ${data}`);
  fs.writeFileSync('kanbanBackup.pxx', data, 'utf8')
  gkanban.render()
}

function loadBackup() {
  fs.readFile('kanbanBackup.pxx', 'utf8', (err, data) => {
    if(err){console.log(err)} //Handle Error so it doesn't stop execution
    console.log(`Loaded from backup ${data}`);
    var data = JSON.parse(data)
    Object.assign(gkanban, data)
    gkanban.render()
  })
}


document.addEventListener("DOMContentLoaded", (event) => {
  fs.readFile('kanban.pxx', 'utf8', (err, data) => {
    if(err){console.log(err)} //Handle Error so it doesn't stop execution
    console.log(`Loaded ${data}`);
    var data = JSON.parse(data)
    Object.assign(gkanban, data)
    gkanban.render()
  })
})

window.addEventListener("beforeunload", (event) => {
  var data = JSON.stringify(gkanban)
  console.log(`Saved: ${data}`);
  fs.writeFileSync('kanban.pxx', data, 'utf8')
  return false
})
