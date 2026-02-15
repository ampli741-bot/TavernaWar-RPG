const SIZE = 8;
const TILE = 64;
const COLORS = ["red","blue","green","yellow","purple"];

export default class GameScene extends Phaser.Scene {
    constructor() {
        super("GameScene");
        this.grid = [];
        this.busy = false;
        this.turn = "player";
    }

    preload() {
        this.load.image("bg", "assets/bg.jpg");
    }

    create() {
        this.add.image(this.scale.width/2, this.scale.height/2, "bg")
            .setDisplaySize(SIZE*TILE+40, SIZE*TILE+40);

        this.offsetX = this.scale.width/2 - SIZE*TILE/2;
        this.offsetY = this.scale.height/2 - SIZE*TILE/2;

        for (let y=0;y<SIZE;y++) {
            this.grid[y]=[];
            for (let x=0;x<SIZE;x++) {
                this.spawn(x,y);
            }
        }
    }

    spawn(x,y) {
        const color = Phaser.Utils.Array.GetRandom(COLORS);
        const rect = this.add.rectangle(
            this.offsetX+x*TILE+TILE/2,
            this.offsetY+y*TILE+TILE/2,
            TILE-6,TILE-6,
            Phaser.Display.Color.HexStringToColor(this.hex(color)).color
        ).setInteractive();

        rect.data = {x,y,color};
        rect.on("pointerdown",()=>this.click(rect));

        this.grid[y][x]=rect;
    }

    hex(c) {
        return {
            red:"#ff4444",
            blue:"#4488ff",
            green:"#44ff44",
            yellow:"#ffdd44",
            purple:"#aa44ff"
        }[c];
    }

    click(tile) {
        if (this.busy || this.turn!=="player") return;

        if (!this.selected) {
            this.selected = tile;
            tile.setStrokeStyle(3,0xffffff);
            return;
        }

        const dx = Math.abs(tile.data.x - this.selected.data.x);
        const dy = Math.abs(tile.data.y - this.selected.data.y);

        this.selected.setStrokeStyle();
        if (dx+dy===1) this.swap(this.selected,tile);

        this.selected = null;
    }

    swap(a,b) {
        this.busy=true;

        [a.data.color,b.data.color]=[b.data.color,a.data.color];
        a.fillColor = Phaser.Display.Color.HexStringToColor(this.hex(a.data.color)).color;
        b.fillColor = Phaser.Display.Color.HexStringToColor(this.hex(b.data.color)).color;

        if (!this.findMatches().length) {
            setTimeout(()=>{
                this.swap(a,b);
                this.busy=false;
            },200);
            return;
        }

        this.resolve();
    }

    findMatches() {
        let res=[];
        for(let y=0;y<SIZE;y++)
            for(let x=0;x<SIZE-2;x++){
                const a=this.grid[y][x],b=this.grid[y][x+1],c=this.grid[y][x+2];
                if(a.data.color===b.data.color&&b.data.color===c.data.color)
                    res.push(a,b,c);
            }
        return [...new Set(res)];
    }

    resolve() {
        const matches=this.findMatches();
        if(!matches.length){
            this.busy=false;
            this.turn="mob";
            this.time.delayedCall(600,()=>this.mobTurn());
            return;
        }

        matches.forEach(t=>{
            this.grid[t.data.y][t.data.x]=null;
            t.destroy();
        });

        for(let x=0;x<SIZE;x++){
            for(let y=SIZE-1;y>=0;y--){
                if(!this.grid[y][x]){
                    for(let yy=y-1;yy>=0;yy--){
                        if(this.grid[yy][x]){
                            const t=this.grid[yy][x];
                            this.grid[y][x]=t;
                            this.grid[yy][x]=null;
                            t.data.y=y;
                            this.tweens.add({targets:t,y:this.offsetY+y*TILE+TILE/2,duration:200});
                            break;
                        }
                    }
                }
            }
        }

        for(let x=0;x<SIZE;x++)
            for(let y=0;y<SIZE;y++)
                if(!this.grid[y][x]) this.spawn(x,y);

        this.time.delayedCall(300,()=>this.resolve());
    }

    mobTurn() {
        // тупой но рабочий моб
        for(let y=0;y<SIZE;y++)
            for(let x=0;x<SIZE-1;x++){
                const a=this.grid[y][x],b=this.grid[y][x+1];
                this.swap(a,b);
                if(this.findMatches().length){
                    this.turn="player";
                    return;
                }
                this.swap(a,b);
            }
        this.turn="player";
    }
}
