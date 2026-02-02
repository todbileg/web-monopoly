from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from enum import Enum



class PropertyCountry(str, Enum):
    AMERICA = "#D2B48C"
    PALESTINE = "#ADD8E6"
    LOTR = "#FFB6C1"
    JOJO = "#FFDAB9"
    GERMANY = "#FF7F7F"
    USSR = "#FFF9A6"
    MPR = "#98FB98"
    NUKE = "#AEC6CF"
    AIRPORT = "airport"
    UTILITY = "utility"


class SpaceType(str, Enum):
    PROPERTY = "property"
    AIRPORT = "airport"
    UTILITY = "utility"
    TAX = "tax"
    CHANCE = "chance"
    CHEST = "chest"
    CORNER = "corner"


class GamePhase(str, Enum):
    WAITING = "waiting"
    ROLLING = "rolling"
    MOVING = "moving"
    ACTION = "action"
    ENDED = "ended"


class CreditorType(str, Enum):
    BANK = "bank"
    PLAYER = "player"
    VACATION = "vacation"


class Debt(BaseModel):
    creditor_type: CreditorType
    creditor_id: Optional[int] = None
    amount: int
    reason: str = ""


class Property(BaseModel):
    id: int
    name: str
    type: SpaceType
    color: Optional[str] = None
    price: Optional[int] = None
    rent: Optional[List[int]] = None
    house_cost: Optional[int] = None
    owner: Optional[int] = None
    houses: Optional[int] = None
    rate: Optional[float] = None


class Player(BaseModel):
    id: int
    name: str
    color: str
    money: int = 1500
    position: int = 0
    properties: List[int] = []
    in_jail: bool = False
    jail_turns: int = 0
    jail_cards: int = 0
    debts: List[Debt] = Field(default_factory=list)
    skip_next_turn: bool = False

class TradeStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    CANCELED = "canceled"


class TradeSide(BaseModel):
    money: int = 0
    property_ids: List[int] = Field(default_factory=list)
    jail_cards: int = 0


class TradeOffer(BaseModel):
    trade_id: str
    from_player_id: int
    to_player_id: int
    offer: TradeSide
    request: TradeSide
    status: TradeStatus = TradeStatus.PENDING
    note: str = ""


class TradeProposeRequest(BaseModel):
    game_id: str
    from_player_id: int
    to_player_id: int
    offer: TradeSide
    request: TradeSide
    note: str = ""


class TradeActionRequest(BaseModel):
    game_id: str
    player_id: int


class GameState(BaseModel):
    game_id: str
    players: List[Player]
    current_player_index: int = 0
    properties: List[Property]
    dice_values: tuple[int, int] = (1, 1)
    game_phase: GamePhase = GamePhase.WAITING
    doubles_count: int = 0
    winner: Optional[int] = None
    log: List[str] = Field(default_factory=list)
    no_buy_this_turn: bool = False
    vacation_cash: int = 0
    original_player_names: List[str] = Field(default_factory=list)
    original_player_colors: List[str] = Field(default_factory=list)
    trades: Dict[str, TradeOffer] = Field(default_factory=dict)


class TradeResponse(BaseModel):
    trade: TradeOffer
    game: GameState


class JailOption(str, Enum):
    ROLL = "roll"
    PAY = "pay"
    CARD = "card"


class DiceRollRequest(BaseModel):
    game_id: str
    player_id: int
    jail_option: Optional[JailOption] = JailOption.ROLL


class DiceRollResponse(BaseModel):
    dice_values: tuple[int, int]
    is_doubles: bool
    new_position: int
    passed_go: bool


class BuyPropertyRequest(BaseModel):
    game_id: str
    player_id: int
    property_id: int


class BuyHouseRequest(BaseModel):
    game_id: str
    player_id: int
    property_id: int
    count: int = 1


class SellHouseRequest(BaseModel):
    game_id: str
    player_id: int
    property_id: int
    count: int = 1


class CreateGameRequest(BaseModel):
    player_names: List[str]
    player_colors: Optional[List[str]] = None


class JoinGameRequest(BaseModel):
    game_id: str
    player_name: str


class SellPropertyRequest(BaseModel):
    game_id: str
    player_id: int
    property_id: int


class BankruptRequest(BaseModel):
    game_id: str
    player_id: int


class BankruptResponse(BaseModel):
    game_id: str
    removed_player_id: int
    removed_player_name: str
    players_remaining: int
    winner_id: Optional[int] = None
    message: str
    game: GameState



