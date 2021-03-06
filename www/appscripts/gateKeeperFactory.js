// var gate = gateKeeprFactory(["g1", "g2", "g3"], cb);
//    then after gate.set("g") has been called with each of the gate strings, cb() is called.

define(
  [],
  function(){
  	return gateKeeperFactory=function(i_locks, cb){ // array of string messages that must be passed to set() before gate opens
  		var gate = {
  			lockOpen: (function(){var k=[]; for(var i=0;i<i_locks.length;i++)k[i]=false;return k;}()),
  			test: function(){ // true iff all lockOpen are true
  				for(var i=0;i<i_locks.length;i++){
  					if (this.lockOpen[i]===false){
  						return false;
  					} 
  				}
  				return true;
  			},
  			set: function(key){
  				var idx = i_locks.indexOf(key); 
  				if (idx>=0){
  					this.lockOpen[idx]=true;
  				};
  				if (this.test()) {
  					cb && cb();
  					return true; 
  				} else return false;
  			}
  		};
  		return gate;
  	}
  }
 );