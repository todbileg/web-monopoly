import React, { useRef } from 'react';
import BoardTileModal from "./BoardTileModal.jsx";
import './BoardVisuals.css';
import houseImage from './images/other/house.png';
import hotelImage from './images/other/hotel.png';
import playerIcon from './images/other/playerIcon.png';
import { tileUrlById } from "../assets/tileUrls.js";


const BoardSpace = ({ space, imageId, side, i, isSelected, onTileClick, forwardedRef,
                    players= [], ownerColor = null, currentPlayerId,
                    vacationCash = 0, gameState, buyHouse, sellHouse, sellProperty
}) => {
  const tileUrl = tileUrlById[String(imageId)];
  const isHouseProperty = space.type === 'property';
  const isOwned = !!ownerColor;
  const popupRef = useRef(null);
  
  const getTileLocation = () => {
    const tileLocation = {
      backgroundColor: '#444464',
      position: 'relative',
      backgroundImage: isHouseProperty
        ? `linear-gradient(rgba(68, 68, 100, 0.9), rgba(68, 68, 100, 0.9)), url("${tileUrl}")`
        : 'none',
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      boxShadow: (space.type === 'utility' || space.type === 'airport')
        ? `inset 0 0 5px 1px ${space.color}`
        : 'none',
      zIndex: isSelected ? 3 : 1,}
    
    switch (side) {
    case "top":
      return { ...tileLocation, gridColumn: i + 1, gridRow: 1};
    case "right":
      return { ...tileLocation, gridColumn: 11, gridRow: i + 2};
    case "left":
      return { ...tileLocation, gridColumn: 1, gridRow: i+2};
    case "bottom":
      return { ...tileLocation, gridColumn: i + 1, gridRow: 11};
    default:
      return tileLocation;
    }
  }
  
  const getTilePriceStyle = () => {
    const tilePriceStyle = {
      position: 'absolute',
      userSelect: 'none',
      textAlign: 'center',
    }
    
    switch (side) {
      case "top":
        return { ...tilePriceStyle, right: '21%', top: '7%', transform: 'translate(0%, 0%)',};
      case "right":
        return { ...tilePriceStyle, right: '15%', top: '50%',
          transform: 'translate(50%, -50%) rotate(270deg)',};
      case "left":
        return { ...tilePriceStyle, left: '15%', top: '50%',
          transform: 'translate(-50%, -50%) rotate(90deg)',};
      case "bottom":
        return { ...tilePriceStyle, right: '21%', bottom: '7%', transform: 'translate(0%, 0%)',};
      default:
        return tilePriceStyle;
    }
  }
  
  const getTileTextStyle = () => {
    const tileTextStyle = {
      wordWrap: 'break-word',
      boxSizing: 'border-box',
      userSelect: 'none',
      fontSize: space.name.length > 10 ? '10px' : '12px',
      width: '70px',
      textAlign: 'center',
      whiteSpace: 'normal',
    }
    
    if (isHouseProperty) {
      switch (side) {
        case "top":
          return { ...tileTextStyle,
            lineHeight: '1.2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: '8vh',
            paddingRight: '0.8vh',
            height: '100%',
            margin: '0 auto',};
        case "right":
          return { ...tileTextStyle,
            lineHeight: '1.2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: '18px',
            paddingRight: '10px',
            height: '100%',
            margin: '0 auto',
          };
        case "left":
          return { ...tileTextStyle,
            lineHeight: '1.2',
            maxWidth: space.type === 'airport' ? '60px' : '70px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: '18px',
            paddingLeft: '10px',
            height: '100%',
            margin: '0 auto',
            
            };
        case "bottom":
          return { ...tileTextStyle, lineHeight: '1.2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: '4vh',
            paddingRight: '0.8vh',
            height: '100%',
            margin: '0 auto',
          };
        default:
          return tileTextStyle;
      }
    } else {
      switch (side) {
        case "top":
          return { ...tileTextStyle,
            position: 'absolute',
            left: '50%',
            top: space.id === 10 ? '10%' : space.id === 0 ? '30%' : '50%',
            transform: 'translate(-50%, -50%)',
            color: (space.type === 'chest' || space.type === 'chance') ? space.color : '#eeeeee',
            fontWeight: 'bold',};
        case "right":
          return { ...tileTextStyle, display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: (space.type === 'chest' || space.type === 'chance') ? space.color : '#eeeeee',
            fontWeight: 'bold',
            paddingLeft: (space.type === 'chest' || space.type === 'chance') ? '3.5vh' : '0.7vh',
          };
        case "left":
          return { ...tileTextStyle, display: 'flex',
            width: (space.type === 'airport') ? '50px' : '70px',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: (space.type === 'chest' || space.type === 'chance') ? space.color : '#eeeeee',
            fontWeight: 'bold',
            flexWrap: 'wrap',
            paddingRight: (space.type === 'chest' || space.type === 'chance' || space.type === 'tax') ? '3.5vh' : '0.7vh',
            
          };
        case "bottom":
          return { ...tileTextStyle, display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: (space.type === 'chest' || space.type === 'chance') ? space.color : '#eeeeee',
            fontWeight: 'bold',
            paddingTop: (space.type === 'corner') ? '6vh' : '1vh',
          };
        default:
          return tileTextStyle;
      }
    }
  }
  
  const getTileImageStyle = () => {
    const isCorner = space.type === 'corner';
    const isPrison = space.id === 10;
    const isNonHouseProperty = space.type === 'utility' || space.type === 'airport';
  
    if (isHouseProperty) {
      
      const propertyBase = {
        zIndex: 2,
        position: 'absolute',
        backgroundColor: (space.color === "#AEC6CF") ? null : space.color,
        border: space.color === "#AEC6CF" ? "none" : "1px solid black",
        borderRadius: '4px',
        userSelect: 'none',
      };
      
      switch (side) {
        case "top":
          return { ...propertyBase, right: '50%', bottom: '0%', transform: 'translate(50%, 50%)',};
        case "right":
          return { ...propertyBase, right: '100%', top: '50%', transform: 'translate(50%, -50%)',};
        case "left":
          return { ...propertyBase, left: '100%', top: '50%', transform: 'translate(-50%, -50%)',};
        case "bottom":
          return { ...propertyBase, right: '50%', top: '0%', transform: 'translate(50%, -50%)',};
        default:
          return propertyBase;
      }
    }
    
    const base = {
      filter: isCorner ? null : `drop-shadow(0 0 10px ${space.color || 'rgba(255,255,255,0.5)'})`,
      width: isCorner ? '7vh' : '3.5vh',
      height: isCorner ? '7vh' : '3.5vh',
      display: isNonHouseProperty ? 'block' : null,
      margin: isNonHouseProperty ? '0 auto' : null,
    }
    
    switch (side) {
      case "top":
        return { ...base, bottom: isPrison ? '0vh' : '0.9vh', left: isPrison ? '0.25vh' : null,};
      case "right":
        return { ...base, left: isNonHouseProperty ? '0.2vh' : '0.6vh',};
      case "left":
        return { ...base, right: isNonHouseProperty ? '0.8vh' : '0.6vh',};
      case "bottom":
        return { ...base, top: isCorner ? '1vh' : (isNonHouseProperty ? '0.9vh' : '0.6vh'),};
      default:
        return base;
    }
  };
  
  const getTileOwnerColorStyle = ( ownerColor ) => {
    const base = {
      position: 'absolute',
      width: '8vh',
      height: '2.6vh',
      borderRadius: '5px',
      userSelect: 'none',
      backgroundColor: ownerColor,
    }
    
    switch (side) {
      case "top":
        return { ...base, right: '50%', top: '0%', transform: 'translate(50%, 0%)',};
      case "right":
        return { ...base, left: '61%', top: '50%',
          transform: 'translate(0%, -50%) rotate(-90deg)',};
      case "left":
        return { ...base, right: '61%', top: '50%',
          transform: 'translate(0%, -50%) rotate(90deg)',};
      case "bottom":
        return { ...base, right: '50%', bottom: '0%', transform: 'translate(50%, 0%)',};
      default:
        return base;
    }
  }
  
  const getTokenRotationDeg = () => {
    
    if (space.id === 10) return 180;
    if (space.id === 30) return 0;
    
    switch (side) {
      case "top": return 90;
      case "right": return 180;
      case "bottom": return -90;
      case "left": return 0;
      default: return 0;
    }
  };

  const tokenRotation = getTokenRotationDeg();
  
  const live = gameState?.properties?.find(p => p.id === space.id);
  const houseCount = Number(live?.houses ?? space.houses ?? 0);
  
  return (
    
    <div
      ref={forwardedRef}
      style={{
      position: 'relative',
      gridColumn: getTileLocation().gridColumn,
      gridRow: getTileLocation().gridRow
    }}
    >
      <div
        key={space.id}
        className={`box ${isHouseProperty ? 'box-property' : ''}`}
        onClick={onTileClick}
        style={{
          ...getTileLocation(),
          gridColumn: 'auto',
          gridRow: 'auto',
          width: '100%',
          height: '100%'
        }}
      >
        {/* price OR owner color patch */}
        {space.price && (
          isOwned ? (
            <div
              className="owner-color-patch"
              style={{ ...getTileOwnerColorStyle(ownerColor) }}
            >
              {space.type === "property" && houseCount > 0 && houseCount !== 5 && (
                <div className="owner-house-overlay">
                  <img
                    src= {houseImage}
                    alt="house"
                    className="owner-house-icon"
                    draggable="false"
                  />
                  <span className="owner-house-count">× {houseCount}</span>
                </div>
              )}
              {space.type === "property" && houseCount === 5 && (
                <div className="owner-house-overlay">
                  <img
                    src= {hotelImage}
                    alt="hotel"
                    className="owner-house-icon"
                    draggable="false"
                  />
                  <span className="owner-house-count"></span>
                </div>
              )}
            </div>
          ) : (
            <div
              className="price-tag"
              style={{ ...getTilePriceStyle() }}
            >
              {space.price}$
            </div>
          )
        )}

        
        {/* text */}
        <div
          className = {isHouseProperty ? "property-name" : "non-property-name"}
          style = {{...getTileTextStyle(),}}
        >
          {space.name}
          {space.type === 'tax' && (space.id === 38 ? ` $${space.rate}` : ` ${space.rate * 100}%`)}
          {space.id === 20 && (`\n$${vacationCash}`)}
        </div>
        
        {/*image */}
        {isHouseProperty ? (
          <img
            src = {tileUrl}
            alt = ""
            draggable="false"
            className = "property-image"
            style = {{...getTileImageStyle()}}
          />
        ) : (
          <img
            src = {tileUrl}
            alt = ""
            draggable="false"
            className = "non-house-image"
            style = {{...getTileImageStyle()}}
          />
        )}
      </div>
      
      {/* player tokens */}
      <div
        className="player-tokens-container"
        style={space.id === 10 ? { display: "block" } : undefined}
      >
        {players.map((player, idx) => {
          const isCurrent = player.id === currentPlayerId;
          const onJailTile = space.id === 10;
          const anchor = onJailTile
            ? (player.in_jail
                ? { left: "8%", bottom: "8%" }
                : { right: "8%", top: "8%" }
              )
            : null;
          const spread = 14;
          const offset = onJailTile
            ? (player.in_jail
                ? { transform: `translate(${idx * spread}px, ${-idx * spread}px)` }
                : { transform: `translate(${-idx * spread}px, ${idx * spread}px)` }
              )
            : null;
      
          return (
            <div
              key={player.id}
              className={`player-token tile-player-token ${isCurrent ? "active-player-token" : ""}`}
              style={{
                backgroundColor: player.color || "#fff",
                ...(onJailTile
                  ? { position: "absolute", ...anchor, ...offset }
                  : {}),
              }}
            >
              <img
                src= {playerIcon}
                className="player-icon-image"
                alt=""
                draggable="false"
                style={{
                  transform: `rotate(${tokenRotation}deg)`,
                  transition: "transform 0.2s ease",
                }}
              />
            </div>
          );
        })}
      </div>
      
      {/* pop up */}
      <BoardTileModal
        space = {space}
        side = {side}
        isSelected = {isSelected}
        popupRef = {popupRef}
        imageId = {imageId}
        gameState={gameState}
        currentPlayerId={currentPlayerId}
        buyHouse={buyHouse}
        sellHouse={sellHouse}
        sellProperty={sellProperty}
      />
    </div>
  )
}


export default BoardSpace;