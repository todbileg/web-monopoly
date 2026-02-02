import { useState, useCallback } from 'react';

const API_BASE_URL = 'http://127.0.0.1:8000/game';

export const useGameState = () => {
  const [gameState, setGameState] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshGameState = useCallback(async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/${id}`);
      if (!response.ok) throw new Error('Failed to fetch game state');
      const data = await response.json();
      setGameState(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  }, []);

  const createGame = useCallback(async (players) => {
    if (!players || players.length < 2) return;
  
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_names: players.map(p => p.name),
          player_colors: players.map(p => p.color),
        }),
      });
  
      const data = await response.json();
      setGameId(data.game_id);
      setGameState(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRoll = useCallback(async (jailOption = null) => {
    if (!gameState || !gameId) return;
  
    const currentPlayer = gameState.players[gameState.current_player_index];
  
    try {
      const body = {
        game_id: gameId,
        player_id: currentPlayer.id,
      };
      
      if (jailOption) {
        body.jail_option = jailOption;
      }
  
      const response = await fetch(`${API_BASE_URL}/roll-dice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
  
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Roll failed');
      }
  
      const rollData = await response.json();
  
      setGameState(prev => ({
        ...prev,
        dice_values: rollData.dice_values,
        game_phase: 'rolling',
      }));
  
      setTimeout(() => {
        refreshGameState(gameId);
      }, 600);
  
    } catch (err) {
      console.error("Roll error:", err);
      setError(err.message);
    }
  }, [gameState, gameId, refreshGameState]);

  const buyProperty = useCallback(async (propertyId) => {
    if (!gameState || !gameId) return;

    const currentPlayer = gameState.players[gameState.current_player_index];

    try {
      const response = await fetch(`${API_BASE_URL}/buy-property`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          player_id: currentPlayer.id,
          property_id: propertyId
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Purchase failed');
      }
      
      const updatedGame = await response.json();
      setGameState(updatedGame);

    } catch (err) {
      console.error("Buy error:", err);
      setError(err.message);
    }
  }, [gameState, gameId]);

  const endTurn = useCallback(async () => {
    if (!gameId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/${gameId}/end-turn`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to end turn');

      const updatedGame = await response.json();
      setGameState(updatedGame);

    } catch (err) {
      setError(err.message);
    }
  }, [gameId]);

  const resetGame = useCallback(async () => {
    if (!gameId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/${gameId}/reset`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to reset game');

      const updatedGame = await response.json();
      setGameState(updatedGame);

    } catch (err) {
      setError(err.message);
    }
  }, [gameId]);

  const buyHouse = useCallback(async (propertyId, count = 1) => {
    if (!gameState || !gameId) return;
  
    const currentPlayer = gameState.players[gameState.current_player_index];
  
    const response = await fetch(`${API_BASE_URL}/buy-house`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_id: gameId,
        player_id: currentPlayer.id,
        property_id: propertyId,
        count
      }),
    });
  
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || 'Buy house failed');
    }
  
    const updatedGame = await response.json();
    setGameState(updatedGame);
  }, [gameState, gameId]);
  
  const sellHouse = useCallback(async (propertyId, count = 1) => {
    if (!gameState || !gameId) return;
  
    const currentPlayer = gameState.players[gameState.current_player_index];
  
    const response = await fetch(`${API_BASE_URL}/sell-house`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_id: gameId,
        player_id: currentPlayer.id,
        property_id: propertyId,
        count
      }),
    });
  
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || 'Sell house failed');
    }
  
    const updatedGame = await response.json();
    setGameState(updatedGame);
  }, [gameState, gameId]);
  
  const sellProperty = useCallback(async (propertyId) => {
    if (!gameState || !gameId) return;
  
    const currentPlayer = gameState.players[gameState.current_player_index];
  
    try {
      const response = await fetch(`${API_BASE_URL}/sell-property`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          player_id: currentPlayer.id,
          property_id: propertyId,
        }),
      });
  
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Sell property failed');
      }
  
      const updatedGame = await response.json();
      setGameState(updatedGame);
  
    } catch (err) {
      console.error("Sell property error:", err);
      setError(err.message);
    }
  }, [gameState, gameId]);
  
  const bankrupt = useCallback(async () => {
    if (!gameState || !gameId) return;

    const currentPlayer = gameState.players[gameState.current_player_index];

    const ok = window.confirm(`${currentPlayer.name}: Declare bankruptcy and leave the game?`);
    if (!ok) return;

    try {
      const response = await fetch(`${API_BASE_URL}/bankrupt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          player_id: currentPlayer.id,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Bankruptcy failed');
      }

      const data = await response.json();

      setGameState(data.game);

    } catch (err) {
      console.error("Bankrupt error:", err);
      setError(err.message);
    }
  }, [gameState, gameId]);
  
  const listTrades = useCallback(async () => {
    if (!gameId) return [];
    try {
      const response = await fetch(`${API_BASE_URL}/${gameId}/trades`);
      if (!response.ok) throw new Error("Failed to fetch trades");
      return await response.json(); // list of TradeOffer
    } catch (err) {
      console.error("List trades error:", err);
      setError(err.message);
      return [];
    }
  }, [gameId]);

  const proposeTrade = useCallback( async (toPlayerId, offer, request, note = "") => {
      if (!gameState || !gameId) return;

      const fromPlayer = gameState.players[gameState.current_player_index];

      try {
        const response = await fetch(`${API_BASE_URL}/trade/propose`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            game_id: gameId,
            from_player_id: fromPlayer.id,
            to_player_id: toPlayerId,
            offer,
            request,
            note,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || "Trade propose failed");
        }

        const data = await response.json();
        setGameState(data.game);
        return data.trade;
      } catch (err) {
        console.error("Propose trade error:", err);
        setError(err.message);
      }
    }, [gameState, gameId] );

  const acceptTrade = useCallback( async (tradeId) => {
      if (!gameState || !gameId) return;
      const currentPlayer = gameState.players[gameState.current_player_index];

      try {
        const response = await fetch(`${API_BASE_URL}/trade/${tradeId}/accept`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            game_id: gameId,
            player_id: currentPlayer.id,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || "Accept trade failed");
        }

        const data = await response.json();
        setGameState(data.game);
        return data.trade;
      } catch (err) {
        console.error("Accept trade error:", err);
        setError(err.message);
      }
    }, [gameState, gameId] );

  const declineTrade = useCallback( async (tradeId) => {
      if (!gameState || !gameId) return;
      const currentPlayer = gameState.players[gameState.current_player_index];

      try {
        const response = await fetch(`${API_BASE_URL}/trade/${tradeId}/decline`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            game_id: gameId,
            player_id: currentPlayer.id,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || "Decline trade failed");
        }

        const data = await response.json();
        setGameState(data.game);
        return data.trade;
      } catch (err) {
        console.error("Decline trade error:", err);
        setError(err.message);
      }
    }, [gameState, gameId] );

  const cancelTrade = useCallback( async (tradeId) => {
      if (!gameState || !gameId) return;
      const currentPlayer = gameState.players[gameState.current_player_index];

      try {
        const response = await fetch(`${API_BASE_URL}/trade/${tradeId}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            game_id: gameId,
            player_id: currentPlayer.id,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || "Cancel trade failed");
        }

        const data = await response.json();
        setGameState(data.game);
        return data.trade;
      } catch (err) {
        console.error("Cancel trade error:", err);
        setError(err.message);
      }
    }, [gameState, gameId] );
  
  return {
    gameState,
    gameId,
    error,
    isLoading,
    createGame,
    handleRoll,
    buyProperty,
    endTurn,
    resetGame,
    refreshGameState,
    buyHouse,
    sellHouse,
    sellProperty,
    bankrupt,
    listTrades,
    proposeTrade,
    acceptTrade,
    declineTrade,
    cancelTrade
  };
};