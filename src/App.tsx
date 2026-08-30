import { useMemo, useState } from 'react';
import { Chess, type Square } from 'chess.js';

const glyph: Record<string,string>={wp:'♙',wn:'♘',wb:'♗',wr:'♖',wq:'♕',wk:'♔',bp:'♟',bn:'♞',bb:'♝',br:'♜',bq:'♛',bk:'♚'};
const files='abcdefgh';

type Mode='computer'|'local';

export default function App(){
 const [game,setGame]=useState(()=>new Chess());
 const [selected,setSelected]=useState<Square|null>(null);
 const [flip,setFlip]=useState(false);
 const [mode,setMode]=useState<Mode>('computer');
 const [level,setLevel]=useState(3);
 const [thinking,setThinking]=useState(false);
 const [last,setLast]=useState<{from:Square,to:Square}|null>(null);
 const legal=useMemo(()=>selected?new Set(game.moves({square:selected,verbose:true}).map(m=>m.to)):new Set<string>(),[game,selected]);
 const squares=useMemo(()=>{const a:Square[]=[];for(let r=8;r>=1;r--)for(const f of files)a.push(`${f}${r}` as Square);return flip?a.reverse():a},[flip]);
 const status=game.isCheckmate()?`Checkmate • ${game.turn()==='w'?'Black':'White'} wins`:game.isDraw()?'Draw':`${game.turn()==='w'?'White':'Black'} to move${game.inCheck()?' • Check':''}`;
 function clone(g:Chess){return new Chess(g.fen())}
 function chooseBotMove(g:Chess){const moves=g.moves({verbose:true});if(!moves.length)return null;const value:any={p:100,n:320,b:330,r:500,q:900,k:0};const scored=moves.map(m=>({m,s:(m.captured?value[m.captured]:0)+(m.promotion?800:0)+Math.random()*(level===1?900:level===2?350:100)}));scored.sort((a,b)=>b.s-a.s);return scored[Math.floor(Math.random()*Math.min(scored.length,level===1?8:level===2?4:2))].m}
 function botReply(g:Chess){if(mode!=='computer'||g.isGameOver()||g.turn()!=='b')return;setThinking(true);window.setTimeout(()=>{const b=clone(g);const m=chooseBotMove(b);if(m){b.move({from:m.from,to:m.to,promotion:'q'});setLast({from:m.from,to:m.to});setGame(b)}setThinking(false)},350)}
 function press(sq:Square){if(thinking||game.isGameOver()||(mode==='computer'&&game.turn()==='b'))return;const p=game.get(sq);if(!selected){if(p&&p.color===game.turn())setSelected(sq);return}if(selected===sq){setSelected(null);return}try{const n=clone(game);n.move({from:selected,to:sq,promotion:'q'});setLast({from:selected,to:sq});setSelected(null);setGame(n);botReply(n)}catch{if(p&&p.color===game.turn())setSelected(sq);else setSelected(null)}}
 function fresh(){setGame(new Chess());setSelected(null);setLast(null);setThinking(false)}
 function undo(){const n=new Chess();const hist=game.history({verbose:true});const cut=Math.max(0,hist.length-(mode==='computer'?2:1));for(const m of hist.slice(0,cut))n.move({from:m.from,to:m.to,promotion:m.promotion});setGame(n);setSelected(null);setLast(null)}
 return <div className="app"><header><div className="brand"><span>♞</span> KnightZero</div><div className="tag">PLAY • LEARN • IMPROVE</div></header><main><section className="game"><div className="player"><div className="avatar">KZ</div><div><b>{mode==='computer'?'KnightZero Bot':'Player 2'}</b><small>{thinking?'Thinking…':'Ready'}</small></div></div><div className="board">{squares.map(sq=>{const p=game.get(sq);const f=files.indexOf(sq[0]);const r=Number(sq[1]);const dark=(f+r)%2===1;const active=selected===sq;const target=legal.has(sq);const recent=last&&(last.from===sq||last.to===sq);return <button aria-label={sq} key={sq} onClick={()=>press(sq)} className={`square ${dark?'dark':'light'} ${active?'active':''} ${recent?'recent':''}`}>{p&&<span className={`piece ${p.color}`}>{glyph[p.color+p.type]}</span>}{target&&<i className={p?'capture':'dot'}/>}<em>{sq}</em></button>})}</div><div className="player"><div className="avatar you">YOU</div><div><b>You</b><small>{status}</small></div></div></section><aside><div className="panel"><h2>{status}</h2><div className="tabs"><button className={mode==='computer'?'on':''} onClick={()=>{setMode('computer');fresh()}}>Computer</button><button className={mode==='local'?'on':''} onClick={()=>{setMode('local');fresh()}}>2 Players</button></div>{mode==='computer'&&<div className="levels"><span>Bot level</span>{[1,2,3,4,5].map(n=><button key={n} className={level===n?'on':''} onClick={()=>setLevel(n)}>{n}</button>)}</div>}<div className="moves"><b>Moves</b><div>{game.history().length?game.history().map((m,i)=><span key={i}>{i%2===0?`${Math.floor(i/2)+1}. `:''}{m} </span>):<p>Your game will appear here.</p>}</div></div><div className="actions"><button onClick={undo}>↶ Undo</button><button onClick={()=>setFlip(v=>!v)}>⇅ Flip</button><button className="new" onClick={fresh}>New Game</button></div></div><div className="panel mini"><h3>Offline ready</h3><p>Install KnightZero from your browser menu to play it like an app.</p></div></aside></main><footer>KnightZero • Alpha</footer></div>}
