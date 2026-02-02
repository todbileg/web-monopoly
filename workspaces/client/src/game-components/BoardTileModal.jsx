import React, { useState, useLayoutEffect } from 'react';
import die from './images/other/die.png';
import downgradeArrow from './images/other/downgradeArrow.png';
import upgradeArrow from './images/other/upgradeArrow.png';
import hotel from './images/other/hotel.png';
import house from './images/other/house.png';
import trash from './images/other/trash.png';
import { tileUrlById } from "../assets/tileUrls.js";


const BoardTileModal = ({ space, side, isSelected, popupRef, imageId,
                          buyHouse, sellHouse, sellProperty}) => {
  const isHouseProperty = space.type === 'property';
  const [yOffset, setYOffset] = useState(0);
  const tileUrl = tileUrlById[String(imageId)];

  const normType = (t) => String(t ?? "").toLowerCase();
  const isPropertyType = (t) => {
    const s = normType(t);
    return s === "property" || s.endsWith(".property");
  };
  const isProperty = isPropertyType(space.type);
  
  useLayoutEffect(() => {
    if (isSelected && popupRef.current) {
      const rect = popupRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const margin = 20;

      if (rect.top < margin) {
        const adjustment = margin - rect.top;
        setYOffset(prev => prev + adjustment);
      }
      else if (rect.bottom > viewportHeight - margin) {
        const adjustment = rect.bottom - (viewportHeight - margin);
        setYOffset(prev => prev - adjustment);
      }
    } else {
      setYOffset(0);
    }
  }, [isSelected, popupRef, space]);
  
  const getPositionStyles = () => {
    const base = {
      position: 'absolute',
      zIndex: 5,
      borderColor: space.color || '#ffffff',
      borderStyle: 'solid',
      borderWidth: '0.3vh',
      userSelect: 'none',
      
      transition: 'opacity 0.15s ease-in-out, transform 0.15s ease-in-out, visibility 0.15s',
      opacity: isSelected ? 1 : 0,
      visibility: isSelected ? 'visible' : 'hidden',
      pointerEvents: isSelected ? 'auto' : 'none',
      
      backgroundImage: isHouseProperty
        ? `linear-gradient(rgba(68, 68, 100, 0.95), rgba(68, 68, 100, 0.95)), url("${tileUrl}")`
        : 'none',
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
    };
    
    
    let dynamicStyles = {};

    if (space.id === 0) dynamicStyles = {
      top: '110%',
      left: '10%',
      transform: isSelected ? 'scale(1)' : 'scale(0.95)' };
    else if (space.id === 10) dynamicStyles = {
      top: '110%',
      right: '10%',
      transform: isSelected ? 'scale(1)' : 'scale(0.95)' };
    else if (space.id === 20) dynamicStyles = {
      bottom: '110%',
      right: '10%',
      transform: isSelected ? 'scale(1)' : 'scale(0.95)' };
    else if (space.id === 30) dynamicStyles = {
      bottom: '110%',
      left: '10%',
      transform: isSelected ? 'scale(1)' : 'scale(0.95)' };
    
    else {
      switch (side) {
        case 'top':
          dynamicStyles = { top: '110%', left: '50%', transform: isSelected ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(0.95)' };
          break;
        case 'bottom':
          dynamicStyles = { bottom: '110%', left: '50%',
            transform: isSelected ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(0.95)' };
          break;
        case 'left':
          dynamicStyles = { left: '110%', top: '50%', transform: isSelected ? 'translateY(-50%) scale(1)' : 'translateY(-50%) scale(0.95)' };
          break;
        case 'right':
          dynamicStyles = { right: '110%', top: '50%', transform: isSelected ? 'translateY(-50%) scale(1)' : 'translateY(-50%) scale(0.95)' };
          break;
      }
    }
    
    if (dynamicStyles.transform) {
        dynamicStyles.transform += ` translateY(${yOffset}px)`;
    }

    return { ...base, ...dynamicStyles };
  };

  return (
    <div
      ref={popupRef}
      onMouseDown={(e) => e.stopPropagation()}
      className="popup-container"
      style={{
        ...getPositionStyles(),
      }}
    >
      <h2 className="popup-header">{space.id === 10 ? space.prisonName.toUpperCase() : space.name.toUpperCase()}</h2>
      <hr />
      {isHouseProperty && space.rent && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '8px 20px',
          fontSize: '15px',
          color: '#d1d1d1',
          paddingBottom: '0.5vh',
        }}>
          {/* Header Row */}
          <span style={{
            textAlign: 'left',
            borderBottom: '1px solid #607e91',
            paddingBottom: '2px',
            paddingTop: '1vh',
            display: 'inline !important',
            width: 'fit-content',
          }}>
            when
          </span>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{
              borderBottom: '1px solid #607e91',
              width: 'fit-content',
              paddingBottom: '2px',
              color: '#d1d1d1',
              textAlign: 'right',
              paddingTop: '1vh',
            }}>
              get
            </div>
          </div>
  
          {/* dynamic rent rows */}
          <span style={{ textAlign: 'left' }}>with rent</span>
          <span style={{ textAlign: 'right' }}>${space.rent[0]}</span>
  
          <span style={{ textAlign: 'left' }}>with one house</span>
          <span style={{ textAlign: 'right' }}>${space.rent[1]}</span>
  
          <span style={{ textAlign: 'left' }}>with two houses</span>
          <span style={{ textAlign: 'right' }}>${space.rent[2]}</span>
  
          <span style={{ textAlign: 'left' }}>with three houses</span>
          <span style={{ textAlign: 'right' }}>${space.rent[3]}</span>
  
          <span style={{ textAlign: 'left' }}>with four houses</span>
          <span style={{ textAlign: 'right' }}>${space.rent[4]}</span>
  
          <span style={{ textAlign: 'left' }}>with a hotel</span>
          <span style={{ textAlign: 'right' }}>${space.rent[5]}</span>
          
          {isProperty && (
            <>
              <div style={{ display: "flex", gap: "10px", marginTop: "6px", alignItems: "center" }}>
                    <button
                      className="house-action-btn"
                      onClick={() => buyHouse(space.id, 1)}
                      disabled={false}
                      title="b"
                    >
                      <img src= {upgradeArrow} alt="upgrade" className="house-action-icon" />
                    </button>
              
                    <button
                      className="house-action-btn"
                      onClick={() => sellHouse(space.id, 1)}
                      disabled={false}
                      title="b"
                    >
                      <img src= {downgradeArrow} alt="downgrade" className="house-action-icon" />
                    </button>
                  </div>
              
                  {/* Right column (under prices): sell property */}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "6px" }}>
                    <button
                      className="house-action-btn"
                      onClick={() => sellProperty(space.id)}
                      disabled={false}
                      title="b"
                    >
                      <img src= {trash} alt="trash" className="house-action-icon" />
                    </button>
                  </div>

            </>
          )}
          
        </div>
      )}
      
      <hr />
      { space.type === 'property' && space.rent && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          textAlign: 'center',
          fontSize: '17px',
          color: '#eeeeee',
          alignItems: 'end',
          gap: '10px',
          paddingTop: '1vh',
        }}>
          {/* left column price */}
          <div>
            <div style={{ color: '#eeeeee' }}>Price</div>
            <div style={{ fontWeight: 'bold' }}>${space.price}</div>
          </div>
        
          {/* middle column house cost */}
          <div>
            <img
              src= {house}
              alt="house"
              style={{ height: '30px', marginBottom: '-9px' }}
            />
            <div style={{ fontWeight: 'bold' }}>${space.house_cost}</div>
          </div>
        
          {/* right column hotel cost */}
          <div>
            <img
              src= {hotel}
              alt="hotel"
              style={{ height: '30px', marginBottom: '-9px' }}
            />
            <div style={{ fontWeight: 'bold' }}>${space.house_cost}</div>
          </div>
        </div>
      ) }
      
      {space.type === 'chest' && (
        <div style={{fontSize: '2vh', paddingTop: '0.5vh'}}>
          Feeling Lucky?
        </div>
      )}
      
      {space.type === 'chance' && (
        <div style={{fontSize: '2vh', paddingTop: '0.5vh'}}>
          Feeling Adventurous?
        </div>
      )}
      
      {space.type === 'tax' && (
        <div style={{fontSize: '2vh', paddingTop: '0.5vh'}}>
          {space.id === 38
            ? `Pay Up $${space.rate}`
            : `Pay Up ${space.rate * 100}% of Your Money`
          }
        </div>
      )}
      
      {space.id === 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          rowGap: '12px',
          fontSize: '14px',
          color: '#eeeeee',
          marginTop: '15px'
        }}>
          {/* header row */}
          <div style={{ textAlign: 'left' }}>
            <span style={{ borderBottom: '1px solid #607e91', paddingBottom: '2px', display: 'inline-block' }}>
              when
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ borderBottom: '1px solid #607e91', width: 'fit-content', paddingBottom: '2px'}}>
              get
            </div>
          </div>
      
          {/* middle row */}
          <div style={{ textAlign: 'left' }}>Pass Through</div>
          <div style={{ textAlign: 'right' }}>$200</div>
      
          {/* bottom row */}
          <div style={{ textAlign: 'left' }}>Land On</div>
          <div style={{ textAlign: 'right' }}>$300</div>
        </div>
      )}
      
      {space.type === 'airport' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '8px 20px',
          fontSize: '15px',
          color: '#d1d1d1',
          paddingBottom: '0.5vh',
        }}>
          {/* header row */}
          <div style={{ textAlign: 'left' }}>
            <span style={{
              borderBottom: '1px solid #607e91',
              paddingBottom: '2px',
              paddingTop: '1vh',
              display: 'inline-block',
              width: 'fit-content',
            }}>when</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{
              borderBottom: '1px solid #607e91',
              width: 'fit-content',
              paddingBottom: '2px',
              color: '#d1d1d1',
              textAlign: 'right',
              paddingTop: '1vh',
            }}>
              get
            </div>
          </div>
      
          {/* airport ownership rows */}
          <span style={{ textAlign: 'left' }}>1 airport owned</span>
          <span style={{ textAlign: 'right' }}>$25</span>
      
          <span style={{ textAlign: 'left' }}>2 airports owned</span>
          <span style={{ textAlign: 'right' }}>$50</span>
      
          <span style={{ textAlign: 'left' }}>3 airports owned</span>
          <span style={{ textAlign: 'right' }}>$100</span>
      
          <span style={{ textAlign: 'left' }}>4 airports owned</span>
          <span style={{ textAlign: 'right' }}>$200</span>
          
        </div>
      )}
      
      {space.type === 'utility' && (
        <div style={{
          fontSize: '15px',
          color: '#d1d1d1',
          paddingTop: '1vh',
          lineHeight: '1.5'
        }}>
          <div style={{ marginBottom: '8px' }}>
            If one company is owned, get $4 &times;
            <img
              src= {die}
              alt="die"
              style={{ height: '18px', verticalAlign: 'middle', marginLeft: '6px' }}
            />
          </div>
          <div>
            If two companies are owned, get $10 &times;
            <img
              src= {die}
              alt="die"
              style={{ height: '18px', verticalAlign: 'middle', marginLeft: '6px' }}
            />
          </div>
        </div>
      )}
      
      {(space.type === 'airport' || space.type === 'utility') && (
        <>
          <hr style={{ border: 'none', height: '1px', backgroundColor: '#607e91', margin: '15px 0' }} />
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            fontSize: '14px',
            color: '#eeeeee',
            gap: '4px'
          }}>
            <div style={{ color: '#eeeeee' }}>Price</div>
            <div style={{ fontWeight: 'bold', fontSize: '18px' }}>${space.price}</div>
          </div>
        </>
      )}
      
      {(space.id === 30) && (
        <div style={{fontSize: '2vh', paddingTop: '0.5vh'}}>
          Kiss Men
        </div>
      )}
      
      {space.id === 20 && (
        <div style={{fontSize: '1.7vh', paddingTop: '0.5vh'}}>
          Skip A Turn And Collect All Vacation Cash
        </div>
      )}
    </div>
  );
};

export default BoardTileModal;