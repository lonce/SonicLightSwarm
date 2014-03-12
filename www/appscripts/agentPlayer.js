define(
    ["comm", "soundbank", "scoreEvents/scoreEvent"],
    function (comm, soundbank, generalScoreEvent) {

        var freqX=.25; // per second
        var freqY=.37; // per second


        return function (){

            var agent={
                "x":0,
                "y":0
            };
 

             agent.tick=function(tso){
                agent.x=Math.sin(freqX*2*Math.PI*tso);
                agent.y=Math.sin(freqY*2*Math.PI*tso);
                //console.log("tick time = " + tso);
                return;
            }

            agent.reset=function(){

            }



            return agent;
        }
    }
);
