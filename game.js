console.log('GAME.JS MATCH-3 LOGIC LOADED');

const TILE_S = 85;
const TILE_P = 4;
const VISUAL_S = TILE_S - TILE_P * 2;
const GRID = 8;

const TYPES = ['red', 'blue', 'green', 'purple', 'yellow'];

class GameScene extends Phaser.Scene {
  constructor() {
    super();
    this.grid = [];
    this.selected = null;
    this.isAnimating = false;
  }

  preload() {
    this.load.image('bg', 'assets/bg.jpg');
    TYPES.forEach(t => this.load.image(`rune_${t}`, `assets/rune_${t}.png`));
  }

  create() {
    const { width, height } = this.scale;

    const bg = this.add.image(width/2, height/2, 'bg');
    bg.setScale(Math.max(width/bg.width, height/bg.height));

    this.OX = (width - GRID*TILE_S)/2;
    this.OY = (height - GRID*TILE_S)/2;

    for (let r=0;r<GRID;r++) {
      this.grid[r]=[];
      for (let c=0;c<GRID;c++) {
        this.spawnTile(r,c);
      }
    }
  }

  spawnTile(r,c,fromTop=false) {
    const type = Phaser.Utils.Array.GetRandom(TYPES);
    const x = this.OX + c*TILE_S + TILE_S/2;
    const y = fromTop ? this.OY - TILE_S : this.OY + r*TILE_S + TILE_S/2;

    const cont = this.add.container(x,y);
    cont.type = type;
    cont.r = r;
    cont.c = c;

    const img = this.add.image(0,0,`rune_${type}`);
    img.setDisplaySize(VISUAL_S*1.7,VISUAL_S*1.7);

    cont.add(img);

    const hit = this.add.rectangle(0,0,TILE_S,TILE_S,0,0)
      .setInteractive();
    hit.on('pointerdown',()=>this.onTile(cont));
    cont.add(hit);

    this.grid[r][c]=cont;

    if(fromTop){
      this.tweens.add({targets:cont,y:this.OY+r*TILE_S+TILE_S/2,duration:300});
    }
  }

  async onTile(t) {
    if(this.isAnimating) return;

    if(!this.selected){
      this.selected = t;
      t.setScale(1.15);
      return;
    }

    const d = Math.abs(t.r-this.selected.r)+Math.abs(t.c-this.selected.c);
    this.selected.setScale(1);

    if(d===1){
      await this.swap(t,this.selected);
      if(!(await this.check())){
        await this.swap(t,this.selected);
      }
    }

    this.selected = null;
  }

  swap(a,b){
    this.isAnimating=true;

    [this.grid[a.r][a.c],this.grid[b.r][b.c]]=[b,a];
    [a.r,b.r]=[b.r,a.r];
    [a.c,b.c]=[b.c,a.c];

    return new Promise(res=>{
      this.tweens.add({targets:a,x:this.OX+a.c*TILE_S+TILE_S/2,y:this.OY+a.r*TILE_S+TILE_S/2,duration:200});
      this.tweens.add({targets:b,x:this.OX+b.c*TILE_S+TILE_S/2,y:this.OY+b.r*TILE_S+TILE_S/2,duration:200,onComplete:()=>{
        this.isAnimating=false;res();
      }});
    });
  }

  findMatches(){
    const out=[];
    for(let r=0;r<GRID;r++)for(let c=0;c<GRID-2;c++){
      const a=this.grid[r][c],b=this.grid[r][c+1],d=this.grid[r][c+2];
      if(a&&b&&d&&a.type===b.type&&a.type===d.type) out.push(a,b,d);
    }
    for(let c=0;c<GRID;c++)for(let r=0;r<GRID-2;r++){
      const a=this.grid[r][c],b=this.grid[r+1][c],d=this.grid[r+2][c];
      if(a&&b&&d&&a.type===b.type&&a.type===d.type) out.push(a,b,d);
    }
    return [...new Set(out)];
  }

  async check(){
    const m=this.findMatches();
    if(!m.length) return false;

    await this.explode(m);
    await this.refill();
    await this.check();
    return true;
  }

  explode(list){
    this.isAnimating=true;
    return new Promise(res=>{
      this.tweens.add({targets:list,scale:0,alpha:0,duration:250,onComplete:()=>{
        list.forEach(t=>{this.grid[t.r][t.c]=null;t.destroy();});
        this.isAnimating=false;res();
      }});
    });
  }

  async refill(){
    for(let c=0;c<GRID;c++){
      let empty=0;
      for(let r=GRID-1;r>=0;r--){
        if(!this.grid[r][c]) empty++;
        else if(empty){
          const t=this.grid[r][c];
          this.grid[r+empty][c]=t;
          this.grid[r][c]=null;
          t.r+=empty;
          this.tweens.add({targets:t,y:this.OY+t.r*TILE_S+TILE_S/2,duration:250});
        }
      }
      for(let i=0;i<empty;i++) this.spawnTile(i,c,true);
    }
    await new Promise(r=>this.time.delayedCall(300,r));
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#000',
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: GameScene
});
