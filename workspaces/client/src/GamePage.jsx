import React, { useState, useEffect, useRef } from 'react';
import './game-components/BoardVisuals.css';
import { getColorToFirstIdMap, getTypeToFirstIdMap, getTokenRotationDegForPosition,
} from './GamePageHelper.jsx';
import BoardSpace from "./game-components/BoardSpace.jsx";
import { useGameState } from "./hooks/useGameState.jsx";
import playerIcon from './game-components/images/other/playerIcon.png';
import TradeSidebar from "./game-components/TradeSidebar.jsx";
import {apiUrl} from "./game-components/urls.js";

const GamePage = () => {
  const {
    gameState,
    createGame,
    handleRoll,
    buyProperty,
    endTurn,
    buyHouse,
    sellHouse,
    sellProperty,
    bankrupt,
    resetGame,
    proposeTrade,
    acceptTrade,
    declineTrade,
    cancelTrade
  } = useGameState();

  const tileRefs = useRef({});
  const [boardData, setBoardData] = useState([]);
  const [activeSpaceId, setActiveSpaceId] = useState(null);
  const prevGameStateRef = useRef(null);
  const [playerColors, setPlayerColors] = useState([]);
  
  useEffect(() => {
  
    fetch(`${apiUrl}/game/board`)
      .then(res => res.json())
      .then(data => setBoardData(data))
      .catch(err => console.error("Fetch error:", err));
  
    fetch(`${apiUrl}/game/player-colors`)
      .then(res => res.json())
      .then(colors => setPlayerColors(colors))
      .catch(err => console.error("Fetch colors error:", err));
  }, []);
  
  const handleTileClick = (id) => {
    setActiveSpaceId(prevId => (prevId === id ? null : id));
  };

  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (!e.target.closest('.box')) setActiveSpaceId(null);
    };
    document.addEventListener("mousedown", handleGlobalClick);
    return () => document.removeEventListener("mousedown", handleGlobalClick);
  }, []);
  
  const [showNewGame, setShowNewGame] = useState(true);
  const [playerCount, setPlayerCount] = useState(2);
  const [setupPlayers, setSetupPlayers] = useState(() =>
    Array.from({ length: 2 }, (_, i) => ({
      name: "",
      color: playerColors[i % playerColors.length],
    }))
  );
  
  const handlePlayerCountChange = (e) => {
    const newCount = parseInt(e.target.value, 10);
  
    setPlayerCount(newCount);
  
    setSetupPlayers((prev) => {
      const next = prev.slice(0, newCount);
  
      while (next.length < newCount) {
        const i = next.length;
        next.push({
          name: "",
          color: playerColors[i % playerColors.length],
        });
      }
  
      return next;
    });
  };
  
  const startNewGame = async () => {
    const players = setupPlayers.map((p, i) => ({
      name: (p.name || "").trim() || `Player ${i + 1}`,
      color: p.color,
    }));
  
    await createGame(players);
    setShowNewGame(false);
  };

  useEffect(() => {
    if (!gameState) return;
  
    const prev = prevGameStateRef.current;
    prevGameStateRef.current = gameState;
  
    if (!prev) return;
  
    const prevCurrent = prev.players[prev.current_player_index];
    const currCurrent = gameState.players[gameState.current_player_index];
  
    if (!prevCurrent || !currCurrent) return;
  
    const justSentToJail =
      prevCurrent.id === currCurrent.id &&
      prevCurrent.in_jail === false &&
      currCurrent.in_jail === true &&
      gameState.game_phase === "waiting";
  
    if (justSentToJail) {
      endTurn();
    }
  }, [gameState, endTurn]);
  
  if (boardData.length === 0) {
    return <div style={{ color: 'white' }}>Loading Game...</div>;
  }
  
  const newGameModal = showNewGame && (
    <div className="newgame-overlay">
      <div className="newgame-modal">
        <h2 className="newgame-title">New Game</h2>
  
        <div className="newgame-row">
          <label>Players:</label>
          
          <select
            value={playerCount}
            onChange={handlePlayerCountChange}
          >
          
            {Array.from({ length: 7 }, (_, i) => i + 2).map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
  
        <div className="newgame-playerlist">
          {setupPlayers.map((p, idx) => (
            <div key={idx} className="newgame-playerline">
              <div
                className="newgame-token"
                style={{ backgroundColor: p.color }}
                title={p.color}
              >
                <img src= {playerIcon} alt="" className="newgame-token-icon" draggable="false" />
              </div>
  
              <input
                className="newgame-nameinput"
                value={p.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setSetupPlayers(prev => {
                    const next = [...prev];
                    next[idx] = { ...next[idx], name: val };
                    return next;
                  });
                }}
                placeholder={`Insert Player ${idx + 1} Name`}
              />
  
              <select
                className="newgame-colorselect"
                value={p.color}
                onChange={(e) => {
                  const val = e.target.value;
                  setSetupPlayers(prev => {
                    const next = [...prev];
                    next[idx] = { ...next[idx], color: val };
                    return next;
                  });
                }}
              >
                {playerColors.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
  
        <div className="newgame-actions">
          {gameState && (
            <button className="newgame-secondary" onClick={() => setShowNewGame(false)}>
              Cancel
            </button>
          )}
          <button className="newgame-primary" onClick={startNewGame}>
            Start Game
          </button>
        </div>
      </div>
    </div>
  )
  
  if (!gameState) {
    return <div className="board-layout">{newGameModal}</div>;
  }
  
  const isDoubles = gameState?.dice_values?.[0] === gameState?.dice_values?.[1];
  const hasRolled = gameState?.game_phase === 'action';
  const canRoll = gameState?.game_phase === 'waiting' || (hasRolled && isDoubles && gameState?.doubles_count < 3);
  const canEndTurn = hasRolled && (!isDoubles || gameState?.doubles_count >= 3) ;
  
  const currentPlayer = gameState.players[gameState.current_player_index];
  const currentPlayerId = currentPlayer.id;
  
  const colorToFirstId = getColorToFirstIdMap(boardData);
  const typeToFirstID = getTypeToFirstIdMap(boardData);

  const topRow = boardData.slice(0, 11);
  const rightSide = boardData.slice(11, 20);
  const bottomRow = boardData.slice(20, 31).reverse();
  const leftSide = boardData.slice(31, 40).reverse();
  
  const renderSpace = (space, i, side) => {
    let imageId = typeToFirstID[space.type];
    if (space.type === 'property') imageId = colorToFirstId[space.color];
    if (space.type === 'corner' || space.type === 'utility') imageId = space.id;

    const playersOnThisTile = gameState.players.filter(p => p.position === space.id);
    const liveSpace = gameState.properties.find(p => p.id === space.id);
    const mergedSpace = { ...space, ...(liveSpace || {}) };
    const owner = mergedSpace?.owner ?? null;

    
    const ownerPlayer =
      owner == null
        ? null
        : gameState.players.find((p, idx) =>
            p.id === owner ||
            p.name === owner ||
            idx === owner
          );
  
    const ownerColor = ownerPlayer?.color ?? null;
    
    return (
      <BoardSpace
        key={space.id}
        space={space}
        imageId={imageId}
        side={side}
        i={i}
        isSelected={activeSpaceId === space.id}
        onTileClick={() => handleTileClick(space.id)}
        forwardedRef={(el) => (tileRefs.current[space.id] = el)}
        players={playersOnThisTile}
        ownerColor={ownerColor}
        currentPlayerId={currentPlayerId}
        vacationCash={gameState.vacation_cash}
        gameState={gameState}
        buyHouse={buyHouse}
        sellHouse={sellHouse}
        sellProperty={sellProperty}
      />
    );
  };

  return (
    <div className="board-layout">
      {/* new game stuff */}
      {newGameModal}
      
      {/* main board screen */}
      <div className="board-anchor">
        <div className = "board-wrapper">
          <div className = "grid-container">
            {topRow.map((space, i) => renderSpace(space, i, "top"))}
            {rightSide.map((space, i) => renderSpace(space, i, "right"))}
            {bottomRow.map((space, i) => renderSpace(space, i, "bottom"))}
            {leftSide.map((space, i) => renderSpace(space, i, "left"))}
            
            {/* center of the board */}
            <div className = "board-center">
              {gameState && (
                <div className = "game-controls">
                  <h2>{gameState.players[gameState.current_player_index].name}'s Turn</h2>
                  <p>Balance: ${gameState.players[gameState.current_player_index].money}</p>
                  
                  <div className = "action-buttons">
                    
                    {!currentPlayer.in_jail && (
                      <button onClick = {() => handleRoll()} disabled = {!canRoll}>
                        Roll Dice
                      </button>
                    )}
                    
                    {currentPlayer.in_jail && (
                      <>
                        <button onClick = {() => handleRoll()} disabled = {!canRoll}>
                          Roll for Doubles
                        </button>
                        
                        <button onClick = {() => handleRoll("pay")} disabled = {currentPlayer.money < 50}>
                          Pay $50 Fine
                        </button>
                        
                        <button onClick = {() => handleRoll("card")} disabled = {currentPlayer.jail_cards <= 0}>
                          Use Jail Card ({currentPlayer.jail_cards})
                        </button>
                      </>
                    )}
                    
                    
                    {(() => {
                    const currentPlayer = gameState.players[gameState.current_player_index];
                    const currentSpace = gameState.properties.find(p => p.id === currentPlayer.position);
                    
                    const canBuy =
                      gameState.game_phase === 'action' &&
                      !gameState.no_buy_this_turn &&
                      currentSpace?.price &&
                      currentSpace.owner === null &&
                      currentPlayer.money >= currentSpace.price;
                    
                    if (canBuy) {
                      return (
                        <button
                          onClick = {() => buyProperty(currentSpace.id)}
                          className = "buy-button-center"
                        >
                          Buy for ${currentSpace.price}
                        </button>
                      );
                    }
                    return null;
                  })()}
                    
                    <button onClick = {endTurn} disabled = {!canEndTurn}>
                      End Turn
                    </button>
                  </div>
                  
                  <div className = "dice-display">
                    {gameState.dice_values[0]} | {gameState.dice_values[1]}
                  </div>
                  
                  <div className = "message-log">
                    <div className = "message-log-title"/>
                    <div className = "message-log-list">
                      {[...(gameState.log || [])].slice().reverse().map((msg, idx) => (
                        <div key = {idx} className = "message-log-item">
                          {msg}
                        </div>
                      ))}
                    </div>
                  </div>
                
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      
      {/* sidebar */}
      <div className="right-sidebars">
        <div className="player-sidebar">
          <div className="player-sidebar-title">Players</div>
        
          <div className="player-sidebar-list">
            {gameState.players.map((p) => {
              const rotation = getTokenRotationDegForPosition(p.position);
              const isActive = p.id === currentPlayerId;
        
              return (
                <div key={p.id} className="player-sidebar-item-grid">
                  <div className={`player-sidebar-row ${isActive ? "active-player-row" : ""}`}>
                    <div
                      className="player-sidebar-token"
                      style={{ backgroundColor: p.color || "#fff" }}
                    >
                      <img
                        src= {playerIcon}
                        alt=""
                        draggable="false"
                        className="player-sidebar-icon"
                        style={{ transform: `rotate(${rotation}deg)` }}
                      />
                    </div>
        
                    <div className="player-sidebar-name">{p.name}</div>
                    <div className="player-sidebar-money">${p.money}</div>
                  </div>
        
                  {isActive && gameState.game_phase !== "ended" ? (
                    <button className="bankrupt-btn" onClick={bankrupt}>
                      Bankrupt
                    </button>
                  ) : (
                    <div className="bankrupt-btn-placeholder" />
                  )}
  
                </div>
              );
            })}
          </div>
          
          {gameState.game_phase === "ended" && (
                <button onClick={resetGame} className="reset-btn">
                  Reset Game
                </button>
              )}
        </div>
        
        <TradeSidebar
            gameState={gameState}
            currentPlayerId={currentPlayerId}
            proposeTrade={proposeTrade}
            acceptTrade={acceptTrade}
            declineTrade={declineTrade}
            cancelTrade={cancelTrade}
          />
        
      </div>

    </div>
  );
};

export default GamePage;