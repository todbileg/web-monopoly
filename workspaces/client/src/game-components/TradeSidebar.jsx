import React, { useMemo, useState } from "react";

export default function TradeSidebar({
  gameState,
  currentPlayerId,
  proposeTrade,
  acceptTrade,
  declineTrade,
  cancelTrade,
}) {
  const [mode, setMode] = useState("propose");

  const [toPlayerId, setToPlayerId] = useState(() => {
    const other = gameState.players.find((p) => p.id !== currentPlayerId);
    return other ? other.id : null;
  });

  const [offerMoney, setOfferMoney] = useState(0);
  const [offerCards, setOfferCards] = useState(0);
  const [offerProps, setOfferProps] = useState([]);

  const [reqMoney, setReqMoney] = useState(0);
  const [reqCards, setReqCards] = useState(0);
  const [reqProps, setReqProps] = useState([]);

  const trades = useMemo(() => {
    const dict = gameState.trades || {};
    return Object.values(dict);
  }, [gameState.trades]);

  const incoming = useMemo(
    () =>
      trades.filter(
        (t) => t.status === "pending" && t.to_player_id === currentPlayerId
      ),
    [trades, currentPlayerId]
  );

  const outgoing = useMemo(
    () =>
      trades.filter(
        (t) => t.status === "pending" && t.from_player_id === currentPlayerId
      ),
    [trades, currentPlayerId]
  );

  const currentPlayer = gameState.players.find((p) => p.id === currentPlayerId);

  const partner = gameState.players.find((p) => p.id === toPlayerId);

  const myOwnedProps = useMemo(() => {
    return gameState.properties.filter(
      (sp) =>
        sp.owner === currentPlayerId &&
        ["property", "airport", "utility"].includes(sp.type)
    );
  }, [gameState.properties, currentPlayerId]);

  const partnerOwnedProps = useMemo(() => {
    if (!toPlayerId) return [];
    return gameState.properties.filter(
      (sp) =>
        sp.owner === toPlayerId &&
        ["property", "airport", "utility"].includes(sp.type)
    );
  }, [gameState.properties, toPlayerId]);

  const toggleIdInList = (list, id) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const submitTrade = async () => {
    if (!toPlayerId) return;

    const offer = {
      money: Number(offerMoney) || 0,
      property_ids: offerProps,
      jail_cards: Number(offerCards) || 0,
    };

    const request = {
      money: Number(reqMoney) || 0,
      property_ids: reqProps,
      jail_cards: Number(reqCards) || 0,
    };

    await proposeTrade(toPlayerId, offer, request, "");
    setOfferMoney(0);
    setOfferCards(0);
    setOfferProps([]);
    setReqMoney(0);
    setReqCards(0);
    setReqProps([]);
    setMode("outgoing");
  };

  const formatSide = (side) => {
    const parts = [];
    if (side.money) parts.push(`$${side.money}`);
    if (side.jail_cards) parts.push(`${side.jail_cards} Jail Card(s)`);
    if (side.property_ids?.length) parts.push(`${side.property_ids.length} Property(ies)`);
    return parts.length ? parts.join(" + ") : "Nothing";
  };

  return (
    <div className="trade-sidebar">
      <div className="trade-sidebar-title">Trading</div>

      <div className="trade-tabs">
        <button
          className={`trade-tab ${mode === "propose" ? "active" : ""}`}
          onClick={() => setMode("propose")}
        >
          Propose
        </button>
        <button
          className={`trade-tab ${mode === "incoming" ? "active" : ""}`}
          onClick={() => setMode("incoming")}
        >
          Incoming ({incoming.length})
        </button>
        <button
          className={`trade-tab ${mode === "outgoing" ? "active" : ""}`}
          onClick={() => setMode("outgoing")}
        >
          Outgoing ({outgoing.length})
        </button>
      </div>

      {mode === "propose" && (
        <div className="trade-panel">
          <div className="trade-row">
            <label>Trade with:</label>
            <select
              value={toPlayerId ?? ""}
              onChange={(e) => setToPlayerId(Number(e.target.value))}
            >
              {gameState.players
                .filter((p) => p.id !== currentPlayerId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="trade-grid">
            {/* Offer */}
            <div className="trade-col">
              <div className="trade-col-title">You Offer</div>

              <label className="trade-label">Money</label>
              <input
                type="number"
                min="0"
                value={offerMoney}
                onChange={(e) => setOfferMoney(e.target.value)}
              />

              <label className="trade-label">Jail Cards</label>
              <input
                type="number"
                min="0"
                max={currentPlayer?.jail_cards ?? 0}
                value={offerCards}
                onChange={(e) => setOfferCards(e.target.value)}
              />

              <div className="trade-label">Properties</div>
              <div className="trade-prop-list">
                {myOwnedProps.map((sp) => (
                  <label key={sp.id} className="trade-prop-item">
                    <input
                      type="checkbox"
                      checked={offerProps.includes(sp.id)}
                      onChange={() => setOfferProps((prev) => toggleIdInList(prev, sp.id))}
                    />
                    {sp.name}
                  </label>
                ))}
                {myOwnedProps.length === 0 && (
                  <div className="trade-muted">No tradable properties.</div>
                )}
              </div>
            </div>

            {/* Request */}
            <div className="trade-col">
              <div className="trade-col-title">You Request</div>

              <label className="trade-label">Money</label>
              <input
                type="number"
                min="0"
                value={reqMoney}
                onChange={(e) => setReqMoney(e.target.value)}
              />

              <label className="trade-label">Jail Cards</label>
              <input
                type="number"
                min="0"
                max={partner?.jail_cards ?? 0}
                value={reqCards}
                onChange={(e) => setReqCards(e.target.value)}
              />

              <div className="trade-label">Properties</div>
              <div className="trade-prop-list">
                {partnerOwnedProps.map((sp) => (
                  <label key={sp.id} className="trade-prop-item">
                    <input
                      type="checkbox"
                      checked={reqProps.includes(sp.id)}
                      onChange={() => setReqProps((prev) => toggleIdInList(prev, sp.id))}
                    />
                    {sp.name}
                  </label>
                ))}
                {partnerOwnedProps.length === 0 && (
                  <div className="trade-muted">Partner has no tradable properties.</div>
                )}
              </div>
            </div>
          </div>

          <button className="trade-submit" onClick={submitTrade}>
            Send Trade Offer
          </button>
        </div>
      )}

      {mode === "incoming" && (
        <div className="trade-panel">
          {incoming.length === 0 ? (
            <div className="trade-muted">No incoming trades.</div>
          ) : (
            incoming.map((t) => (
              <div key={t.trade_id} className="trade-card">
                <div className="trade-card-title">
                  From: {gameState.players.find((p) => p.id === t.from_player_id)?.name}
                </div>
                <div className="trade-card-line">
                  They offer: <b>{formatSide(t.offer)}</b>
                </div>
                <div className="trade-card-line">
                  They want: <b>{formatSide(t.request)}</b>
                </div>

                <div className="trade-card-actions">
                  <button onClick={() => acceptTrade(t.trade_id)}>Accept</button>
                  <button onClick={() => declineTrade(t.trade_id)}>Decline</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {mode === "outgoing" && (
        <div className="trade-panel">
          {outgoing.length === 0 ? (
            <div className="trade-muted">No outgoing trades.</div>
          ) : (
            outgoing.map((t) => (
              <div key={t.trade_id} className="trade-card">
                <div className="trade-card-title">
                  To: {gameState.players.find((p) => p.id === t.to_player_id)?.name}
                </div>
                <div className="trade-card-line">
                  You offer: <b>{formatSide(t.offer)}</b>
                </div>
                <div className="trade-card-line">
                  You request: <b>{formatSide(t.request)}</b>
                </div>

                <div className="trade-card-actions">
                  <button onClick={() => cancelTrade(t.trade_id)}>Cancel</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}