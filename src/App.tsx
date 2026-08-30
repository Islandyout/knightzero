import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent } from 'react';
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { StockfishEngine, uciToMove } from './lib/stockfish';

const glyph:Record<string,string>={wp:'♙',wn:'♘',wb:'♗',wr:'♖',wq:'♕',wk:'♔',bp:'♟',bn:'♞',bb:'♝',br:'♜',bq:'♛',bk:'♚'};
const files='abcdefgh';
type Mode='computer'|'local';
type SideChoice='w'|'b'|'random';
type TimeKey='untimed'|'3+2'|'5+0'|'10+0'|'15+10';
type PromotionState={from:Square;to:Square;color:Color}|null;
const times:Record<TimeKey,{seconds:number|null;increment:number}>={untimed:{seconds:null,increment:0},'3+2':{seconds:180,increment:2},'5+0':{seconds:300,increment:0},'10+0':{seconds:600,increment:0},'15+10':{seconds:900,increment:10}};
const strengths=[
 {name:'Beginner',elo:1350,skill:0,time:120,limit:true},
 {name:'Casual',elo:1500,skill:3,time:170,limit:true},
 {name:'Club',elo:1700,skill:6,time:240,limit:true},
 {name:'Strong',elo:1900,skill:9,time:350,limit:true},
 {name:'Expert',elo:2200,skill:13,time:500,limit:true},
 {name:'Master',elo:2500,skill:17,time:700,limit:true},
 {name:'Maximum',elo:3000,skill:20,time:1000,limit:false}
];
function copyGame(source:Chess){const next=new Chess();const pgn=source.pgn();if(pgn)next.loadPgn(pgn);return next}
function gameAtPly(source:Chess,ply:number){const moves=source.history({verbose:true});const view=new Chess();for(let i=0;i<Math.min(ply,moves.length);i++)view.move(moves[i].san);return view}
function formatClock(value:number|null){if(value===null)return '∞';const t=Math.max(0,Math.ceil(value));const m=Math.floor(t/60);const s=t%60;return `${m}:${String(s).padStart(2,'0')}`}

export default function App(){
 const [game,setGame]=useState(()=>new Chess());
 const [selected,setSelected]=useState<Square|null>(null);
 const [flip,setFlip]=useState(false);
 const [mode,setMode]=useState<Mode>('computer');
 const [level,setLevel]=useState(3);
 const [sideChoice,setSideChoice]=useState<SideChoice>('w');
 const [playerColor,setPlayerColor]=useState<Color>('w');
 const [timeKey,setTimeKey]=useState<TimeKey>('10+0');
 const [clocks,setClocks]=useState<{w:number|null;b:number|null}>({w:600,b:600});
 const [thinking,setThinking]=useState(false);
 const [last,setLast]=useState<{from:Square;to:Square}|null>(null);
 const [settings,setSettings]=useState(false);
 const [hint,setHint]=useState<{from:Square;to:Square}|null>(null);
 const [reviewPly,setReviewPly]=useState<number|null>(null);
 const [promotion,setPromotion]=useState<PromotionState>(null);
 const [manualResult,setManualResult]=useState<string|null>(null);
 const [confirmResign,setConfirmResign]=useState(false);
 const [engineState,setEngineState]=useState<'loading'|'ready'|'error'>('loading');
 const [evalCp,setEvalCp]=useState(0);
 const [evalMate,setEvalMate]=useState<number|null>(null);
 const [engineBest,setEngineBest]=useState<string|null>(null);
 const [pv,setPv]=useState<string[]>([]);
 const playEngine=useRef<StockfishEngine|null>(null);
 const evalEngine=useRef<StockfishEngine|null>(null);

 const history=game.history({verbose:true});
 const shownPly=reviewPly===null?history.length:Math.min(reviewPly,history.length);
 const displayGame=useMemo(()=>reviewPly===null?game:gameAtPly(game,shownPly),[game,reviewPly,shownPly]);
 const displayFen=displayGame.fen();
 const displayHistory=displayGame.history({verbose:true});
 const latest=displayHistory[displayHistory.length-1];
 const legal=useMemo(()=>reviewPly===null&&selected?new Set(game.moves({square:selected,verbose:true}).map(m=>m.to)):new Set<string>(),[game,selected,reviewPly]);
 const squares=useMemo(()=>{const a:Square[]=[];for(let r=8;r>=1;r--)for(const f of files)a.push(`${f}${r}` as Square);return flip?[...a].reverse():a},[flip]);
 const gameOver=!!manualResult||game.isGameOver();
 const status=manualResult??(game.isCheckmate()?`Checkmate · ${game.turn()==='w'?'Black':'White'} wins`:game.isDraw()?'Draw':`${game.turn()==='w'?'White':'Black'} to move${game.inCheck()?' · Check':''}`);
 const normalizedEval=evalMate!==null?(evalMate>0?100000:-100000):evalCp;
 const whiteShare=50+48*Math.tanh(normalizedEval/450);
 const evalLabel=evalMate!==null?`M${Math.abs(evalMate)}`:`${evalCp>=0?'+':''}${(evalCp/100).toFixed(2)}`;
 const cfg=strengths[level-1];
 const increment=times[timeKey].increment;

 useEffect(()=>{
  try{playEngine.current=new StockfishEngine();evalEngine.current=new StockfishEngine()}catch{setEngineState('error')}
  return()=>{playEngine.current?.destroy();evalEngine.current?.destroy()}
 },[]);

 useEffect(()=>{
  let cancelled=false;
  const engine=evalEngine.current;if(!engine)return;
  engine.search(displayFen,{skill:20,movetime:260}).then(result=>{
    if(cancelled)return;
    const perspective=displayGame.turn()==='w'?1:-1;
    const cp=(result.score.cp??0)*perspective;
    const mate=result.score.mate===undefined?null:result.score.mate*perspective;
    setEvalCp(cp);setEvalMate(mate);setEngineBest(result.bestMove);setPv(result.score.pv);setEngineState('ready');
  }).catch(()=>{if(!cancelled)setEngineState('error')});
  return()=>{cancelled=true}
 },[displayFen]);

 useEffect(()=>{
  if(mode!=='computer'||reviewPly!==null||thinking||gameOver||game.turn()===playerColor)return;
  const engine=playEngine.current;if(!engine)return;
  const fen=game.fen();const mover=game.turn();setThinking(true);
  engine.search(fen,{skill:cfg.skill,movetime:cfg.time,limitStrength:cfg.limit,elo:cfg.elo}).then(result=>{
    const move=uciToMove(result.bestMove);
    if(!move)return;
    setGame(current=>{
      if(current.fen()!==fen)return current;
      const next=copyGame(current);
      try{const played=next.move({from:move.from as Square,to:move.to as Square,promotion:(move.promotion||'q') as PieceSymbol});setLast({from:played.from,to:played.to});setClocks(c=>({...c,[mover]:c[mover]===null?null:(c[mover] as number)+increment}));return next}catch{return current}
    });
  }).catch(()=>setEngineState('error')).finally(()=>setThinking(false));
 },[game,mode,playerColor,level,reviewPly,gameOver]);

 useEffect(()=>{
  if(gameOver||reviewPly!==null||times[timeKey].seconds===null)return;
  const id=window.setInterval(()=>{
    const turn=game.turn();
    setClocks(c=>({...c,[turn]:c[turn]===null?null:Math.max(0,(c[turn] as number)-0.25)}));
  },250);
  return()=>window.clearInterval(id)
 },[game,gameOver,reviewPly,timeKey]);

 useEffect(()=>{
  if(manualResult)return;
  if(clocks.w!==null&&clocks.w<=0)setManualResult('Time · Black wins');
  else if(clocks.b!==null&&clocks.b<=0)setManualResult('Time · White wins');
 },[clocks.w,clocks.b,manualResult]);

 function resetPosition(){
  const resolved:Color=sideChoice==='random'?(Math.random()<.5?'w':'b'):sideChoice;
  const base=times[timeKey].seconds;
  setPlayerColor(resolved);setFlip(mode==='computer'&&resolved==='b');setGame(new Chess());setClocks({w:base,b:base});setSelected(null);setLast(null);setHint(null);setThinking(false);setReviewPly(null);setPromotion(null);setManualResult(null);setConfirmResign(false);
 }
 function completeMove(from:Square,to:Square,promotionPiece?:PieceSymbol){
  if(reviewPly!==null||thinking||gameOver)return;
  if(mode==='computer'&&game.turn()!==playerColor)return;
  const mover=game.turn();const next=copyGame(game);
  try{const played=next.move({from,to,promotion:promotionPiece});setLast({from:played.from,to:played.to});setSelected(null);setHint(null);setPromotion(null);setGame(next);setClocks(c=>({...c,[mover]:c[mover]===null?null:(c[mover] as number)+increment}))}catch{setSelected(null)}
 }
 function attemptMove(from:Square,to:Square){
  const p=game.get(from);if(!p)return;
  if(p.type==='p'&&((p.color==='w'&&to[1]==='8')||(p.color==='b'&&to[1]==='1'))){
    const promotions=game.moves({square:from,verbose:true}).filter(m=>m.to===to&&m.promotion);
    if(promotions.length){setPromotion({from,to,color:p.color});return}
  }
  completeMove(from,to);
 }
 function press(sq:Square){
  if(reviewPly!==null||thinking||gameOver)return;setHint(null);
  if(mode==='computer'&&game.turn()!==playerColor)return;
  const p=game.get(sq);
  if(!selected){if(p&&p.color===game.turn())setSelected(sq);return}
  if(selected===sq){setSelected(null);return}
  if(legal.has(sq)){attemptMove(selected,sq);return}
  if(p&&p.color===game.turn())setSelected(sq);else setSelected(null);
 }
 function handleDragStart(sq:Square,e:DragEvent<HTMLButtonElement>){const p=game.get(sq);if(reviewPly!==null||!p||p.color!==game.turn()||(mode==='computer'&&p.color!==playerColor)){e.preventDefault();return}e.dataTransfer.setData('text/plain',sq)}
 function handleDrop(to:Square,e:DragEvent<HTMLButtonElement>){e.preventDefault();const from=e.dataTransfer.getData('text/plain') as Square;if(from&&from!==to)attemptMove(from,to)}
 function undo(){
  if(thinking)return;setReviewPly(null);setManualResult(null);const next=copyGame(game);
  if(mode==='computer'){next.undo();if(next.turn()!==playerColor)next.undo()}else next.undo();
  const h=next.history({verbose:true});const lm=h[h.length-1];setGame(next);setSelected(null);setHint(null);setLast(lm?{from:lm.from,to:lm.to}:null);
 }
 function showHint(){if(reviewPly!==null||gameOver)return;const move=uciToMove(engineBest);if(move){setHint({from:move.from as Square,to:move.to as Square});setSelected(move.from as Square)}}
 function previousMove(){if(!history.length)return;setSelected(null);setHint(null);setReviewPly(Math.max(0,shownPly-1))}
 function nextMove(){if(reviewPly===null)return;const n=Math.min(history.length,shownPly+1);setSelected(null);setHint(null);setReviewPly(n>=history.length?null:n)}
 function resign(){const loser=mode==='computer'?playerColor:game.turn();setManualResult(`Resigned · ${loser==='w'?'Black':'White'} wins`);setConfirmResign(false)}

 const topColor:Color=mode==='computer'?(playerColor==='w'?'b':'w'):'b';
 const bottomColor:Color=mode==='computer'?playerColor:'w';
 return <div className="app">
  <header><button className="head-btn" aria-label="Back">‹</button><div className="brand"><span>♟</span><b>KnightZero</b></div><button className="head-btn" aria-label="Settings" onClick={()=>setSettings(v=>!v)}>⚙</button></header>
  <main><section className="game">
   <div className="player-row opponent"><div className="avatar">KZ</div><div className="player-name"><b>{mode==='computer'?`KnightZero · ${cfg.name}`:'Player 2'}</b><small>{reviewPly!==null?'Reviewing game':thinking?'Stockfish thinking…':engineState==='error'?'Engine unavailable':'Ready'}</small></div><strong className="clock">{formatClock(clocks[topColor])}</strong></div>
   <div className="board-shell"><div className="eval-bar" aria-label={`Stockfish evaluation ${evalLabel}`}><div className="eval-white" style={{height:`${whiteShare}%`}}/><span>{engineState==='ready'?evalLabel:'…'}</span></div><div className="board" role="grid">{squares.map((sq,index)=>{const p=displayGame.get(sq);const f=files.indexOf(sq[0]);const r=Number(sq[1]);const dark=(f+r)%2===1;const target=legal.has(sq);const displayLast=latest?{from:latest.from,to:latest.to}:last;const recent=!!displayLast&&(displayLast.from===sq||displayLast.to===sq);const hinted=reviewPly===null&&!!hint&&(hint.from===sq||hint.to===sq);const row=Math.floor(index/8),col=index%8;const cellStyle:CSSProperties={left:`${col*12.5}%`,top:`${row*12.5}%`,width:'12.5%',height:'12.5%'};return <button key={sq} style={cellStyle} onClick={()=>press(sq)} draggable={reviewPly===null&&!!p} onDragStart={e=>handleDragStart(sq,e)} onDragOver={e=>e.preventDefault()} onDrop={e=>handleDrop(sq,e)} className={`square ${dark?'dark':'light'} ${selected===sq?'active':''} ${recent?'recent':''} ${hinted?'hinted':''}`} aria-label={sq}>{p&&<span className={`piece ${p.color}`}>{glyph[p.color+p.type]}</span>}{target&&<i className={p?'capture':'dot'}/>} {col===0&&<span className="rank-label">{sq[1]}</span>}{row===7&&<span className="file-label">{sq[0]}</span>}</button>})}</div></div>
   <div className="player-row you-row"><div className="avatar you">YOU</div><div className="player-name"><b>{mode==='computer'?'You':'Player 1'}</b><small>{reviewPly!==null?`Move ${shownPly} of ${history.length}`:status}</small></div><strong className="clock">{formatClock(clocks[bottomColor])}</strong></div>
   <div className="move-strip"><button aria-label="Previous move" onClick={previousMove} disabled={!history.length||shownPly===0}>‹</button><div>{latest?<><span>{Math.ceil(shownPly/2)}{shownPly%2===0?'...':'.'}</span><strong>{latest.san}</strong></>:<span>Starting position</span>}{reviewPly===null&&pv.length>1&&<small className="pv">Best line: {pv.slice(0,4).join(' ')}</small>}</div><button aria-label="Next move" onClick={nextMove} disabled={reviewPly===null}>›</button></div>
  </section></main>

  {promotion&&<div className="modal-backdrop"><div className="promotion-card"><h3>Promote pawn</h3><div>{(['q','r','b','n'] as PieceSymbol[]).map(piece=><button key={piece} onClick={()=>completeMove(promotion.from,promotion.to,piece)}>{glyph[promotion.color+piece]}</button>)}</div><button className="secondary" onClick={()=>setPromotion(null)}>Cancel</button></div></div>}
  {confirmResign&&<div className="modal-backdrop"><div className="confirm-card"><h3>Resign this game?</h3><p>This will end the current game.</p><div><button className="secondary" onClick={()=>setConfirmResign(false)}>Cancel</button><button className="danger" onClick={resign}>Resign</button></div></div></div>}
  {gameOver&&<div className="result-toast"><b>{status}</b><button onClick={resetPosition}>Rematch</button></div>}

  {settings&&<div className="settings-sheet"><div className="sheet-head"><b>Game setup</b><button onClick={()=>setSettings(false)}>×</button></div><div className="tabs"><button className={mode==='computer'?'on':''} onClick={()=>setMode('computer')}>Computer</button><button className={mode==='local'?'on':''} onClick={()=>setMode('local')}>2 Players</button></div>{mode==='computer'&&<><label className="setting-label">Your side</label><div className="choice-row"><button className={sideChoice==='w'?'on':''} onClick={()=>setSideChoice('w')}>White</button><button className={sideChoice==='random'?'on':''} onClick={()=>setSideChoice('random')}>Random</button><button className={sideChoice==='b'?'on':''} onClick={()=>setSideChoice('b')}>Black</button></div><label className="setting-label">Stockfish strength</label><div className="levels">{strengths.map((s,i)=><button title={`${s.elo} Elo`} key={s.name} className={level===i+1?'on':''} onClick={()=>setLevel(i+1)}>{i+1}</button>)}</div></>}<label className="setting-label">Time control</label><div className="time-grid">{(Object.keys(times) as TimeKey[]).map(t=><button key={t} className={timeKey===t?'on':''} onClick={()=>setTimeKey(t)}>{t==='untimed'?'∞':t}</button>)}</div><div className="sheet-actions"><button className="secondary" onClick={()=>setFlip(v=>!v)}>⇅ Flip</button><button className="start" onClick={()=>{resetPosition();setSettings(false)}}>Start New Game</button></div><div className="online-note"><b>Online play</b><span>Backend-ready phase: Supabase credentials are still required before real matchmaking can be enabled.</span></div></div>}
  <nav className="bottom-bar"><button onClick={()=>setSettings(true)}>☷<span>Options</span></button><button onClick={()=>history.length?setConfirmResign(true):resetPosition()}>⚑<span>{history.length?'Resign':'New'}</span></button><button disabled={engineState!=='ready'} onClick={showHint}>♙<span>Hint</span></button><button onClick={undo} disabled={!history.length||thinking}>↶<span>Undo</span></button></nav>
 </div>
}
