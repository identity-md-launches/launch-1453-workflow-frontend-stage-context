// Local adaptation: expose the existing read-only account request on the same bridge.
// The frozen arcade-engine.mjs is unmodified. Upstream MIT license: ./LICENSE.
import {createPepeChainBridge} from './onchain-bridge.js';
import {createRun,step} from './arcade-engine.mjs';
// Art, audio, camera and feedback belong to your game. This frozen engine owns rewarded rules.
export function createPepeArcade({onPause,onResume,onInit}={}){
 const bridge=createPepeChainBridge({onPause,onResume,onInit});let run=null,inputs='',running=false;
 return {embedded:bridge.embedded,
  async start(){if(!bridge.embedded)throw Error('Open this game on Pepe2Pepe to play.');const session=await bridge.request({type:'arcade.start'});if(session.state!=='playing')return session;run=createRun(session.seed);inputs='';running=true;return {...session,run};},
  tick(input){if(!running||!run||run.done)throw Error('No active run.');step(run,input);inputs+=input.toString(16).padStart(2,'0');return run;},
  async finish(){if(!run?.done)throw Error('Finish the run first.');running=false;return bridge.request({type:'arcade.finish',inputs});},
  account(){return bridge.request({type:'account'});},
  status(){return bridge.request({type:'arcade.status'});},
  claim(){return bridge.request({type:'arcade.claim'});},
  destroy(){running=false;bridge.destroy();}
 };
}
