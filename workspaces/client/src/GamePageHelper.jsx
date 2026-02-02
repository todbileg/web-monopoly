export const getColorToFirstIdMap = (boardData) => {
  return boardData.reduce((acc, space) => {
    if (space.type === 'property') {
      if (!acc[space.color] || space.id < acc[space.color]) {
        acc[space.color] = space.id;
      }
    }
    return acc;
  }, {});
};

export const getTypeToFirstIdMap = (boardData) => {
  return boardData.reduce((acc, space) => {
    if (!acc[space.type] || space.id < acc[space.type]) {
      acc[space.type] = space.id;
    }
    return acc;
  }, {});
};

export const getSideByPosition = (pos) => {
  if (pos >= 0 && pos <= 10) return "top";
  if (pos >= 11 && pos <= 19) return "right";
  if (pos >= 20 && pos <= 30) return "bottom";
  if (pos >= 31 && pos <= 39) return "left";
  return "bottom";
};

export const getTokenRotationDegForPosition = (pos) => {
  if (pos === 10) return 180;
  if (pos === 30) return 0;
  
  const side = getSideByPosition(pos);
  switch (side) {
    case "top":     return 90;
    case "right":   return 180;
    case "bottom":  return -90;
    case "left":    return 0;
    default:        return 0;
  }
}