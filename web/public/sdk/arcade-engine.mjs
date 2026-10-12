// Frozen deterministic rules; browser rendering is deliberately outside this module.
// A legal replay is not proof of human play. No submitted code is executed here.
export const RULES_ID='pepe-arcade-run/1';
export const TICKS=1800, HZ=30, MAX_POINTS=100;
export function createRun(seed){
 if(!Number.isInteger(seed)||seed<1||seed>0xffffffff)throw Error('invalid_seed');
 return {rng:seed>>>0,tick:0,x:500,y:850,hp:3,score:0,enemies:[],shots:[],invulnerable:0,done:false};
}
function random(s){let x=s.rng;x^=x<<13;x^=x>>>17;x^=x<<5;s.rng=x>>>0;return s.rng;}
export function step(s,input){
 if(!Number.isInteger(input)||input<0||input>31||s.done)throw Error('invalid_input');
 const dx=!!(input&2)-!!(input&1),dy=!!(input&8)-!!(input&4),speed=dx&&dy?7:10;
 s.x=Math.max(20,Math.min(980,s.x+dx*speed));s.y=Math.max(20,Math.min(980,s.y+dy*speed));
 if(input&16&&s.tick%6===0)s.shots.push({x:s.x,y:s.y-20});
 if(s.tick%12===0)s.enemies.push({x:20+random(s)%961,y:-20,speed:4+random(s)%4});
 for(const shot of s.shots)shot.y-=24;
 for(const enemy of s.enemies){enemy.y+=enemy.speed;for(const shot of s.shots){if(!shot.hit&&!enemy.hit&&Math.abs(shot.x-enemy.x)<24&&Math.abs(shot.y-enemy.y)<26){shot.hit=true;enemy.hit=true;s.score=Math.min(MAX_POINTS,s.score+1);}}
  if(!enemy.hit&&!s.invulnerable&&Math.abs(enemy.x-s.x)<30&&Math.abs(enemy.y-s.y)<30){enemy.hit=true;s.hp--;s.invulnerable=45;}
 }
 s.shots=s.shots.filter(a=>!a.hit&&a.y>=-30);s.enemies=s.enemies.filter(a=>!a.hit&&a.y<=1030);
 if(s.invulnerable)s.invulnerable--;s.tick++;s.done=s.hp<=0||s.tick>=TICKS;return s;
}
export function verifyRun(seed,inputs){
 if(typeof inputs!=='string'||inputs.length<2||inputs.length>TICKS*2||inputs.length%2||!/^[0-9a-f]+$/.test(inputs))throw Error('invalid_transcript');
 const run=createRun(seed);for(let i=0;i<inputs.length;i+=2)step(run,parseInt(inputs.slice(i,i+2),16));
 if(!run.done)throw Error('unfinished_run');return {score:run.score,ticks:run.tick,hp:run.hp};
}
