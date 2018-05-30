/* Expose functions that act as schema
* Enforcing Nodes and Relationships
* Providing Utility functions to search and fetch
* Async returning promises of complete data
* Gun DB driver 0.00.001
*/

const sling = function (root) {
  this.root = root,
  this.createNode = function(obj) {
    console.log('created: ', obj)
  },
  this.createRel = function(obj1, obj2){
    console.log('createdRel from to: ', obj1, obj2);
  }
}
