alert('GAME.JS LOADED — CLEAN VERSION');

const TILE = 85;
const GRID = 8;

const TYPES = ['red','blue','green','purple','yellow'];

const BG_COLORS = {
  red: 0x3d0a0a,
  blue: 0x0a1a2f,
  green: 0x0a240a,
  purple: 0x220a35,
  yellow: 0x2d2405
};

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.grid = [];
    this.sel = null;
    this.anim = false;
  }

  preload() {
    this.load.image('bg', 'assets/bg.jpg');
    TYPES.forEach(t=>{
      this.load.image(t, `assets/rune_${t}.png`);
    });
  }

  create() {
    const { width, height } = this.scale;

    // background cover
    this.bg = this.add.image(width/2, height/2, 'bg');
    const s = Math.max(width/this.bg.width, height/this.bg.height);
    this.bg.setScale(s).setDepth(-10);

    this.OX = (width - GRID*TILE)/2;
    this.OY = (height - GRID*TILE)/2;

    for(let r=0;r<GRID;r++){
      this.grid[r]=[];
      for(let c=0;c<GRID;c++){
        this.spawn(r,c);
      }
    }
  }

  spawn(r,c,fromTop=false){
    const type = Phaser.Utils.Array.GetRandom(TYPES);

    const x = this.OX + c*TILE + TILE/2;
    const y = fromTop ? this.OY - TILE : this.OY + r*TILE + TILE/2;

    const cont = this.add.container(x,y);
    cont.type = type;
    cont.r = r;
    cont.c = c;

    const bg = this.add.graphics();
    bg.fillStyle(BG_COLORS[type],1);
    bg.fillRoundedRect(-36,-36,72,72,12);

    const img = this.add.image(0,0,type);
    img.setDisplaySize(72*1.6,72*1.6);

    const mask = this.make.graphics();
    mask.fillStyle(0xffffff);
    mask.fillRoundedRect(-36,-36,72,72,12);
    img.setMask(mask.createGeometryMask());

    const frame = this.add.graphics();
    frame.lineStyle(4,0xbc962c);
    frame.strokeRoundedRect(-36,-36,72,72,12);

    cont.add([bg,img,frame]);

    const hit = this.add.rectangle(0,0,TILE,TILE,0,0).setInteractive();
    hit.on('pointerdown',()=>this.tap(cont));
    cont.add(hit);

    this.grid[r][c]=cont;

    if(fromTop){
      this.tweens.add({
        targets:cont,
        y:this.OY+r*TILE+TILE/2,
        duration:300
      });
    }
  }

  async tap(t){
    if(this.anim) return;

    if(!this.sel){
      this.sel=t;
      t.setScale(1.15);
      return;
    }

    const d = Math.abs(this.sel.r-t.r)+Math.abs(this.sel.c-t.c);
    this.sel.setScale(1);

    if(d===1){
      await this.swap(this.sel,t);
      await this.check();
    }

    this.sel=null;
  }

  async swap(a,b){
    this.anim=true;

    const ar=a.r, ac=a.c;
    const br=b.r, bc=b.c;

    this.grid[ar][ac]=b;
    this.grid[br][bc]=a;

    a.r=br; a.c=bc;
    b.r=ar; b.c=ac;

    return new Promise(res=>{
      this.tweens.add({targets:a,x:this.OX+bc*TILE+TILE/2,y:this.OY+br*TILE+TILE/2,duration:200});
      this.tweens.add({targets:b,x:this.OX+ac*TILE+TILE/2,y:this.OY+ar*TILE+TILE/2,duration:200,
        onComplete:()=>{this.anim=false;res();}
      });
    });
  }

  find(){
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
    const m=this.find();
    if(m.length){
      await this.explode(m);
      await this.refill();
      await this.check();
    }
  }

  async explode(list){
    this.anim=true;
    return new Promise(res=>{
      this.tweens.add({
        targets:list,
        scale:0,
        alpha:0,
        duration:250,
        onComplete:()=>{
          list.forEach(t=>{
            this.grid[t.r][t.c]=null;
            t.destroy();
          });
          this.anim=false;
          res();
        }
      });
    });
  }

  async refill(){
    for(let c=0;c<GRID;c++){
      let e=0;
      for(let r=GRID-1;r>=0;r--){
        if(!this.grid[r][c]) e++;
        else if(e){
          const t=this.grid[r][c];
          this.grid[r+e][c]=t;
          this.grid[r][c]=null;
          t.r+=e;
          this.tweens.add({targets:t,y:this.OY+t.r*TILE+TILE/2,duration:250});
        }
      }
      for(let i=0;i<e;i++) this.spawn(i,c,true);
    }
    await new Promise(r=>this.time.delayedCall(300,r));
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: window.innerWidth,
  height: window.innerHeight,
  scene: GameScene
});
