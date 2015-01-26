/*  Mapps touch events to mouse events.
Just include this file in a require module, no need to call anything. 
*/
require.config({
  paths: {
    "jquery": "http://ajax.googleapis.com/ajax/libs/jquery/1.3.2/jquery.min"
  }
});
define(
  ["jquery"],
  function(){

    var uconfig = {
      "player": undefined,
      "room": undefined
    };

    uconfig.report = function(c_id) {
      var form = document.createElement("form", "report_form");
      form.id = "report_form";
      form.method = "post";
      form.action = "index.php?mode=post_comment";
   
      var reply_place = document.createElement("div");
      reply_place.id = "overlay";
      var inner_div = document.createElement("div"), button_close = document.createElement("button");
      button_close.id = "upprev_close";
      button_close.innerHTML = "x";
      button_close.onclick = function () {
          var element = document.getElementById('overlay');
          element.parentNode.removeChild(element);
      };
      inner_div.appendChild(button_close);
   
      var legend = document.createElement("legend");
      legend.id="legend";
      legend.innerHTML = "Join a room and then submit:";
      form.appendChild(legend);

      var roomdiv = document.createElement("roomdiv");
      roomdiv.type="div";
      roomdiv.id="roomdiv";
      roomdiv.innerHTML="Join a lightSwarm?";


      var input3 = document.createElement("select");
      input3.type="select";
      input3.id="roomSelect";
      input3.options[0]=new Option("Play Offline", "", true, false);
      $.getJSON("/soundList/ModelDescriptors", function(data){
        var rList =  data.jsonItems;
        console.log("got something from server: " + rList);
        for (i=0;i<rList.length;i++){
          input3.options[i+1]=new Option(rList[i], rList[i], false, false);
        }
      });




      input3.addEventListener('change', function(e) {
          uconfig.room  = e.currentTarget.value;
          console.log("uconfig.room = " + uconfig.room);
      });

      roomdiv.appendChild(input3);

      form.appendChild(roomdiv);
      inner_div.appendChild(form);
      reply_place.appendChild(inner_div);

   
      var submit_btn = document.createElement("input", "the_submit");
      submit_btn.type = "submit";
      submit_btn.className = "submit";
      submit_btn.value = "Submit";
      form.appendChild(submit_btn);
   
      submit_btn.onclick = function () {
          var checked = false, formElems = this.parentNode.getElementsByTagName('input');
          for (var i = 0; i < formElems.length; i++) {
              if (formElems[i].type == 'radio' && formElems[i].checked == true) {
                  checked = true;
                  var el = formElems[i];
                  break;
              }
          }
          //if (!checked) return false; // ignore SUBMIT if no radio button was selected

          //uconfig.player = el.value;
          var element = document.getElementById('overlay');
          element.parentNode.removeChild(element);
          c_id(); // call the callback when we have our info

          //var poststr = "c_id=" + c_id + "&reason=" + encodeURI(el.value);
          //alert(poststr);
          return false;
      }
   

   
      // Here, we must provide the name of the parent DIV on the main HTML page
      var attach_to = document.getElementById("wrap"), parentDiv = attach_to.parentNode;
      parentDiv.insertBefore(reply_place, attach_to);
   
    }
  
  return uconfig;

  }
);
