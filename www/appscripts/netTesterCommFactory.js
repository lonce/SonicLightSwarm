define(
	[],
	function(){


	return function () {

		var host = document.location.host;
		var ws = new WebSocket('ws://' + host);

		//console.log("host is " + host);

		//List of messages we can handle from the server (and other clients via the server)
		var callbacks = {};
		var registerCallback = function (name, callback) {
			callbacks[name] = callback;
		};


		ws.addEventListener('message', function(e){receiveJSONmsg.call(ws, e.data)});

		var receiveJSONmsg = function (data, flags) {
			var obj;
			try {
				obj = JSON.parse(data);
			} catch (e) {
				return;
			}
			//console.log("received message ",  obj);
			// All messages should have 
			//	.n - name of method to call (this is the "message"),
			//	.d - the data payload (methods must know the data they exepct)
			//	.s - an id of the remote client sending the message

			if (!obj.hasOwnProperty('d') || !obj.hasOwnProperty('n') || callbacks[obj.n] === undefined)
				return;
			callbacks[obj.n].call(this, obj.d, obj.s);
		}

		// For sending local client events to the server
		var sendJSONmsg = function (name, data) {
			if (!(ws.readyState===1)){
				console.log("still waiting for connection");
				return;
			}
			ws.send(JSON.stringify({n: name, d: data}));//, {mask: true});
		};


		var joinRoom=function( myRoom){

				// unsubscribe to previous room, join new room
				if (myRoom != undefined) sendJSONmsg("unsubscribe", [myRoom]);
	    		myRoom  = "default_room";
				if (myRoom != undefined) {
					console.log("joinRoom: joing a room named " + myRoom ); 
					sendJSONmsg("subscribe", [myRoom]);
					// Tell everybody in the room to restart their timers.
					sendJSONmsg("startTime", []);
				} 
			}


		return { 
			host: host,
			registerCallback: registerCallback,
			sendJSONmsg: sendJSONmsg,
			joinRoom: joinRoom
		};
	}
}
);


