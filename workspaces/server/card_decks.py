

COMMUNITY_CHEST_CARDS = [
    {"text": "Bank error in your favor", "type": "MONEY", "amount": 200},
    {"text": "Doctor's fees", "type": "MONEY", "amount": -50},
    {"text": "Get Out of Jail Free", "type": "JAIL_CARD"},
    {"text": "Go to Jail", "type": "GO_TO_JAIL"},
    {"text": "Advance to GO", "type": "MOVE", "target": 0, "collect": "LAND_ON_GO"},
]

CHANCE_CARDS = [
    {"text": "Advance to GO", "type": "MOVE", "target": 0, "collect": "LAND_ON_GO"},
    {"text": "Go to Jail", "type": "GO_TO_JAIL"},
    {"text": "Go back 3 spaces", "type": "MOVE_REL", "delta": -3},
    {"text": "Bank pays you dividends", "type": "MONEY", "amount": 50},
    {"text": "Pay tax", "type": "MONEY", "amount": -15},
]