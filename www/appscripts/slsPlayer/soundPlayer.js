define(
	["soundbank", "config"],
	function (soundbank, config) {
      return function (){
 
         var m_player={};
         
         m_player.playingP=false;

         m_player.start=function(){
            m_interval.init(m_interval.avg, m_interval.spreadFactor);
            m_player.playingP=true;
         }

         m_player.stop=function(){
            m_player.playingP=false;
         }

         var m_interval = {
            "avg":1000, //ms
            "spreadFactor":1.2, // reset by init
            "min":10000, // reset by init
            "max":10000, // reset by init
            "nextTime":0,
            "that":this,

            "tick": function(now){
               m_interval.nextTime =  now+m_interval.min+(m_interval.max-m_interval.min)*Math.random();
               //console.log("tick.nextTime = " + m_interval.nextTime);
            },

            "init": function(i_avg, i_spreadFactor){
               m_interval.spreadFactor=i_spreadFactor;
               m_interval.avg=i_avg;
               m_interval.min=i_avg/i_spreadFactor;
               m_interval.max=i_avg*i_spreadFactor;
               m_interval.nextTime=0;
            }
         }

         m_player.init=m_interval.init;

         m_player.tick = function(tso, ndistance){

            if (! m_player.playingP) return;

            this.snd && this.snd.setParamNorm("Gain", .5*(1-ndistance)*(1-ndistance)*(1-ndistance)*(1-ndistance)*(1-ndistance)*(1-ndistance));

            if (tso > m_interval.nextTime){
                     m_player.playonenote(ndistance);
                     m_interval.tick(tso);
            }
      };

      m_player.playonenote=function(ndistance){
            console.log('play!')
                     this.snd=soundbank.getSnd();
                     //this.snd && this.snd.setParamNorm("Carrier Frequency", .8 + .3*Math.random());
                     //this.snd && this.snd.setParamNorm("Modulation Index", .02 + .06*Math.random());
                     this.snd && this.snd.setParamNorm("Gain", .5*(1-ndistance)*(1-ndistance)*(1-ndistance)*(1-ndistance)*(1-ndistance)*(1-ndistance));
                     this.snd && this.snd.play();
                     //console.log("event playtime = " + tso);
                     //this.snd && this.snd.qrelease(config.minSndDuration);
                     this.snd && this.snd.qrelease(1200);
                     this.snd && soundbank.releaseSnd(this.snd);     

      }

      return m_player;
   }
});