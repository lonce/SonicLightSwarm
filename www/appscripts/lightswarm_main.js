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
		"jsaSound": (function(){
			if (! window.document.location.hostname){
				alert("This page cannot be run as a file, but must be served from a server (e.g. animatedsoundworks.com:8001, or localhost:8001)." );
			}
				// hardcoded to read sounds served from jsaSound listening on port 8001 (on the same server as the AnticipatoryScore server is running)
				//var host = "http://"+window.document.location.hostname + ":8001";
				// get sound models from the cloud
				host = "http://"+"animatedsoundworks.com" + ":8001";
				//alert("Will look for sounds served from " + host);
				return (host );
			})()
	}
});
require(
	["require", "comm", "utils", "touch2Mouse",  "soundbank",  "scoreEvents/scoreEvent",  "agentPlayer", "config", "lightswarmConfig"],

	function (require, comm, utils, touch2Mouse,  soundbank, scoreEvent,  agentPlayer, config, lightswarmConfig) {

		var mouse_down=false;

		var m_agent;
		lightswarmConfig.report(function(){
			if (lightswarmConfig.player === "agent"){
				console.log("you will play with (or as) an agent");
				m_agent=agentPlayer();
			} else {
				console.log("you are playing as a human");
			}

			// unsubscribe to previous room, join new room
			if (myRoom != undefined) comm.sendJSONmsg("unsubscribe", [myRoom]);
    		myRoom  = lightswarmConfig.room;
			if (myRoom != undefined) {
				console.log("lightswarmConfig.report: joing a room named " + myRoom); 
				comm.sendJSONmsg("subscribe", [myRoom]);
				// Tell everybody in the room to restart their timers.
				comm.sendJSONmsg("startTime", []);
			} 
		});

		// secret keyboard shortcuts to play as agent (Ctl-Shift-A, or as human Ctl-Shift-H)
		window.addEventListener("keydown", keyDown, true);
		function keyDown(e){
         		//var keyCode = e.keyCode;
         		var charCode = (typeof e.which == "number") ? e.which : e.keyCode;
         		switch(charCode){
         			case 72: // h
         				if ((e.ctrlKey)&&(e.shiftKey)){
         					//alert("control s was pressed");
							m_agent=undefined;
         				}
         				break;
     				case 65: //a
         				if ((e.ctrlKey)&&(e.shiftKey)){
         					m_agent=agentPlayer();
         				}
         				break;
				}
		}

		var playButton = window.document.getElementById("playButton");
		var stopButton = window.document.getElementById("stopButton");

		playButton.onclick=function(){
			console.log("play");
			comm.sendJSONmsg("play", []);
		}

		stopButton.onclick=function(){
			console.log("stop");
			comm.sendJSONmsg("stop", []);
		}




        var myrequestAnimationFrame = utils.getRequestAnimationFrameFunc();

		var timeOrigin=Date.now();
		var serverTimeOrigin=0;
		var serverTime=0;
		var myID=0;
		var myRoom=undefined;
		var displayElements = [];  // list of all items to be displayed on the score
		var colorIDMap=[]; // indexed by client ID
		var current_remoteEvent=[]; // indexed by client ID

		var g_selectModeP = false;
		var m_selectedElement = undefined;

		var m_lastDisplayTick=0;
		var m_tickCount=0;
		var k_timeDisplayElm=window.document.getElementById("timeDisplayDiv");

		var current_mgesture=undefined;
		var last_mousemove_event={
			"x":0,
			"y":0
		}; // holds the last known position of the mouse over the canvas (easier than getting the position of a mouse that hasn't moved even though the score underneath it has....)
		var current_mgesture_2send=undefined; // used to send line segments being drawn before they are completed by mouse(finger) up. 

		var lastSendTimeforCurrentEvent=0; 
		var sendCurrentEventInterval=100;  //can't wait till done drawing to send contour segments

		var k_minLineThickness=1;
		var k_maxLineThickness=16; // actually, max will be k_minLineThickness + k_maxLineThickness





		var k_sprayPeriod = 100;// ms between sprayed events
		var m_lastSprayEvent = 0; // time (rel origin) of the last spray event (not where on the score, but when it happened. 


		//---------------------------------------------------------------------------
		// init is called just after a client navigates to the web page
		// 	data[0] is the client number we are assigned by the server.
		comm.registerCallback('init', function(data) {
			//pong.call(this, data[1]);
			myID=data[0];
			console.log("Server acknowledged, assigned me this.id = " + myID);
			colorIDMap[myID]="#00FF00";

		});
		//---------------------------------------------------------------------------
		// data is [timestamp (relative to "now"), x,y] of contGesture, and src is the id of the clicking client
		comm.registerCallback('contGesture', function(data, src) {
			current_remoteEvent[src].d = current_remoteEvent[src].d.concat(data);
			if (data.length === 0) console.log("Got contour event with 0 length data!");
			current_remoteEvent[src].e=data[data.length-1][0];
		});
				//---------------------------------------------------------------------------
		// data is [timestamp (relative to "now"), x,y] of mouseContourGesture, and src is the id of the clicking client
		comm.registerCallback('beginGesture', function(data, src) {
			var fname;

			current_remoteEvent[src]=scoreEvent(data.type);

			// automatically fill any fields of the new scoreEvent sent
			for (fname in data.fields){
				current_remoteEvent[src][fname]=data.fields[fname];
			}

			// These are "derived" fields, so no need to send them with the message
			current_remoteEvent[src].b=data.d[0][0];
			current_remoteEvent[src].e=data.d[data.d.length-1][0];
			current_remoteEvent[src].d=data.d;
			current_remoteEvent[src].s=src;
			current_remoteEvent[src].soundbank=soundbank;

			displayElements.push(current_remoteEvent[src]);

			if (data.cont && (data.cont===true)){
				console.log("more data for this gesture will be expected");
			} else {
				console.log("received completed gesture, terminate the reception of data for this gesture");
				current_remoteEvent[src]=undefined; // no more data coming
			}
		});


		//---------------------------------------------------------------------------
		// data is [timestamp (relative to "now"), x,y] of mouseContourGesture, and src is the id of the clicking client
		comm.registerCallback('endGesture', function(data, src) {
			current_remoteEvent[src]=undefined; // no more data coming
		});

		//---------------------------------------------------------------------------
		comm.registerCallback('metroPulse', function(data, src) {
			serverTime=data;
			// check server elapsed time again client elapsed time
			//console.log("on metropulse, server elapsed time = " + (serverTime-serverTimeOrigin) +  ", and client elapsed = "+ (Date.now() - timeOrigin ));
		});
		//---------------------------------------------------------------------------
		comm.registerCallback('startTime', function(data) {
			console.log("server startTime = " + data[0] );

			clearScore();
			m_agent && m_agent.reset();
			
			timeOrigin=Date.now();
			lastSendTimeforCurrentEvent= -Math.random()*sendCurrentEventInterval; // so time-synched clients don't all send their countour chunks at the same time. 
			serverTimeOrigin=data[0];
			m_lastDisplayTick=0;
			displayElements=[];		
		});
		//---------------------------------------------------------------------------
		// Just make a color for displaying future events from the client with the src ID
		comm.registerCallback('newmember', function(data, src) {
			console.log("new member : " + src);
			colorIDMap[src]=utils.getRandomColor1(100,255,0,120,100,255);
		});
		//---------------------------------------------------------------------------
		// src is meaningless since it is this client
		comm.registerCallback('roommembers', function(data, src) {
			if (data.length > 1) 
					console.log("there are other members in this room!");
			for(var i=0; i<data.length;i++){
				if (data[i] != myID){
					colorIDMap[data[i]]=utils.getRandomColor1(100,255,0,120,100,255);
				}
			}
		});


		//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		// Client activity
		//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		var theCanvas = document.getElementById("score");
		var context = theCanvas.getContext("2d");
		var mouseX;
		var mouseY;
		context.font="9px Arial";

		var scoreWindowTimeLength=20000; //ms
		var pixelShiftPerMs=1*theCanvas.width/(scoreWindowTimeLength);
		var pxPerSec=pixelShiftPerMs*1000;
		var nowLinePx=1*theCanvas.width/3;
		var pastLinePx=-20; // after which we delete the display elements

		var sprocketHeight=2;
		var sprocketWidth=1;
		var sprocketInterval=1000; //ms

		var numTracks = 1;
		var trackHeight=1*theCanvas.height / numTracks;
		var trackY =[]; // array of y-values (pixels) that devide each track on the score
		for (var i=0;i<numTracks;i++){
			trackY[i]=i*trackHeight;
		}

		numXcells=54;
		numYcells=30;
		cellSizeX=theCanvas.width/numXcells;
		cellSizeY=theCanvas.height/numYcells;

		console.log("canvas width = "+ theCanvas.width + ", theCanvas.height = "+ theCanvas.height);

		var m_cell=new Array(numXcells);
		for(var i=0;i<numXcells;i++){
			m_cell[i]=new Array(numYcells);
			for(var j=0;j<numYcells;j++){
				m_cell[i][j]={};
				m_cell[i][j].x=(i*theCanvas.width)/numXcells;
				m_cell[i][j].y=(j*theCanvas.height)/numYcells;
				//console.log("cell["+i+"]["+j+"]  x="+m_cell[i][j].x + ", y="+m_cell[i][j].y);
			}
		}


		var time2PxOLD=function(time, elapsedTime){ // time measured since timeOrigin
			return nowLinePx+(time-elapsedTime)*pixelShiftPerMs;
		}
		var time2Px=function(time){ // time measured since timeOrigin
			return nowLinePx+(time-t_sinceOrigin)*pixelShiftPerMs;
		}
		var px2Time=function(px){  // relative to the now line
			return (px-nowLinePx)/pixelShiftPerMs;
		}
		var pxTimeSpan=function(px){  //units of ms
			return (px/pixelShiftPerMs);
		}

		var lastDrawTime=0;
		var t_sinceOrigin;
		var nowishP = function(t){
			if ((t > lastDrawTime) && (t <= t_sinceOrigin)) return true;
		}


		theCanvas.addEventListener("mousedown", onMouseDown, false);
		theCanvas.addEventListener("mouseup", onMouseUp, false);
		theCanvas.addEventListener("mousemove", onMouseMove, false);

		theCanvas.addEventListener("touchstart", touch2Mouse.touchHandler, true);
      	theCanvas.addEventListener("touchmove", touch2Mouse.touchHandler, true);
      	theCanvas.addEventListener("touchend", touch2Mouse.touchHandler, true);
      	theCanvas.addEventListener("touchcancel", touch2Mouse.touchHandler, true);    


		drawScreen(0);

		var dispElmt;

		function explosion(x, y, size1, color1, size2, color2) {
			var fs=context.fillStyle;
			var ss = context.strokeStyle;

			context.beginPath();
			context.fillStyle=color1;
			context.arc(x,y,size1,0,2*Math.PI);
			context.closePath();
			context.fill();
									
			context.beginPath();
			context.strokeStyle=color2;
			context.lineWidth = size2;
			context.arc(x,y,size1,0,2*Math.PI);
			context.stroke();
			context.lineWidth = 1;

			context.fillStyle=fs;
			context.strokeStyle=ss;
		}

		function drawCell(cell, b){
			b=Math.max(0,1-b);
			var hx=utils.d2h(Math.floor(255*b));
			context.fillStyle = "#" + hx+"00"+hx;

			context.fillRect(cell.x,cell.y,b*cellSizeX,b*cellSizeY);
		}


		var deg = 0;

		function drawScreen(elapsedtime) {

			context.clearRect(0, 0, 1*theCanvas.width, 1*theCanvas.height);

			var center=last_mousemove_event;
			if (m_agent != undefined){		
				center.x=Math.floor(theCanvas.width*(1+m_agent.x)/2);
				center.y=Math.floor(theCanvas.height*(1+m_agent.y)/2);
				//console.log("center.x="+center.x + ", center.y="+center.y);
			}

			comm.sendJSONmsg("beginGesture", {"d":[[center.x,center.y,0]], "type": "mouseContourGesture", "cont": true});


			for (var i=0;i<numXcells;i++){
				for (var j=0;j<numYcells;j++){
					d=utils.distance(center,m_cell[i][j]);
					drawCell(m_cell[i][j], d/theCanvas.width);
				}
			}

/*

			context.save();
			deg %= 360;
			context.translate(100,0);
			context.rotate(deg * Math.PI / 180);
			context.fillRect(-37.5, -25, 75, 50);
			context.restore();
			deg++;
*/
			lastDrawTime=elapsedtime;

		}






//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


		function clearScore(){
			for(dispElmt=displayElements.length-1;dispElmt>=0;dispElmt--){
				displayElements[dispElmt].stopSound();
			}
			current_mgesture=undefined;
			current_mgesture_2send=undefined;
		}


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
						comm.sendJSONmsg("contGesture", current_mgesture_2send.d);
					}
					comm.sendJSONmsg("endGesture", []);
				}	
			}
			current_mgesture=undefined;
			current_mgesture_2send=undefined;
		}
	
		// Record the time of the mouse event on the scrolling score
		function onMouseDown(e){
			event.preventDefault();
			var m = utils.getCanvasMousePosition(theCanvas, e);

			console.log("mouse down, x= " + m.x + ", y=", + m.y);

			last_mousemove_event=m;
			mouse_down=true;


			//comm.sendJSONmsg("beginGesture", {"d":[[m.x,m.y,0]], "type": "mouseContourGesture", "cont": true});


		}

		function onMouseUp(e){
			var m = utils.getCanvasMousePosition(theCanvas, e);
			mouse_down=false;
			comm.sendJSONmsg("endGesture", []);

		}

		function onMouseMove(e){
			if (mouse_down){
				last_mousemove_event=utils.getCanvasMousePosition(theCanvas, e);
				var m = last_mousemove_event;

				comm.sendJSONmsg("contGesture", {"d":[[m.x,m.y,0]]});
			}
		}


		//	++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		var t_myMachineTime;
		var t_count=0;
		var timerLoop = function(){

			t_myMachineTime = Date.now();
			t_sinceOrigin = t_myMachineTime-timeOrigin;
			
			drawScreen(t_sinceOrigin);

			m_agent && m_agent.tick(t_sinceOrigin/1000.0);


			//-----------  if an event is in the middle of being drawn, send it every sendCurrentEventInterval
			// send current event data periodically (rather than waiting until it is complete)
			//console.log("time since origin= " + t_sinceOrigin + ", (t_sinceOrigin-lastSendTimeforCurrentEvent) = "+ (t_sinceOrigin-lastSendTimeforCurrentEvent));
			if ((current_mgesture_2send!=undefined) && ((t_sinceOrigin-lastSendTimeforCurrentEvent) > sendCurrentEventInterval)){
				//console.log("tick " + t_sinceOrigin);
				if (myRoom != undefined) {
					//console.log("sending event");
					if (current_mgesture_2send.d.length > 0)
						comm.sendJSONmsg("contGesture", current_mgesture_2send.d);
				}
				current_mgesture_2send.d=[];
 				lastSendTimeforCurrentEvent=t_sinceOrigin;
			}
			
			//--------------------------------------------------------

			myrequestAnimationFrame(timerLoop);
		};

		timerLoop();  // fire it up

		//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
		// callback from html
/*
		var roomselect = document.getElementById('roomList');

		roomselect.addEventListener('change', function(e) {

			if (myRoom != undefined) comm.sendJSONmsg("unsubscribe", [myRoom]);

        	myRoom  = e.currentTarget.value;
        	//document.getElementById("current_room").value=mylist.options[mylist.selectedIndex].text;
        	//document.getElementById("current_room").value=myRoom;

			if (myRoom != undefined) {
        		// just choose a default room (rather than getting a list from the server and choosing)
				comm.sendJSONmsg("subscribe", [myRoom]);
				// Tell everybody in the room to restart their timers.
				comm.sendJSONmsg("startTime", []);
			} 
   		 })
*/



	}
);