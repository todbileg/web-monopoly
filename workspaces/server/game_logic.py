from __future__ import annotations
import random
from typing import Optional, Dict, Any, Tuple
import uuid

from card_decks import COMMUNITY_CHEST_CARDS, CHANCE_CARDS
from game_models import (
    GameState,
    Player,
    Property,
    GamePhase,
    DiceRollResponse,
    SpaceType,
    Debt,
    CreditorType,
    TradeOffer,
    TradeSide,
    TradeStatus
)

OWNABLE_TYPES = {SpaceType.PROPERTY, SpaceType.AIRPORT, SpaceType.UTILITY}

JAIL_FINE = 50
JAIL_POSITION = 10
MAX_JAIL_TURNS = 3
LANDED_ON_GO = 300
PASSED_GO = 200
GO_TO_JAIL_POSITION = 30
BOARD_SIZE = 40
UTILITIES_MULTIPLIER_ONE = 4
UTILITIES_MULTIPLIER_TWO = 10
VACATION_POSITION = 20
STARTING_CASH = 1500
SELL_PROPERTY_REFUND_FRACTION = 0.5
SELL_HOUSE_REFUND_FRACTION = 0.5

def add_log(game: GameState, message: str) -> None:
    game.log.append(message)
def get_space(game: GameState, space_id: int) -> Optional[Property]:
    return next((s for s in game.properties if s.id == space_id), None)
def get_player(game: GameState, player_id: int) -> Optional[Player]:
    return next((p for p in game.players if p.id == player_id), None)
def calculate_rent(space: Property, game: GameState, dice_total: int) -> int:
    """
    Calculates rent based on your BOARD_SPACES structure:
    - PROPERTY: rent list indexed by houses (0..5)
    - AIRPORT: rent list indexed by number of airports owner has (1..4)
    - UTILITY: 4x dice if owner has 1 utility, 10x dice if owner has 2
    """
    if space.owner is None:
        return 0

    if space.type == SpaceType.PROPERTY:
        if not space.rent:
            return 0
        houses = space.houses or 0
        idx = max(0, min(houses, len(space.rent) - 1))
        return space.rent[idx]

    if space.type == SpaceType.AIRPORT:
        if not space.rent:
            return 0
        airports_owned = sum(
            1 for s in game.properties
            if s.type == SpaceType.AIRPORT and s.owner == space.owner
        )
        idx = max(0, min(airports_owned - 1, len(space.rent) - 1))
        return space.rent[idx]

    if space.type == SpaceType.UTILITY:
        utilities_owned = sum(
            1 for s in game.properties
            if s.type == SpaceType.UTILITY and s.owner == space.owner
        )
        multiplier = UTILITIES_MULTIPLIER_TWO if utilities_owned >= 2 else UTILITIES_MULTIPLIER_ONE
        return dice_total * multiplier

    return 0
def apply_rent(game: GameState, payer: Player, landed_space: Property, dice_total: int) -> None:
    if landed_space.owner is None:
        return
    if landed_space.owner == payer.id:
        return
    if landed_space.type not in (SpaceType.PROPERTY, SpaceType.AIRPORT, SpaceType.UTILITY):
        return

    owner_player = get_player(game, landed_space.owner)
    if owner_player is None:
        return
    if owner_player.in_jail:
        return

    rent = calculate_rent(landed_space, game, dice_total)
    if rent <= 0:
        return

    add_log(game, f"{payer.name} paid ${rent} to {owner_player.name}")
    charge_player(
        game=game,
        payer=payer,
        amount=rent,
        creditor_type="player",
        creditor_id=owner_player.id,
        reason=f"rent on {landed_space.name}"
    )
def send_to_jail(game: GameState, player: Player, reason: str, die1: int, die2: int) -> DiceRollResponse:
    player.in_jail = True
    player.position = JAIL_POSITION
    player.jail_turns = 0

    # Reset doubles chain and action/buy rules
    game.doubles_count = 0
    game.no_buy_this_turn = False

    game.dice_values = (die1, die2)
    game.game_phase = GamePhase.WAITING

    add_log(game, reason)

    return DiceRollResponse(
        dice_values=(die1, die2),
        is_doubles=(die1 == die2),
        new_position=player.position,
        passed_go=False,
    )
def apply_tax(game: GameState, player: Player, space: Property) -> None:
    if space.rate is None:
        return

    if space.rate < 1:
        tax = int(player.money * space.rate) if player.money > 0 else 0
        add_log(game, f"{player.name} landed on Tax and paid ${tax}")
    else:
        tax = int(space.rate)
        add_log(game, f"{player.name} landed on Tax and owes ${tax}")

    charge_player(
        game=game,
        payer=player,
        amount=tax,
        creditor_type="vacation",
        creditor_id=None,
        reason=f"{player.name} paid a tax of ${tax}"
    )
def draw_card(cards: list[dict]) -> dict:
    return random.choice(cards)
def total_debt(player: Player) -> int:
    return sum(d.amount for d in player.debts)
def add_debt( player: Player, creditor_type: CreditorType, creditor_id: Optional[int], amount: int,
              reason: str) -> None:
    if amount <= 0:
        return

    player.debts.append(Debt(
        creditor_type=creditor_type,
        creditor_id=creditor_id,
        amount=amount,
        reason=reason
    ))
def apply_card_effect(game: GameState, player: Player, card: dict, old_pos: int, die1: int, die2: int,
                      deck_type) -> tuple[bool, bool, bool]:
    add_log(game, f"{player.name} landed on {deck_type} and drew a card:\n {card['text']}")
    ctype = card["type"]

    if ctype == "MONEY":
        amt = int(card["amount"])

        if amt >= 0:
            credit_player(game, player, amt, "card")
        else:
            charge_player(game, player, -amt, "vacation", None, f"Pay ${-amt}")

        return (False, False, False)

    if ctype == "JAIL_CARD":
        player.jail_cards += 1
        return (False, False, False)

    if ctype == "GO_TO_JAIL":
        send_to_jail(
            game,
            player,
            f"{player.name} was sent to jail",
            die1,
            die2
        )
        return (False, True, False)

    if ctype == "MOVE":
        target = int(card["target"])
        collect = card.get("collect", None)
        if collect == "LAND_ON_GO":
            credit_player(game, player, LANDED_ON_GO, "landing on GO")

        if target == 0:
            pass

        player.position = target
        return (True, False, True)

    if ctype == "MOVE_REL":
        delta = int(card["delta"])
        new_pos = (old_pos + delta) % BOARD_SIZE
        player.position = new_pos
        return (True, False, False)

    return (False, False, False)
def charge_player(game: GameState, payer: Player, amount: int, creditor_type: str,
                  creditor_id: Optional[int] = None, reason: str = "") -> None:
    if amount <= 0:
        return

    available_now = max(payer.money, 0)
    paid_now = min(available_now, amount)
    remainder = amount - paid_now

    payer.money -= amount

    if creditor_type == "player" and paid_now > 0:
        creditor = get_player(game, creditor_id) if creditor_id is not None else None
        if creditor:
            credit_player(game, creditor, paid_now, "player")

    elif creditor_type == "bank" and paid_now > 0:
        add_log(game, reason)

    elif creditor_type == "vacation" and paid_now > 0:
        add_to_vacation(game, paid_now, reason or "vacation payment")
        add_log(game, reason)

    if remainder > 0:
        mapped = creditor_type
        if mapped == "vacation":
            mapped = "bank"
        add_debt(payer, CreditorType(mapped), creditor_id, remainder, reason)
def credit_player(game: GameState, player: Player, amount: int, source: str = "") -> None:
    if amount <= 0:
        return

    player.money += amount
    if source:
        if source != "player":
            add_log(game, f"{player.name} received ${amount} from {source}")
    else:
        add_log(game, f"{player.name} received ${amount}")

    remaining_incoming = amount

    i = 0
    while i < len(player.debts) and remaining_incoming > 0:
        d = player.debts[i]
        pay = min(remaining_incoming, d.amount)
        d.amount -= pay
        remaining_incoming -= pay

        if d.creditor_type == "player":
            creditor = get_player(game, d.creditor_id) if d.creditor_id is not None else None
            if creditor:
                credit_player(game, creditor, pay, "player")
            else:
                add_log(game, f"${pay} was automatically paid to Player {d.creditor_id} to reduce debt")
        else:
            add_to_vacation(game, pay, "debt repayment")

        if d.amount == 0:
            player.debts.pop(i)
            continue

        i += 1
def add_to_vacation(game: GameState, amount: int, reason: str = "") -> None:
    if amount <= 0:
        return
    game.vacation_cash += amount
def resolve_vacation(game: GameState, player: Player) -> None:
    pot = game.vacation_cash
    if pot > 0:
        credit_player(game, player, pot, "Vacation jackpot")
        game.vacation_cash = 0
    player.skip_next_turn = True
def resolve_landing_effects( game: GameState, player: Player, die1: int, die2: int,)\
        -> tuple[bool, DiceRollResponse | None, bool]:
    passed_go_extra = False

    for _ in range(5):
        landed = get_space(game, player.position)
        if not landed:
            return False, None, passed_go_extra

        if landed.id == GO_TO_JAIL_POSITION:
            resp = send_to_jail(
                game,
                player,
                f"{player.name} landed on Go To Jail and was sent to jail",
                die1,
                die2
            )
            return True, resp, passed_go_extra
        if landed.id == VACATION_POSITION:
            add_log(game, f"{player.name} landed on Vacation")
            resolve_vacation(game, player)
            game.dice_values = (die1, die2)
            advance_to_next_player(game)

            return True, DiceRollResponse(
                dice_values=(die1, die2),
                is_doubles=(die1 == die2),
                new_position=player.position,
                passed_go=False,
            ), passed_go_extra
        if landed.type == SpaceType.TAX:
            apply_tax(game, player, landed)
            return False, None, passed_go_extra
        if landed.type == SpaceType.CHEST:
            old_pos = player.position
            card = draw_card(COMMUNITY_CHEST_CARDS)
            moved, ended_turn, passed_go_card = apply_card_effect(game, player, card, old_pos, die1, die2, "Community Chest")
            passed_go_extra = passed_go_extra or passed_go_card

            if ended_turn:
                return True, DiceRollResponse(
                    dice_values=(die1, die2),
                    is_doubles=(die1 == die2),
                    new_position=player.position,
                    passed_go=False
                ), passed_go_extra

            if moved:
                continue

            return False, None, passed_go_extra
        if landed.type == SpaceType.CHANCE:
            old_pos = player.position
            card = draw_card(CHANCE_CARDS)
            moved, ended_turn, passed_go_card = apply_card_effect(game, player, card, old_pos, die1, die2, "Chance")
            passed_go_extra = passed_go_extra or passed_go_card

            if ended_turn:
                return True, DiceRollResponse(
                    dice_values=(die1, die2),
                    is_doubles=(die1 == die2),
                    new_position=player.position,
                    passed_go=False
                ), passed_go_extra

            if moved:
                continue

            return False, None, passed_go_extra
        return False, None, passed_go_extra
    return False, None, passed_go_extra
def advance_turn_skipping_vacation(game: GameState) -> None:
    n = len(game.players)
    if n == 0:
        return

    game.current_player_index = (game.current_player_index + 1) % n

    for _ in range(n):
        p = game.players[game.current_player_index]
        if not p.skip_next_turn:
            break

        p.skip_next_turn = False
        add_log(game, f"{p.name} landed on Vacation and their turn was skipped")
        game.dice_values = (0, 0)
        game.doubles_count = 0
        game.no_buy_this_turn = False
        game.game_phase = GamePhase.WAITING
        game.current_player_index = (game.current_player_index + 1) % n
def advance_to_next_player(game: GameState) -> None:
    game.current_player_index = (game.current_player_index + 1) % len(game.players)
    game.game_phase = GamePhase.WAITING
    game.no_buy_this_turn = False
    game.doubles_count = 0
def owns_full_set(game: GameState, owner_id: int, color: str) -> bool:
    group_props = [p for p in game.properties if p.type == SpaceType.PROPERTY and p.color == color]
    if not group_props:
        return False
    return all(p.owner == owner_id for p in group_props)
def can_build_evenly(game: GameState, owner_id: int, color: str, target_prop_id: int) -> bool:
    group_props = [p for p in game.properties if p.type == SpaceType.PROPERTY and p.color == color and p.owner == owner_id]
    if not group_props:
        return False

    houses_by_id = {p.id: (p.houses or 0) for p in group_props}
    min_houses = min(houses_by_id.values())
    return houses_by_id.get(target_prop_id, 999) == min_houses
def can_sell_evenly(game: GameState, owner_id: int, color: str, target_prop_id: int) -> bool:
    group_props = [
        p for p in game.properties
        if p.type == SpaceType.PROPERTY and p.color == color and p.owner == owner_id
    ]
    if not group_props:
        return False

    houses_by_id = {p.id: (p.houses or 0) for p in group_props}
    max_houses = max(houses_by_id.values())
    return houses_by_id.get(target_prop_id, -1) == max_houses
def handle_bankruptcy( game: GameState, player_id: int, *, settle_debts: bool = True,
    bank_debts_to_vacation_pot: bool = False,) -> tuple[int, str, Optional[int]]:
    if settle_debts:
        try:
            settle_bankruptcy_debts(
                game=game,
                player_id=player_id,
                bankrupt_after=False,  # IMPORTANT: avoid recursion/double-remove
                bank_debts_to_vacation_pot=bank_debts_to_vacation_pot,
            )
        except Exception:
            pass

    idx = next((i for i, p in enumerate(game.players) if p.id == player_id), None)
    if idx is None:
        raise ValueError("Player not found")

    bankrupt_player = game.players[idx]

    for prop in game.properties:
        if prop.owner == bankrupt_player.id:
            prop.owner = None
            prop.houses = None

    for p in game.players:
        if p.id == bankrupt_player.id:
            continue
        p.debts = [
            d for d in p.debts
            if not (d.creditor_type == CreditorType.PLAYER and d.creditor_id == bankrupt_player.id)
        ]

    bankrupt_player.debts = []
    bankrupt_player.money = 0

    removed_id = bankrupt_player.id
    removed_name = bankrupt_player.name

    game.players.pop(idx)

    if len(game.players) == 0:
        game.current_player_index = 0
        game.doubles_count = 0
        game.no_buy_this_turn = False
        game.dice_values = (0, 0)
        game.game_phase = GamePhase.ENDED
        game.winner = None
        add_log(game, f"{removed_name} declared bankruptcy. Game ended.")
        return removed_id, removed_name, None

    if idx < game.current_player_index:
        game.current_player_index -= 1

    if game.current_player_index >= len(game.players):
        game.current_player_index = 0

    game.doubles_count = 0
    game.no_buy_this_turn = False
    game.dice_values = (0, 0)
    game.game_phase = GamePhase.WAITING

    winner_id: Optional[int] = None
    if len(game.players) == 1:
        winner_id = game.players[0].id
        game.winner = winner_id
        game.game_phase = GamePhase.ENDED
        add_log(game, f"{removed_name} declared bankruptcy. {game.players[0].name} wins!")
    else:
        add_log(game, f"{removed_name} declared bankruptcy and has been removed from the game.")

    return removed_id, removed_name, winner_id
def total_player_liquid_value(game: "GameState", player: "Player") -> int:
    total = max(player.money, 0)

    for prop_id in player.properties:
        prop = get_space(game, prop_id)
        if not prop:
            continue

        houses = prop.houses or 0
        if houses > 0:
            total += houses * _house_sell_refund(prop)

        total += _property_sell_refund(prop)

    return total
def settle_bankruptcy_debts( game: GameState, player_id: int, *, bankrupt_after: bool = True,
                            bank_debts_to_vacation_pot: bool = False,) -> Dict[str, Any]:
    player = get_player(game, player_id)
    if not player:
        raise ValueError("Player not found")

    liquidation_value = total_player_liquid_value(game, player)
    remaining_liquidation = liquidation_value
    paid_total = 0

    i = 0
    while i < len(player.debts) and remaining_liquidation > 0:
        d = player.debts[i]
        pay = min(d.amount, remaining_liquidation)

        _pay_creditor_from_liquidation(
            game=game,
            payer_name=player.name,
            creditor_type=d.creditor_type,
            creditor_id=d.creditor_id,
            amount=pay,
            reason=d.reason,
            bank_debts_to_vacation_pot=bank_debts_to_vacation_pot,
        )

        d.amount -= pay
        remaining_liquidation -= pay
        paid_total += pay

        if d.amount == 0:
            player.debts.pop(i)
            continue

        i += 1

    discarded = max(remaining_liquidation, 0)
    if discarded > 0:
        add_log(game, f"{player.name} had ${discarded} extra liquidation value; it was discarded.")

    bankrupted = False
    winner_id: Optional[int] = None

    if bankrupt_after:
        bankrupted = True
        _, _, winner_id = handle_bankruptcy(game, player_id)

    return {
        "liquidation_value": liquidation_value,
        "paid_total": paid_total,
        "discarded": discarded,
        "debts_remaining": sum(d.amount for d in player.debts) if not bankrupt_after else 0,
        "bankrupted": bankrupted,
        "winner_id": winner_id,
    }
def _pay_creditor_from_liquidation( game: GameState, payer_name: str, creditor_type: CreditorType,
                                    creditor_id: Optional[int], amount: int, reason: str = "",
                                    bank_debts_to_vacation_pot: bool = False, ) -> None:
    if amount <= 0:
        return

    if creditor_type == CreditorType.PLAYER:
        creditor = get_player(game, creditor_id) if creditor_id is not None else None
        if creditor:
            credit_player(game, creditor, amount, "player")
        add_log(game, f"{payer_name} paid ${amount} to Player {creditor_id}. {reason}".strip())
        return

    if bank_debts_to_vacation_pot:
        add_to_vacation(game, amount, reason or "bank debt payment")
        add_log(game, f"{payer_name} paid ${amount} to Vacation pot (bank debt). {reason}".strip())
    else:
        add_log(game, f"{payer_name} paid ${amount} to the bank. {reason}".strip())
def _property_sell_refund(prop: "Property") -> int:
    if prop.price is None:
        return 0
    refund = int(prop.price * SELL_PROPERTY_REFUND_FRACTION)
    return max(refund, 0)
def _house_sell_refund(prop: "Property") -> int:
    if prop.house_cost is None:
        return 0
    return max(int(prop.house_cost * SELL_HOUSE_REFUND_FRACTION), 0)


def color_group_has_houses(game: GameState, color: str) -> bool:
    for p in game.properties:
        if p.type == SpaceType.PROPERTY and p.color == color and (p.houses or 0) > 0:
            return True
    return False
def can_trade_property(game: GameState, property_id: int) -> Tuple[bool, str]:
    prop = get_space(game, property_id)
    if not prop:
        return False, "Property not found"

    if prop.type not in OWNABLE_TYPES:
        return False, "This space is not tradable"

    if prop.type == SpaceType.PROPERTY and prop.color:
        if color_group_has_houses(game, prop.color):
            return False, "Cannot trade properties in a color set that has houses"

    return True, ""
def _validate_trade_side( game: GameState, giver: Player, side: TradeSide,) -> None:
    if side.money < 0 or side.jail_cards < 0:
        raise ValueError("Trade amounts cannot be negative")

    if side.money > giver.money:
        raise ValueError(f"{giver.name} does not have enough money for this trade")

    if side.jail_cards > giver.jail_cards:
        raise ValueError(f"{giver.name} does not have enough Jail Cards")

    seen = set()
    for pid in side.property_ids:
        if pid in seen:
            raise ValueError("Duplicate property in trade")
        seen.add(pid)

        prop = get_space(game, pid)
        if not prop:
            raise ValueError("Property not found")
        if prop.owner != giver.id:
            raise ValueError(f"{giver.name} does not own {prop.name}")

        ok, msg = can_trade_property(game, pid)
        if not ok:
            raise ValueError(msg)
def _transfer_properties(game: GameState, from_player: Player, to_player: Player,
                         property_ids: list[int]) -> None:
    for pid in property_ids:
        prop = get_space(game, pid)
        if not prop:
            continue

        if pid in from_player.properties:
            from_player.properties.remove(pid)

        prop.owner = to_player.id
        to_player.properties.append(pid)
def _transfer_money(from_player: Player, to_player: Player, amount: int) -> None:
    if amount <= 0:
        return
    from_player.money -= amount
    to_player.money += amount
def _transfer_jail_cards(from_player: Player, to_player: Player, count: int) -> None:
    if count <= 0:
        return
    from_player.jail_cards -= count
    to_player.jail_cards += count
def create_trade_offer(game: GameState, from_id: int, to_id: int, offer: TradeSide, request: TradeSide, note: str = "") -> TradeOffer:
    from_player = get_player(game, from_id)
    to_player = get_player(game, to_id)
    if not from_player or not to_player:
        raise ValueError("Player not found")

    if game.game_phase == GamePhase.ENDED:
        raise ValueError("Game is over")

    if from_id == to_id:
        raise ValueError("Cannot trade with yourself")

    _validate_trade_side(game, from_player, offer)
    _validate_trade_side(game, to_player, request)

    trade_id = str(uuid.uuid4())[:8]
    trade = TradeOffer(
        trade_id=trade_id,
        from_player_id=from_id,
        to_player_id=to_id,
        offer=offer,
        request=request,
        status=TradeStatus.PENDING,
        note=note or "",
    )

    game.trades[trade_id] = trade
    add_log(game, f"Trade offered: Player {from_player.name} → {to_player.name}")
    return trade
def accept_trade_offer(game: GameState, trade_id: str, accepter_id: int) -> TradeOffer:
    trade = game.trades.get(trade_id)
    if not trade:
        raise ValueError("Trade not found")

    if trade.status != TradeStatus.PENDING:
        raise ValueError("Trade is not pending")

    if accepter_id != trade.to_player_id:
        raise ValueError("Only the receiving player can accept this trade")

    from_player = get_player(game, trade.from_player_id)
    to_player = get_player(game, trade.to_player_id)
    if not from_player or not to_player:
        raise ValueError("Player not found")

    _validate_trade_side(game, from_player, trade.offer)
    _validate_trade_side(game, to_player, trade.request)

    _transfer_money(from_player, to_player, trade.offer.money)
    _transfer_money(to_player, from_player, trade.request.money)

    _transfer_jail_cards(from_player, to_player, trade.offer.jail_cards)
    _transfer_jail_cards(to_player, from_player, trade.request.jail_cards)

    _transfer_properties(game, from_player, to_player, trade.offer.property_ids)
    _transfer_properties(game, to_player, from_player, trade.request.property_ids)

    trade.status = TradeStatus.ACCEPTED
    add_log(game, f"Trade accepted: {from_player.name} ↔ {to_player.name}")
    return trade
def decline_trade_offer(game: GameState, trade_id: str, decliner_id: int) -> TradeOffer:
    trade = game.trades.get(trade_id)
    if not trade:
        raise ValueError("Trade not found")

    if trade.status != TradeStatus.PENDING:
        raise ValueError("Trade is not pending")

    if decliner_id != trade.to_player_id:
        raise ValueError("Only the receiving player can decline this trade")

    trade.status = TradeStatus.DECLINED
    add_log(game, f"Trade declined by Player {decliner_id}")
    return trade
def cancel_trade_offer(game: GameState, trade_id: str, canceller_id: int) -> TradeOffer:
    trade = game.trades.get(trade_id)
    if not trade:
        raise ValueError("Trade not found")

    if trade.status != TradeStatus.PENDING:
        raise ValueError("Trade is not pending")

    if canceller_id != trade.from_player_id:
        raise ValueError("Only the offering player can cancel this trade")

    trade.status = TradeStatus.CANCELED
    add_log(game, f"Trade canceled by Player {canceller_id}")
    return trade
