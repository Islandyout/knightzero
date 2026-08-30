export type EngineScore={cp?:number;mate?:number;pv:string[]};
export type SearchResult={bestMove:string|null;score:EngineScore};

export class StockfishEngine{
  private worker:Worker;
  private readyPromise:Promise<void>;
  private readyResolve!:()=>void;
  private readyReject!:(error:Error)=>void;
  private pending:((r:SearchResult)=>void)|null=null;
  private latestScore:EngineScore={cp:0,pv:[]};

  constructor(){
    this.readyPromise=new Promise<void>((resolve,reject)=>{this.readyResolve=resolve;this.readyReject=reject});
    this.worker=new Worker('/stockfish/stockfish-18-lite-single.js');
    this.worker.onmessage=(event)=>this.handle(String(event.data));
    this.worker.onerror=()=>this.readyReject(new Error('Stockfish worker failed to load'));
    window.setTimeout(()=>this.readyReject(new Error('Stockfish timed out while loading')),15000);
    this.worker.postMessage('uci');
  }

  private handle(line:string){
    if(line==='uciok'){this.worker.postMessage('isready');return}
    if(line==='readyok'){this.readyResolve();return}
    if(line.startsWith('info ')){
      const cp=line.match(/ score cp (-?\d+)/);
      const mate=line.match(/ score mate (-?\d+)/);
      const pv=line.match(/\bpv\s+(.+)$/);
      this.latestScore={cp:cp?Number(cp[1]):undefined,mate:mate?Number(mate[1]):undefined,pv:pv?pv[1].trim().split(/\s+/):[]};
      return;
    }
    if(line.startsWith('bestmove ')){
      const best=line.split(/\s+/)[1];
      const done=this.pending;this.pending=null;
      done?.({bestMove:best==='(none)'?null:best,score:this.latestScore});
    }
  }

  async search(fen:string,{skill=10,movetime=500,limitStrength=false,elo=1800}:{skill?:number;movetime?:number;limitStrength?:boolean;elo?:number}={}):Promise<SearchResult>{
    await this.readyPromise;
    if(this.pending){this.worker.postMessage('stop');this.pending({bestMove:null,score:this.latestScore});this.pending=null}
    this.latestScore={cp:0,pv:[]};
    this.worker.postMessage(`setoption name Skill Level value ${Math.max(0,Math.min(20,skill))}`);
    this.worker.postMessage(`setoption name UCI_LimitStrength value ${limitStrength?'true':'false'}`);
    if(limitStrength)this.worker.postMessage(`setoption name UCI_Elo value ${Math.max(1320,Math.min(3190,elo))}`);
    this.worker.postMessage(`position fen ${fen}`);
    return new Promise<SearchResult>(resolve=>{this.pending=resolve;this.worker.postMessage(`go movetime ${Math.max(50,movetime)}`)});
  }

  stop(){this.worker.postMessage('stop')}
  destroy(){this.worker.terminate();this.pending=null}
}

export function uciToMove(uci:string|null){if(!uci||uci.length<4)return null;return {from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]||undefined}}
