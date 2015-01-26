/*  Mapps touch events to mouse events.
Just include this file in a require module, no need to call anything. 
*/
require.config({
  paths: {
    "jquery": "http://ajax.googleapis.com/ajax/libs/jquery/1.3.2/jquery.min"
  }
});
define(
  ["jsaSound/jsaModels/jsaMp3", "jquery"],
  function(sndFactory){

  var msgbox = document.getElementById("msg");
  //msgbox.value="configuring";

        var reply_place = document.createElement("div");
      reply_place.id = "overlay";
      var inner_div = document.createElement("div"), button_close = document.createElement("button");


    var submit_btn = document.createElement("input");
    var permitSubmit=function(){
      //alert("click sound loaded");
      submit_btn.type = "button";
      submit_btn.className = "submit";
      submit_btn.value = "Submit";
      legend.innerHTML = "States of Diffusion @ ACM Multimedia";
      //form.appendChild(submit_btn);
      inner_div.appendChild(submit_btn);
      //msgbox.value="click resource loaded";

    }

 // These properties must be set thu the config interface before the SUBMIt button will appear
  var m_ready = {
    "soundsLoaded": false,
    "serverAck": false,
    "resourceLoaded": false,

    "test": function(){
      //if (m_ready.soundsLoaded && m_ready.serverAck && m_ready.resourceLoaded){
      if (m_ready.resourceLoaded){
        return true;
      } return false;
    }
  } 

    var okSound=sndFactory();
    
    var uconfig = {
      "player": undefined,
      "room": undefined
    };

    uconfig.set= function (elmt){
      console.log("configure: setting " + elmt);
        m_ready[elmt]=true;
        if (m_ready.test()) {
          permitSubmit();
        }
    } 

    uconfig.report = function(c_id) {
   
      button_close.id = "upprev_close";
      button_close.innerHTML = "x";
      button_close.onclick = function () {
          var element = document.getElementById('overlay');
          element.parentNode.removeChild(element);
      };
      inner_div.appendChild(button_close);
   
      var legend = document.createElement("legend");
      legend.id="legend";
      legend.innerHTML = "States of Diffusion @ ACM Multimedia<br> Loading ...";
      inner_div.appendChild(legend);

      $.getJSON("/RoomList", function(data){
        var rList =  data.jsonItems;
        console.log("got something from server: " + rList);
        for (i=0;i<rList.length;i++){
          if (rList[i]==="WAC"){
            uconfig.room="WAC";
            return;
          } 
        }
        alert("Sorry - there is no performance to connect to.<br> Try reloading page.");
        uconfig.room="defaultRoom";
        return;
      });

   

          // This is a click sound which get the iOs sound flowing

    okSound.on("resourceLoaded",  function(){
      uconfig.set("resourceLoaded");
    });
    okSound.setParam("Sound URL", "resources/click.mp3");


/*
      var buttTimer=setTimeout(function(){
        console.log("autoclick submit button");
        submit_btn.click()}, 3000);
*/

      submit_btn.onclick = function () {
          //if (buttTimer) {clearTimeout(buttTimer);}
          //var checked = false, formElems = this.parentNode.getElementsByTagName('input');

          //alert("click");
          okSound.setParam("Gain", 1);
          okSound.setParam("play", 1);
          //msgbox.value="click played";

          var element = document.getElementById('overlay');
          if (! element) {
            console.log("got click on nonexistent element .... autoclick?");
            return;
          }
          element.parentNode.removeChild(element);

          c_id(); // call the callback when we have our info
          return false;
      }
   
      reply_place.appendChild(inner_div);
      
      // Here, we must provide the name of the parent DIV on the main HTML page
      var attach_to = document.getElementById("wrap"), parentDiv = attach_to.parentNode;
      parentDiv.insertBefore(reply_place, attach_to);
   
    }
  
  return uconfig;

  }
);
