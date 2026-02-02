import React, { useState, useEffect } from 'react';
import './BoardVisuals.css';
import { getColorToFirstIdMap, getTypeToFirstIdMap } from '../GamePageHelper.jsx';
import BoardSpace from "./BoardSpace.jsx";
import {apiUrl} from "./urls.js";

const BoardVisuals = () => {
  
  const [boardData, setBoardData] = useState([]);
  const [activeSpaceId, setActiveSpaceId] = useState(null);

  const handleTileClick = (id) => {
    setActiveSpaceId(prevId => (prevId === id ? null : id));
  };
  
  useEffect(() => {

    fetch(`${apiUrl}/game/board`, {
    })
      .then(res => res.json())
      .then(data => setBoardData(data))
      .catch(err => console.error("Fetch error:", err));
  }, []);

  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (!e.target.closest('.box')) {
        setActiveSpaceId(null);
      }
    };
    document.addEventListener("mousedown", handleGlobalClick);
    return () => document.removeEventListener("mousedown", handleGlobalClick);
  }, []);
  
  if (boardData.length === 0) return <div style={{color: 'white'}}>Loading...</div>;
  
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

    return (
      <BoardSpace
        key={space.id}
        space={space}
        imageId={imageId}
        side={side}
        i={i}
        isSelected={activeSpaceId === space.id}
        onTileClick={() => handleTileClick(space.id)}
      />
    );
  };
  
  return (
    <div className="board-wrapper">
      <div className="grid-container">
        {topRow.map((space, i) => renderSpace(space, i, "top"))}
        {rightSide.map((space, i) => renderSpace(space, i, "right"))}
        {bottomRow.map((space, i) => renderSpace(space, i, "bottom"))}
        {leftSide.map((space, i) => renderSpace(space, i, "left"))}

        <div className="board-center">
          <h1>Monopoly</h1>
        </div>
      </div>
    </div>
  );
};

export default BoardVisuals;