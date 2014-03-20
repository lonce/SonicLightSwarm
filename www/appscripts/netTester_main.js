/* This application does simple "event chat". Here, events are mouse clicks on a canvas. 
	There is also a metronome tick that comes the server (totally unrelated to the event chat functionality).
	We register for the following messages:
		init - sent by the server after the client connects. Data returned is an id that the server and other clients will use to recognizes messages from this client.
		mouseContourGesture - sent when select chatroom member generates a mouse click. Data is x, y of their mouse position on their canvas.
		metroPulse - sent by the server evdispPxery second to all chatroom members. Data is the server Date.now.
		startTime  - sent when another chatroom member requests a new time origin. Data is the server Date.now.
*/

require.config({
	paths: {
	}
});
require(
	["require", "netTesterCommFactory", "utils", "touch2Mouse",       "config"],

	function (require, netTesterCommFactory, utils, touch2Mouse, config ) {

	
		var mouse_down=false;


		        var latitude=0;
		        var longitude=0;
		        var accuracy=0;




        var myrequestAnimationFrame = utils.getRequestAnimationFrameFunc();

		var timeOrigin=Date.now();
		var serverTimeOrigin=0;
		var serverTime=0;
		var myID=0;
		var myRoom=undefined;
		var displayElements = [];  // list of all items to be displayed on the score
		var colorIDMap=[]; // indexed by client ID
		var current_remoteEvent=[]; // indexed by client ID



		var m_lastDisplayTick=0;
		var m_tickCount=0;
		var k_timeDisplayElm=window.document.getElementById("timeDisplayDiv");

		var current_mgesture=undefined;
		var last_mousemove_event; // holds the last known position of the mouse over the canvas (easier than getting the position of a mouse that hasn't moved even though the score underneath it has....)
		var current_mgesture_2send=undefined; // used to send line segments being drawn before they are completed by mouse(finger) up. 

		var lastSendTimeforCurrentEvent=0; 
		var sendCurrentEventInterval=100;  //can't wait till done drawing to send contour segments

		var k_minLineThickness=1;
		var k_maxLineThickness=16; // actually, max will be k_minLineThickness + k_maxLineThickness

		var radioSpray = window.document.getElementById("radioSpray"); 
		var radioContour = window.document.getElementById("radioContour");
		var radioText = window.document.getElementById("radioText");



		var toggleYLockP=0;
		var yLockVal;





		var toggleTimeLockP=0;



	
		var toggleSoundState=1;





		var radioSelection = "contour"; // by default

		window.addEventListener("keydown", keyDown, true);

		function keyDown(e){
         		var keyCode = e.keyCode;
         		switch(keyCode){
         			case 83:
         				if (e.ctrlKey==1){
         					//alert("control s was pressed");
         					e.preventDefault();
							
         				}
				}
		}

	


		var k_sprayPeriod = 100;// ms between sprayed events
		var m_lastSprayEvent = 0; // time (rel origin) of the last spray event (not where on the score, but when it happened. 


		//---------------------------------------------------------------------------
		var comm = []; 

		var joinfunc=function(i){
			var c =comm[i];
			return function(data){
					myID=data[0];
					console.log("Server acknowledged, assigned me this.id = " + myID);
					colorIDMap[myID]="#00FF00";

					c.joinRoom();
			}
		}

		for (i=0;i<30;i++){
			comm[i]=netTesterCommFactory();


				// init is called just after a client navigates to the web page
				// 	data[0] is the client number we are assigned by the server.
				comm[i].registerCallback('init', joinfunc(i));
				//---------------------------------------------------------------------------
				// data is [timestamp (relative to "now"), x,y] of contGesture, and src is the id of the clicking client
				comm[i].registerCallback('contGesture', function(data, src) {
					if (data.length === 0) console.log("Got contour event with 0 length data!");

					console.log("got continue gesture with data x=" + data.d[0][0] + ", and y=" + data.d[0][1]);
					m_sls.x=data.d[0][0];
					m_sls.y=data.d[0][1];
			
				});
						//---------------------------------------------------------------------------
				// data is [timestamp (relative to "now"), x,y] of mouseContourGesture, and src is the id of the clicking client
				comm[i].registerCallback('beginGesture', function(data, src) {
					var fname;

					m_sls.x=data.d[0][0];
					m_sls.y=data.d[0][1];

					//console.log("got begin gesture with data x=" + data.d[0][0] + ", and y=" + data.d[0][1]);

				});


				//---------------------------------------------------------------------------
				// data is [timestamp (relative to "now"), x,y] of mouseContourGesture, and src is the id of the clicking client
				comm[i].registerCallback('endGesture', function(data, src) {


					console.log("got end gesture")
				});

				//---------------------------------------------------------------------------
				comm[i].registerCallback('metroPulse', function(data, src) {
					serverTime=data;
					// check server elapsed time again client elapsed time
					//console.log("on metropulse, server elapsed time = " + (serverTime-serverTimeOrigin) +  ", and client elapsed = "+ (Date.now() - timeOrigin ));
				});
				//---------------------------------------------------------------------------
				comm[i].registerCallback('startTime', function(data) {
					//console.log("server startTime = " + data[0] );


					
					timeOrigin=Date.now();
					lastSendTimeforCurrentEvent= -Math.random()*sendCurrentEventInterval; // so time-synched clients don't all send their countour chunks at the same time. 
					serverTimeOrigin=data[0];
					m_lastDisplayTick=0;
					displayElements=[];		

				});
				//---------------------------------------------------------------------------
				// Just make a color for displaying future events from the client with the src ID
				comm[i].registerCallback('newmember', function(data, src) {
					//console.log("new member : " + src);
					colorIDMap[src]=utils.getRandomColor1(100,255,0,120,100,255);

				});
				//---------------------------------------------------------------------------
				// src is meaningless since it is this client
				comm[i].registerCallback('roommembers', function(data, src) {
					if (data.length > 1) 
							console.log("there are other members in this room!");
					for(var i=0; i<data.length;i++){
						if (data[i] != myID){
							colorIDMap[data[i]]=utils.getRandomColor1(100,255,0,120,100,255);
						}
					}
				});
		}
		console.log("New comm guys all initiated.");


		//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		// Client activity
		//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		var mouseX;
		var mouseY;


		var lastDrawTime=0;
		var t_sinceOrigin;





//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++



		function endContour(){
			//console.log("current event is " + current_mgesture + " and the data length is " + current_mgesture.d.length);
			current_mgesture.b=current_mgesture.d[0][0];
			//console.log("contour length is " + current_mgesture.d.length);
			current_mgesture.e=current_mgesture.d[current_mgesture.d.length-1][0];
			//console.log("gesture.b= "+current_mgesture.b + ", and gesture.e= "+current_mgesture.e);
			
			if (myRoom != undefined) {
				console.log("sending event");
				if (current_mgesture_2send){
					if (current_mgesture_2send.d.length > 0){
						comm[0].sendJSONmsg("contGesture", current_mgesture_2send.d);
					}
					comm[0].sendJSONmsg("endGesture", []);
				}	
			}
			current_mgesture=undefined;
			current_mgesture_2send=undefined;
		}
	
		// Record the time of the mouse event on the scrolling score
		function onMouseDown(e){
			event.preventDefault();

			mouse_down=true;


		}

		function onMouseUp(e){
			mouse_down=false;

		}

		function onMouseMove(e){

		}


		//	++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		var t_myMachineTime;
		var t_count=0;
		var timerLoop = function(){

			t_myMachineTime = Date.now();
			t_sinceOrigin = t_myMachineTime-timeOrigin;
			



			// create a display clock tick every 1000 ms
			while ((t_sinceOrigin-m_lastDisplayTick)>1000){  // can tick more than once if computer went to sleep for a while...
				m_tickCount++;
				m_lastDisplayTick += 1000;

				//console.log("displayElements length is " + displayElements.length)
				if (displayElements.length >2){
					var foo = 4;
				}
			}

			//-----------  if an event is in the middle of being drawn, send it every sendCurrentEventInterval
			// send current event data periodically (rather than waiting until it is complete)
			//console.log("time since origin= " + t_sinceOrigin + ", (t_sinceOrigin-lastSendTimeforCurrentEvent) = "+ (t_sinceOrigin-lastSendTimeforCurrentEvent));
			if ((current_mgesture_2send!=undefined) && ((t_sinceOrigin-lastSendTimeforCurrentEvent) > sendCurrentEventInterval)){
				//console.log("tick " + t_sinceOrigin);
				if (myRoom != undefined) {
					//console.log("sending event");
					if (current_mgesture_2send.d.length > 0)
						comm[0].sendJSONmsg("contGesture", current_mgesture_2send.d);
				}
				current_mgesture_2send.d=[];
 				lastSendTimeforCurrentEvent=t_sinceOrigin;
			}
			
			//--------------------------------------------------------

			myrequestAnimationFrame(timerLoop);
		};

		timerLoop();  // fire it up

		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

		// INITIALIZATIONS --------------------
		//radioContour.checked=true; // initialize
		//setTab("contourTab");

		window.onbeforeunload = function (e) {
			if (myRoom != undefined) comm[0].sendJSONmsg("unsubscribe", [myRoom]);
		}

	}
);