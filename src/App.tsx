import { useMemo, useState, type CSSProperties } from 'react';
import { Chess, type Square } from 'chess.js';

const glyph:Record<string,string>={wp:'♙',wn:'♘',wb:'♗',wr:'♖',wq:'♕',wk:'♔',bp:'♟',bn:'♞',bb:'♝',br:'♜',bq:'♛',bk:'♚'};
const files='abcdefgh';
const pieceValue:Record<string,number>={p:1,n:3.2,b:3.3,r:5,q:9,k:0};
type Mode='computer'|'local';
function copyGame(source:Chess){const next=new Chess();const pgn=source.pgn();if(pgn)next.loadPgn(pgn);return next}
function materialEval(g:Chess){let score=0;for(const rank of g.board())for(const p of rank)if(p)score+=(p.color==='w'?1:-1)*pieceValue[p.type];return Math.round(score*10)/10}
function gameAtPly(source:Chess,ply:number){const moves=source.history({verbose:true});const view=new Chess();for(let i=0;i<Math.min(ply,moves.length);i++)view.move(moves[i].san);return view}

export default function App(){
 const [game,setGame]=useState(()=>new Chess());
 const [selected,setSelected]=useState<Square|null>(null);
 const [flip,setFlip]=useState(false);
 const [mode,setMode]=useState<Mode>('computer');
 const [level,setLevel]=useState(3);
 const [thinking,setThinking]=useState(false);
 const [last,setLast]=useState<{from:Square,to:Square}|null>(null);
 const [settings,setSettings]=useState(false);
 const [hint,setHint]=useState<{from:Square,to:Square}|null>(null);
 const [reviewPly,setReviewPly]=useState<number|null>(null);
 const history=game.history({verbose:true});
 const shownPly=reviewPly===null?history.length:Math.min(reviewPly,history.length);
 const displayGame=useMemo(()=>reviewPly===null?game:gameAtPly(game,shownPly),[game,reviewPly,shownPly]);
 const displayHistory=displayGame.history({verbose:true});
 const latest=displayHistory[displayHistory.length-1];
 const legal=useMemo(()=>reviewPly===null&&selected?new Set(game.moves({square:selected,verbose:true}).map(m=>m.to)):new Set<string>(),[game,selected,reviewPly]);
 const squares=useMemo(()=>{const a:Square[]=[];for(let r=8;r>=1;r--)for(const f of files)a.push(`${f}${r}` as Square);return flip?[...a].reverse():a},[flip]);
 const evalScore=materialEval(displayGame);
 const whiteShare=Math.max(8,Math.min(92,50+evalScore*4));
 const status=game.isCheckmate()?`Checkmate · ${game.turn()==='w'?'Black':'White'} wins`:game.isDraw()?'Draw':`${game.turn()==='w'?'White':'Black'} to move${game.inCheck()?' · Check':''}`;
 function chooseBotMove(g:Chess){const moves=g.moves({verbose:true});if(!moves.length)return null;const scored=moves.map(m=>({m,s:(m.captured?pieceValue[m.captured]:0)+(m.promotion?8:0)+Math.random()*(level===1?9:level===2?3.5:1)})).sort((a,b)=>b.s-a.s);return scored[Math.floor(Math.random()*Math.min(scored.length,level===1?8:level===2?4:2))].m}
 function botReply(g:Chess){if(mode!=='computer'||g.isGameOver()||g.turn()!=='b')return;setThinking(true);window.setTimeout(()=>{const b=copyGame(g);const m=chooseBotMove(b);if(m){b.move({from:m.from,to:m.to,promotion:'q'});setLast({from:m.from,to:m.to});setGame(b)}setThinking(false)},350)}
 function press(sq:Square){if(reviewPly!==null)return;setHint(null);if(thinking||game.isGameOver()||(mode==='computer'&&game.turn()==='b'))return;const p=game.get(sq);if(!selected){if(p&&p.color===game.turn())setSelected(sq);return}if(selected===sq){setSelected(null);return}try{const n=copyGame(game);n.move({from:selected,to:sq,promotion:'q'});setLast({from:selected,to:sq});setSelected(null);setGame(n);botReply(n)}catch{if(p&&p.color===game.turn())setSelected(sq);else setSelected(null)}}
 function fresh(){setGame(new Chess());setSelected(null);setLast(null);setHint(null);setThinking(false);setReviewPly(null)}
 function undo(){if(thinking)return;setReviewPly(null);const n=copyGame(game);if(mode==='computer'){n.undo();if(n.turn()==='b')n.undo()}else n.undo();const h=n.history({verbose:true});const lm=h[h.length-1];setGame(n);setSelected(null);setHint(null);setLast(lm?{from:lm.from,to:lm.to}:null)}
 function showHint(){if(reviewPly!==null)return;const moves=game.moves({verbose:true});if(!moves.length)return;const ranked=[...moves].sort((a,b)=>(b.captured?pieceValue[b.captured]:0)-(a.captured?pieceValue[a.captured]:0));setHint({from:ranked[0].from,to:ranked[0].to});setSelected(ranked[0].from)}
 function previousMove(){if(!history.length)return;setSelected(null);setHint(null);setReviewPly(Math.max(0,shownPly-1))}
 function nextMove(){if(reviewPly===null)return;const next=Math.min(history.length,shownPly+1);setSelected(null);setHint(null);setReviewPly(next>=history.length?null:next)}
 return <div className="app">
  <header><button className="head-btn" aria-label="Back">‹</button><div className="brand"><span>♟</span><b>KnightZero</b></div><button className="head-btn" aria-label="Settings" onClick={()=>setSettings(v=>!v)}>⚙</button></header>
  <main><section className="game">
   <div className="player-row opponent"><div className="avatar">KZ</div><div><b>{mode==='computer'?'KnightZero Bot':'Player 2'}</b><small>{reviewPly!==null?'Reviewing game':thinking?'Thinking…':'Ready'}</small></div></div>
   <div className="board-shell"><div className="eval-bar" aria-label={`Position evaluation ${evalScore>0?'+':''}${evalScore}`}><div className="eval-white" style={{height:`${whiteShare}%`}}/><span>{evalScore===0?'0.0':`${evalScore>0?'+':''}${evalScore.toFixed(1)}`}</span></div><div className="board" role="grid">{squares.map((sq,index)=>{const p=displayGame.get(sq);const f=files.indexOf(sq[0]);const r=Number(sq[1]);const dark=(f+r)%2===1;const target=legal.has(sq);const displayLast=latest?{from:latest.from,to:latest.to}:last;const recent=!!displayLast&&(displayLast.from===sq||displayLast.to===sq);const hinted=reviewPly===null&&!!hint&&(hint.from===sq||hint.to===sq);const row=Math.floor(index/8),col=index%8;const cellStyle:CSSProperties={left:`${col*12.5}%`,top:`${row*12.5}%`,width:'12.5%',height:'12.5%'};return <button key={sq} style={cellStyle} onClick={()=>press(sq)} className={`square ${dark?'dark':'light'} ${selected===sq?'active':''} ${recent?'recent':''} ${hinted?'hinted':''}`} aria-label={sq}>{p&&<span className={`piece ${p.color}`}>{glyph[p.color+p.type]}</span>}{target&&<i className={p?'capture':'dot'}/>} {col===0&&<span className="rank-label">{sq[1]}</span>}{row===7&&<span className="file-label">{sq[0]}</span>}</button>})}</div></div>
   <div className="player-row you-row"><div className="avatar you">YOU</div><div><b>You</b><small>{reviewPly!==null?`Move ${shownPly} of ${history.length}`:status}</small></div></div>
   <div className="move-strip"><button aria-label="Previous move" onClick={previousMove} disabled={!history.length||shownPly===0}>‹</button><div>{latest?<><span>{Math.ceil(shownPly/2)}{shownPly%2===0?'...':'.'}</span><strong>{latest.san}</strong></>:<span>Starting position</span>}</div><button aria-label="Next move" onClick={nextMove} disabled={reviewPly===null}>›</button></div>
  </section></main>
  {settings&&<div className="settings-sheet"><div className="sheet-head"><b>Game settings</b><button onClick={()=>setSettings(false)}>×</button></div><div className="tabs"><button className={mode==='computer'?'on':''} onClick={()=>{setMode('computer');fresh()}}>Computer</button><button className={mode==='local'?'on':''} onClick={()=>{setMode('local');fresh()}}>2 Players</button></div>{mode==='computer'&&<div className="levels"><span>Bot level</span>{[1,2,3,4,5].map(n=><button key={n} className={level===n?'on':''} onClick={()=>setLevel(n)}>{n}</button>)}</div>}<button className="flip-action" onClick={()=>setFlip(v=>!v)}>⇅ Flip board</button></div>}
  <nav className="bottom-bar"><button onClick={()=>setSettings(true)}>☷<span>Options</span></button><button onClick={fresh}>⚑<span>Abort</span></button><button onClick={showHint}>♙<span>Hint</span></button><button onClick={undo}>↶<span>Undo</span></button></nav>
 </div>
}
