from fastapi import APIRouter, HTTPException
from typing import Dict
import random
import uuid
from game_logic import (
    add_log,
    get_space,
    apply_rent,
    charge_player,
    credit_player,
    resolve_landing_effects,
    advance_turn_skipping_vacation,
    advance_to_next_player,
    owns_full_set,
    can_build_evenly,
    can_sell_evenly,
    handle_bankruptcy,
    create_trade_offer,
    accept_trade_offer,
    decline_trade_offer,
    cancel_trade_offer,
    JAIL_FINE, JAIL_POSITION, MAX_JAIL_TURNS,
    LANDED_ON_GO, PASSED_GO,
    BOARD_SIZE,
    STARTING_CASH, SELL_PROPERTY_REFUND_FRACTION
)

from game_models import (
    GameState,
    Player,
    Property,
    GamePhase,
    DiceRollRequest,
    DiceRollResponse,
    BuyPropertyRequest,
    BuyHouseRequest,
    CreateGameRequest,
    SpaceType,
    SellHouseRequest,
    SellPropertyRequest,
    BankruptRequest,
    BankruptResponse,
    TradeProposeRequest,
    TradeActionRequest,
    TradeResponse,
)
from board_data import BOARD_SPACES

router = APIRouter()

games: Dict[str, GameState] = {}
PLAYER_COLORS = ["#00ABAB", "#0500AB", "#AB0000", "#00AB1C", "#7AE000", "#CEE000", "#E0A700", "#7C4603"]


@router.get("/player-colors")
async def get_player_colors():
    return PLAYER_COLORS


@router.get("/board")
async def get_board():
    return BOARD_SPACES


@router.post("/create")
async def create_game(request: CreateGameRequest) -> GameState:
    game_id = str(uuid.uuid4())[:8]

    chosen_colors = [
        (
            request.player_colors[i]
            if request.player_colors and i < len(request.player_colors)
            else PLAYER_COLORS[i % len(PLAYER_COLORS)]
        )
        for i in range(len(request.player_names))
    ]

    players = [
        Player(
            id=i,
            name=request.player_names[i],
            color=chosen_colors[i],
            money=STARTING_CASH,
            position=0,
            properties=[],
            skip_next_turn=False,
        )
        for i in range(len(request.player_names))
    ]

    properties = [Property(**space) for space in BOARD_SPACES]

    game_state = GameState(
        game_id=game_id,
        players=players,
        properties=properties,
        current_player_index=0,
        game_phase=GamePhase.WAITING,
        original_player_names=request.player_names,
        original_player_colors=chosen_colors,
    )

    games[game_id] = game_state
    return game_state


@router.get("/{game_id}")
async def get_game(game_id: str) -> GameState:
    """get the current game state."""
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    return games[game_id]


@router.post("/roll-dice")
async def roll_dice(request: DiceRollRequest) -> DiceRollResponse:
    if request.game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")

    game = games[request.game_id]
    current_player = game.players[game.current_player_index]

    if current_player.id != request.player_id:
        raise HTTPException(status_code=400, detail="Not your turn")

    if current_player.skip_next_turn:
        current_player.skip_next_turn = False
        add_log(game, f"{current_player.name}'s turn was skipped (Vacation)")

        game.dice_values = (0, 0)
        advance_to_next_player(game)

        return DiceRollResponse(
            dice_values=(0, 0),
            is_doubles=False,
            new_position=current_player.position,
            passed_go=False,
        )

    if current_player.in_jail:
        option = request.jail_option or "roll"

        if option == "card":
            if current_player.jail_cards <= 0:
                raise HTTPException(status_code=400, detail="No jail card available")

            current_player.jail_cards -= 1
            current_player.in_jail = False
            current_player.jail_turns = 0
            game.no_buy_this_turn = False

            add_log(game, f"{current_player.name} used a Get Out of Jail Free card")

            game.dice_values = (0, 0)
            advance_to_next_player(game)

            return DiceRollResponse(
                dice_values=(0, 0),
                is_doubles=False,
                new_position=JAIL_POSITION,
                passed_go=False,
            )

        if option == "pay":
            if current_player.money < JAIL_FINE:
                raise HTTPException(status_code=400, detail="Insufficient funds to pay jail fine")

            charge_player(
                game=game,
                payer=current_player,
                amount=JAIL_FINE,
                creditor_type="bank",
                creditor_id=None,
                reason=f"{current_player.name} paid ${JAIL_FINE} to get out of jail",
            )

            current_player.in_jail = False
            current_player.jail_turns = 0
            game.no_buy_this_turn = False

            add_log(game, f"{current_player.name} paid ${JAIL_FINE} to get out of jail")

            game.dice_values = (0, 0)
            advance_to_next_player(game)

            return DiceRollResponse(
                dice_values=(0, 0),
                is_doubles=False,
                new_position=JAIL_POSITION,
                passed_go=False,
            )

    die1 = random.randint(1, 6)
    die2 = random.randint(1, 6)
    is_doubles = die1 == die2
    total = die1 + die2
    freed_by_jail_doubles = False

    if current_player.in_jail:
        if is_doubles:
            current_player.in_jail = False
            current_player.jail_turns = 0
            freed_by_jail_doubles = True
            game.no_buy_this_turn = True

            add_log(
                game,
                f"{current_player.name} rolled doubles to get out of jail and moved {total} spaces"
            )

            old_position = JAIL_POSITION

        else:
            current_player.jail_turns += 1

            if current_player.jail_turns >= MAX_JAIL_TURNS:
                current_player.in_jail = False
                current_player.jail_turns = 0
                add_log(game, f"{current_player.name} served {MAX_JAIL_TURNS} turns in jail and released.")

                advance_to_next_player(game)
                game.dice_values = (die1, die2)

                return DiceRollResponse(
                    dice_values=(die1, die2),
                    is_doubles=False,
                    new_position=current_player.position,
                    passed_go=False,
                )

            add_log(
                game,
                f"{current_player.name} failed to roll doubles in jail (attempt {current_player.jail_turns}/{MAX_JAIL_TURNS})"
            )

            game.dice_values = (die1, die2)
            advance_to_next_player(game)

            return DiceRollResponse(
                dice_values=(die1, die2),
                is_doubles=False,
                new_position=current_player.position,
                passed_go=False,
            )

    else:
        old_position = current_player.position

    if is_doubles and not freed_by_jail_doubles:
        game.doubles_count += 1

        if game.doubles_count >= MAX_JAIL_TURNS:
            current_player.in_jail = True
            current_player.position = JAIL_POSITION
            current_player.jail_turns = 0
            game.doubles_count = 0
            game.no_buy_this_turn = False
            game.dice_values = (die1, die2)
            game.game_phase = GamePhase.WAITING

            add_log(game, f"{current_player.name} rolled doubles 3 times and was sent to jail")

            return DiceRollResponse(
                dice_values=(die1, die2),
                is_doubles=True,
                new_position=current_player.position,  # 10
                passed_go=False,
            )
    else:
        game.doubles_count = 0

    new_position = (old_position + total) % BOARD_SIZE
    passed_go = new_position < old_position

    current_player.position = new_position
    game.dice_values = (die1, die2)
    game.game_phase = GamePhase.ACTION

    # GO money
    if new_position == 0:
        credit_player(game, current_player, LANDED_ON_GO, "landing on GO")
    elif passed_go:
        credit_player(game, current_player, PASSED_GO, "passing GO")

    # landing effects
    ended_turn, early_resp, passed_go_extra = resolve_landing_effects(game, current_player, die1, die2)
    passed_go = passed_go or passed_go_extra

    if ended_turn and early_resp is not None:
        return early_resp

    # rent
    landed_space = get_space(game, current_player.position)
    if landed_space:
        apply_rent(game, current_player, landed_space, total)

    # if freed from jail by doubles, end turn
    if freed_by_jail_doubles:
        advance_to_next_player(game)

        return DiceRollResponse(
            dice_values=(die1, die2),
            is_doubles=False,
            new_position=current_player.position,
            passed_go=passed_go,
        )

    # normal return
    return DiceRollResponse(
        dice_values=(die1, die2),
        is_doubles=is_doubles,
        new_position=current_player.position,
        passed_go=passed_go,
    )


@router.post("/buy-property")
async def buy_property(request: BuyPropertyRequest) -> GameState:
    """buy a property for the current player."""
    if request.game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")

    game = games[request.game_id]
    current_player = game.players[game.current_player_index]

    if current_player.id != request.player_id:
        raise HTTPException(status_code=400, detail="Not your turn")

    property_item = next(
        (p for p in game.properties if p.id == request.property_id), None
    )

    if not property_item:
        raise HTTPException(status_code=404, detail="Property not found")

    if property_item.owner is not None:
        raise HTTPException(status_code=400, detail="Property already owned")

    if property_item.price is None:
        raise HTTPException(status_code=400, detail="Cannot buy this space")

    if current_player.money < property_item.price:
        raise HTTPException(status_code=400, detail="Insufficient funds")

    if game.no_buy_this_turn:
        raise HTTPException(status_code=400, detail="You cannot buy property this turn.")

    # process purchase
    current_player.properties.append(property_item.id)
    property_item.owner = current_player.id

    charge_player(
        game=game,
        payer=current_player,
        amount=property_item.price,
        creditor_type="bank",
        creditor_id=None,
        reason=f"{current_player.name} bought {property_item.name} for ${property_item.price}",
    )

    return game


@router.post("/{game_id}/end-turn")
async def end_turn(game_id: str) -> GameState:
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")

    game = games[game_id]
    game.no_buy_this_turn = False
    game.game_phase = GamePhase.WAITING

    if game.doubles_count != 0:
        return game

    advance_turn_skipping_vacation(game)

    return game


@router.post("/{game_id}/reset")
async def reset_game(game_id: str) -> GameState:
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")

    game = games[game_id]

    if not game.original_player_names:
        raise HTTPException(status_code=400, detail="No saved roster for this game. Create a new game instead.")

    game.players = [
        Player(
            id=i,
            name=game.original_player_names[i],
            color=(
                game.original_player_colors[i]
                if i < len(game.original_player_colors)
                else PLAYER_COLORS[i % len(PLAYER_COLORS)]
            ),
            money=STARTING_CASH,
            position=0,
            properties=[],
            in_jail=False,
            jail_turns=0,
            jail_cards=0,
            debts=[],
            skip_next_turn=False,
        )
        for i in range(len(game.original_player_names))
    ]

    for prop in game.properties:
        prop.owner = None
        prop.houses = None

    game.current_player_index = 0
    game.dice_values = (1, 1)
    game.game_phase = GamePhase.WAITING
    game.doubles_count = 0
    game.winner = None
    game.vacation_cash = 0
    game.no_buy_this_turn = False
    game.log = []
    game.trades = {}

    return game


@router.post("/buy-house")
async def buy_house(request: BuyHouseRequest) -> GameState:
    if request.game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")

    game = games[request.game_id]
    current_player = game.players[game.current_player_index]

    if current_player.id != request.player_id:
        raise HTTPException(status_code=400, detail="Not your turn")

    if current_player.in_jail:
        raise HTTPException(status_code=400, detail="You can't buy houses while in jail")

    if game.game_phase not in (GamePhase.WAITING, GamePhase.ACTION):
        raise HTTPException(status_code=400, detail="You can't buy houses right now")

    prop = get_space(game, request.property_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    if prop.type != SpaceType.PROPERTY:
        raise HTTPException(status_code=400, detail="Houses can only be built on properties")

    if prop.owner != current_player.id:
        raise HTTPException(status_code=400, detail="You don't own this property")

    if prop.house_cost is None or not prop.rent or not prop.color:
        raise HTTPException(status_code=400, detail="This property cannot have houses")

    if not owns_full_set(game, current_player.id, prop.color):
        raise HTTPException(status_code=400, detail="You must own the full color set to build houses")

    max_houses = len(prop.rent) - 1

    count = max(1, request.count)

    for _ in range(count):
        current_houses = prop.houses or 0
        if current_houses >= max_houses:
            raise HTTPException(status_code=400, detail="This property already has the maximum houses")

        if not can_build_evenly(game, current_player.id, prop.color, prop.id):
            raise HTTPException(status_code=400, detail="You must build evenly across the set")

        if current_player.money < prop.house_cost:
            raise HTTPException(status_code=400, detail="Insufficient funds to buy a house")


        prop.houses = current_houses + 1

        charge_player(
            game=game,
            payer=current_player,
            amount=prop.house_cost,
            creditor_type="bank",
            creditor_id=None,
            reason=f"{current_player.name} bought a house on {prop.name} for ${prop.house_cost}",
        )

    return game


@router.post("/sell-house")
async def sell_house(request: SellHouseRequest) -> GameState:
    if request.game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")

    game = games[request.game_id]
    current_player = game.players[game.current_player_index]

    if current_player.id != request.player_id:
        raise HTTPException(status_code=400, detail="Not your turn")

    if current_player.in_jail:
        raise HTTPException(status_code=400, detail="You can't sell houses while in jail")

    if game.game_phase not in (GamePhase.WAITING, GamePhase.ACTION):
        raise HTTPException(status_code=400, detail="You can't sell houses right now")

    prop = get_space(game, request.property_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    if prop.type != SpaceType.PROPERTY:
        raise HTTPException(status_code=400, detail="Houses can only be sold from properties")

    if prop.owner != current_player.id:
        raise HTTPException(status_code=400, detail="You don't own this property")

    if prop.house_cost is None or not prop.rent or not prop.color:
        raise HTTPException(status_code=400, detail="This property cannot have houses")

    if not owns_full_set(game, current_player.id, prop.color):
        raise HTTPException(status_code=400, detail="You must own the full color set to sell houses")

    count = max(1, request.count)
    refund_each = prop.house_cost // 2

    for _ in range(count):
        current_houses = prop.houses or 0

        if current_houses <= 0:
            raise HTTPException(status_code=400, detail="This property has no houses to sell")

        if not can_sell_evenly(game, current_player.id, prop.color, prop.id):
            raise HTTPException(status_code=400, detail="You must sell evenly across the set")

        new_houses = current_houses - 1
        prop.houses = None if new_houses == 0 else new_houses
        credit_player(game, current_player, refund_each, "bank")

        add_log(game, f"{current_player.name} sold a house on {prop.name} for ${refund_each}")

    return game


@router.post("/sell-property")
async def sell_property(request: SellPropertyRequest) -> GameState:
    if request.game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")

    game = games[request.game_id]
    current_player = game.players[game.current_player_index]

    if current_player.id != request.player_id:
        raise HTTPException(status_code=400, detail="Not your turn")

    if current_player.in_jail:
        raise HTTPException(status_code=400, detail="You can't sell property while in jail")

    if game.game_phase not in (GamePhase.WAITING, GamePhase.ACTION):
        raise HTTPException(status_code=400, detail="You can't sell property right now")

    prop = get_space(game, request.property_id)
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    if prop.price is None:
        raise HTTPException(status_code=400, detail="This space cannot be sold")

    if prop.owner != current_player.id:
        raise HTTPException(status_code=400, detail="You don't own this property")

    if prop.type == SpaceType.PROPERTY:
        if (prop.houses or 0) > 0:
            raise HTTPException(status_code=400, detail="Sell houses first before selling the property")

    refund = int(prop.price * SELL_PROPERTY_REFUND_FRACTION)
    if refund < 0:
        refund = 0

    # transfer ownership to no one
    prop.owner = None
    prop.houses = None

    # remove from player's owned list
    if request.property_id in current_player.properties:
        current_player.properties.remove(request.property_id)

    # pay player
    credit_player(game, current_player, refund, "bank")
    add_log(game, f"{current_player.name} sold {prop.name} for ${refund}")

    return game


@router.post("/bankrupt", response_model=BankruptResponse)
async def bankrupt(request: BankruptRequest) -> BankruptResponse:
    if request.game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")

    game = games[request.game_id]

    if not game.players:
        raise HTTPException(status_code=400, detail="No players in game")

    current_player = game.players[game.current_player_index]

    if current_player.id != request.player_id:
        raise HTTPException(status_code=400, detail="Only the current player can declare bankruptcy")

    removed_id, removed_name, winner_id = handle_bankruptcy(game, request.player_id)

    msg = f"{removed_name} has declared bankruptcy."

    return BankruptResponse(
        game_id=game.game_id,
        removed_player_id=removed_id,
        removed_player_name=removed_name,
        players_remaining=len(game.players),
        winner_id=winner_id,
        message=msg,
        game=game,
    )

@router.get("/{game_id}/trades")
async def list_trades(game_id: str):
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    game = games[game_id]
    return list(game.trades.values())


@router.post("/trade/propose", response_model=TradeResponse)
async def propose_trade(request: TradeProposeRequest) -> TradeResponse:
    if request.game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    game = games[request.game_id]

    current = game.players[game.current_player_index]
    if current.id != request.from_player_id:
        raise HTTPException(status_code=400, detail="Only the current player can propose a trade")

    try:
        trade = create_trade_offer(
            game=game,
            from_id=request.from_player_id,
            to_id=request.to_player_id,
            offer=request.offer,
            request=request.request,
            note=request.note,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return TradeResponse(trade=trade, game=game)


@router.post("/trade/{trade_id}/accept", response_model=TradeResponse)
async def accept_trade(trade_id: str, request: TradeActionRequest) -> TradeResponse:
    if request.game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    game = games[request.game_id]

    try:
        trade = accept_trade_offer(game, trade_id, request.player_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return TradeResponse(trade=trade, game=game)


@router.post("/trade/{trade_id}/decline", response_model=TradeResponse)
async def decline_trade(trade_id: str, request: TradeActionRequest) -> TradeResponse:
    if request.game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    game = games[request.game_id]

    try:
        trade = decline_trade_offer(game, trade_id, request.player_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return TradeResponse(trade=trade, game=game)


@router.post("/trade/{trade_id}/cancel", response_model=TradeResponse)
async def cancel_trade(trade_id: str, request: TradeActionRequest) -> TradeResponse:
    if request.game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")
    game = games[request.game_id]

    try:
        trade = cancel_trade_offer(game, trade_id, request.player_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return TradeResponse(trade=trade, game=game)