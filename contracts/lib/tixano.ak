use aiken/primitive/bytearray
use types.{MintRedeemer, MintOwnerTicket, MintAttendeeTicket}

pub const event_prices = (
    5000000,
    10000000,
    20000000,
    50000000,
    100000000
)
pub const token_prefix_owner = "TXNE-"
pub const token_prefix_attendee = "TXNT-"

pub fn get_event_price(event_capacity: Int) -> Option<Int> {
    if event_capacity == 50 {
        Some(event_prices.1st)
    }
    else if event_capacity == 100 {
        Some(event_prices.2nd)
    }
    else if event_capacity == 200 {
        Some(event_prices.3rd)
    }
    else if event_capacity == 500 {
        Some(event_prices.4th)
    }
    else if event_capacity == 1000 {
        Some(event_prices.5th)
    }
    else {
        None
    }
}

pub fn get_token_name(mint_type: MintRedeemer, event_name: ByteArray) -> ByteArray {
    when mint_type is {
        MintOwnerTicket{admin_address, owner_address, event_capacity} -> bytearray.concat("TXNE-", event_name)
        MintAttendeeTicket{attendee_address, event_type, ticket_price} -> bytearray.concat("TXNT-", event_name)
    }
}

test get_event_price_returns_correct_price1() {
    expect get_event_price(50) == Some(5000000)
}

test get_event_price_returns_correct_price2() {
    expect get_event_price(100) == Some(10000000)
}

test get_event_price_returns_correct_price3() {
    expect get_event_price(30) == None
}

test get_token_name_owner() {
    let redeemer = MintOwnerTicket {
        admin_address: "admin_pub_key_hash",
        owner_address: "owner_pub_key_hash",
        event_capacity: 100
    }
    expect get_token_name(redeemer, "MyEvent") == "TXNE-MyEvent"
}

test get_token_name_attendee() {
    let redeemer = MintAttendeeTicket {
        attendee_address: "attendee_pub_key_hash",
        event_type: "free",
        ticket_price: None
    }
    expect get_token_name(redeemer, "MyEvent") == "TXNT-MyEvent"
}