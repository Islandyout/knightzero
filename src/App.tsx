import { useMemo, useState } from 'react';
import { Chess, type Square } from 'chess.js';

const glyph: Record<string,string>={wp:'♙',wn:'♘',wb:'♗',wr:'♖',wq:'♕',wk:'♔',bp:'♟',bn:'♞',bb:'♝',br:'♜',bq:'♛',bk:'♚'};
const files='abcdefgh';
type Mode='computer'|'local';
function copyGame(source:Chess){const next=new Chess();const pgn=source.pgn();if(pgn)next.loadPgn(pgn);return next}

export default function App(){
 const [game,setGame]=useState(()=>new Chess());
 const [selected,setSelected]=useState<Square|null>(null);
 const [flip,setFlip]=useState(false);
 const [mode,setMode]=useState<Mode>('computer');
 const [level,setLevel]=useState(3);
 const [thinking,setThinking]=useState(false);
 const [last,setLast]=useState<{from:Square,to:Square}|null>(null);
 const legal=useMemo(()=>selected?new Set(game.moves({square:selected,verbose:true}).map(m=>m.to)):new Set<string>(),[game,selected]);
 const squares=useMemo(()=>{const a:Square[]=[];for(let r=8;r>=1;r--)for(const f of files)a.push(`${f}${r}` as Square);return flip?[...a].reverse():a},[flip]);
 const status=game.isCheckmate()?`Checkmate · ${game.turn()==='w'?'Black':'White'} wins`:game.isDraw()?'Draw':`${game.turn()==='w'?'White':'Black'} to move${game.inCheck()?' · Check':''}`;
 function chooseBotMove(g:Chess){const moves=g.moves({verbose:true});if(!moves.length)return null;const value:Record<string,number>={p:100,n:320,b:330,r:500,q:900,k:0};const scored=moves.map(m=>({m,s:(m.captured?value[m.captured]:0)+(m.promotion?800:0)+Math.random()*(level===1?900:level===2?350:100)})).sort((a,b)=>b.s-a.s);return scored[Math.floor(Math.random()*Math.min(scored.length,level===1?8:level===2?4:2))].m}
 function botReply(g:Chess){if(mode!=='computer'||g.isGameOver()||g.turn()!=='b')return;setThinking(true);window.setTimeout(()=>{const b=copyGame(g);const m=chooseBotMove(b);if(m){b.move({from:m.from,to:m.to,promotion:'q'});setLast({from:m.from,to:m.to});setGame(b)}setThinking(false)},350)}
 function press(sq:Square){if(thinking||game.isGameOver()||(mode==='computer'&&game.turn()==='b'))return;const p=game.get(sq);if(!selected){if(p&&p.color===game.turn())setSelected(sq);return}if(selected===sq){setSelected(null);return}try{const n=copyGame(game);n.move({from:selected,to:sq,promotion:'q'});setLast({from:selected,to:sq});setSelected(null);setGame(n);botReply(n)}catch{if(p&&p.color===game.turn())setSelected(sq);else setSelected(null)}}
 function fresh(){setGame(new Chess());setSelected(null);setLast(null);setThinking(false)}
 function undo(){if(thinking)return;const n=copyGame(game);if(mode==='computer'){n.undo();if(n.turn()==='b')n.undo()}else n.undo();const h=n.history({verbose:true});const lm=h[h.length-1];setGame(n);setSelected(null);setLast(lm?{from:lm.from,to:lm.to}:null)}
 return <div className="app">
  <header><button className="head-btn">☰</button><div className="brand"><span>♟</span><b>KnightZero</b></div><button className="head-btn" onClick={()=>setFlip(v=>!v)}>⚙</button></header>
  <main><section className="game">
   <div className="opponent"><div className="avatar">KZ</div><div><b>{mode==='computer'?`KnightZero Bot`:'Player 2'}</b><small>{thinking?'Thinking…':'Ready'}</small></div></div>
   <div className="board" role="grid">{squares.map(sq=>{const p=game.get(sq);const f=files.indexOf(sq[0]);const r=Number(sq[1]);const dark=(f+r)%2===1;const target=legal.has(sq);const recent=!!last&&(last.from===sq||last.to===sq);const showFile=flip?sq[1]==='8':sq[1]==='1';const showRank=flip?sq[0]==='h':sq[0]==='a';return <button key={sq} onClick={()=>press(sq)} className={`square ${dark?'dark':'light'} ${selected===sq?'active':''} ${recent?'recent':''}`} aria-label={sq}>{p&&<span className={`piece ${p.color}`}>{glyph[p.color+p.type]}</span>}{target&&<i className={p?'capture':'dot'}/>} {showRank&&<span className="rank-label">{sq[1]}</span>}{showFile&&<span className="file-label">{sq[0]}</span>}</button>})}</div>
   <div className="you-row"><div className="avatar you">YOU</div><div><b>You</b><small>{game.turn()==='w'?'White to move':'Black to move'}</small></div></div>
   <div className="control-card"><h2>{status}</h2><div className="tabs"><button className={mode==='computer'?'on':''} onClick={()=>{setMode('computer');fresh()}}>Computer</button><button className={mode==='local'?'on':''} onClick={()=>{setMode('local');fresh()}}>2 Players</button></div>{mode==='computer'&&<div className="levels"><span>Bot level</span>{[1,2,3,4,5].map(n=><button key={n} className={level===n?'on':''} onClick={()=>setLevel(n)}>{n}</button>)}</div>}<div className="moves"><b>Moves</b><div>{game.history().length?game.history().map((m,i)=><span key={`${i}-${m}`}>{i%2===0?`${Math.floor(i/2)+1}. `:''}{m}{i%2===1?<br/>:' '}</span>):<p>Your game will appear here.</p>}</div></div></div>
  </section></main>
  <nav className="bottom-bar"><button>☷<span>Options</span></button><button onClick={fresh}>⚑<span>Abort</span></button><button>💡<span>Hint</span></button><button onClick={undo}>↶<span>Undo</span></button></nav>
 </div>
}
